package app.trymyfuture

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.speech.RecognizerIntent
import android.speech.tts.TextToSpeech
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import app.trymyfuture.capture.CaptureSource
import app.trymyfuture.capture.CaptureStatus
import app.trymyfuture.capture.GlassesCaptureSource
import com.meta.wearable.dat.core.Wearables
import com.meta.wearable.dat.core.types.Permission
import com.meta.wearable.dat.core.types.PermissionStatus
import com.meta.wearable.dat.core.types.RegistrationState
import java.io.ByteArrayInputStream
import java.util.Locale
import kotlin.coroutines.resume
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import org.json.JSONObject

/** Native hardware shell. Campus decisions and journal behavior live in the shared core. */
class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private var narrator: TextToSpeech? = null
    private var speechReady = false
    private var initialized = false
    private var wantsConnection = false
    private var provider = "audio"
    private var ready = false
    private var source: CaptureSource? = null
    private var preparation: Job? = null
    private var observation: Job? = null
    private var captureJob: Job? = null
    private var permissionContinuation: CancellableContinuation<PermissionStatus>? = null
    private var pendingExport: String? = null
    private var lastStatus = "Not connected. Tap Connect to begin."

    private val permissions = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
        if (result.values.all { it }) initializeAndConnect()
        else status("Nearby-device and camera permission are needed to connect. You can still explore campuses.", false)
    }
    private val wearablePermission = registerForActivityResult(Wearables.RequestPermissionContract()) { result ->
        permissionContinuation?.takeIf { it.isActive }?.resume(result.getOrDefault(PermissionStatus.Denied))
        permissionContinuation = null
    }
    private val voiceInput = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == RESULT_OK) {
            val text = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
            if (!text.isNullOrBlank()) emit("transcript", text)
            else emit("error", "No speech was recognized. Try again or type your thought.")
        }
    }
    private val exportDocument = registerForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        val text = pendingExport
        pendingExport = null
        if (uri != null && text != null) {
            runCatching {
                val stream = contentResolver.openOutputStream(uri) ?: error("No output stream")
                stream.bufferedWriter().use { it.write(text) }
            }.onSuccess { emit("error", "Journal exported.") }
                .onFailure { emit("error", "Could not export. Your journal is still saved in the app.") }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this)
        setContentView(web)
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            setSupportMultipleWindows(false)
            mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
        }
        web.addJavascriptInterface(NativeBridge(), "FutureNative")
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse {
                val uri = request.url
                if (uri.scheme != "https" || uri.host != HOST) return denied()
                val path = uri.path?.removePrefix("/").orEmpty().ifEmpty { "index.html" }
                // Only these bundled assets may execute in the bridge-enabled WebView.
                if (path !in ASSETS) return denied()
                val mime = when (path.substringAfterLast('.')) {
                    "html" -> "text/html"
                    "js" -> "text/javascript"
                    "css" -> "text/css"
                    "svg" -> "image/svg+xml"
                    "ttf" -> "font/ttf"
                    else -> "text/plain"
                }
                return try {
                    WebResourceResponse(mime, "UTF-8", assets.open("site/$path"))
                } catch (_: Exception) { denied() }
            }
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                if (uri.scheme == "https" && uri.host == HOST) return false
                if (request.isForMainFrame && uri.scheme == "https") {
                    runCatching { startActivity(Intent(Intent.ACTION_VIEW, uri)) }
                        .onFailure { emit("error", "No browser is available to open this source.") }
                }
                return true
            }
            override fun onPageFinished(view: WebView, url: String) { status(lastStatus, ready) }
        }
        web.loadUrl("https://$HOST/index.html")
        narrator = TextToSpeech(this) { result ->
            speechReady = result == TextToSpeech.SUCCESS
            if (speechReady) {
                val availability = narrator?.setLanguage(Locale.US)
                speechReady = availability != TextToSpeech.LANG_MISSING_DATA && availability != TextToSpeech.LANG_NOT_SUPPORTED
            }
        }
    }

    private fun denied() = WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden", emptyMap(), ByteArrayInputStream(byteArrayOf()))

    inner class NativeBridge {
        @JavascriptInterface fun selectProvider(value: String) = runOnUiThread {
            val next = if (value == "meta") "meta" else "audio"
            if (provider != next) {
                wantsConnection = false
                releaseSource()
                provider = next
                status(if (provider == "audio") "Audio mode. Select glasses in Android media output." else "Connect Meta glasses to enable the camera.", false)
            }
        }
        @JavascriptInterface fun openAudioSettings() = runOnUiThread {
            runCatching { startActivity(Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS)) }
                .onFailure { emit("error", "Open your phone Bluetooth settings to pair audio glasses.") }
        }

        @JavascriptInterface fun connect() = runOnUiThread {
            if (provider != "meta" || preparation?.isActive == true || ready) return@runOnUiThread
            wantsConnection = true
            val required = mutableListOf(Manifest.permission.CAMERA)
            if (Build.VERSION.SDK_INT >= 31) required.add(Manifest.permission.BLUETOOTH_CONNECT)
            permissions.launch(required.toTypedArray())
        }
        @JavascriptInterface fun disconnect() = runOnUiThread {
            wantsConnection = false
            releaseSource()
            status("Disconnected. Your campus visit is still available.", false)
        }
        @JavascriptInterface fun capture() = runOnUiThread {
            if (provider != "meta" || !ready || source == null || captureJob?.isActive == true) {
                emit("error", "Connect your glasses and wait until the camera is ready.")
                return@runOnUiThread
            }
            captureJob = lifecycleScope.launch {
                try {
                    val photo = source?.capture()
                    if (photo != null) {
                        val event = JSONObject().put("type", "photo").put("data", Base64.encodeToString(photo.jpeg, Base64.NO_WRAP))
                        send(event)
                    }
                } catch (cancelled: CancellationException) { throw cancelled }
                catch (_: Exception) { status("Capture failed. Reconnect your glasses and try again.", false) }
            }
        }
        @JavascriptInterface fun speak(text: String) = runOnUiThread {
            if (!speechReady) { emit("error", "Android speech is not ready. Check installed text-to-speech voices."); return@runOnUiThread }
            val result = narrator?.speak(text.take(3500), TextToSpeech.QUEUE_FLUSH, null, "campus-guide")
            if (result == TextToSpeech.ERROR) emit("error", "Narration could not start. You can read the text on screen.")
        }
        @JavascriptInterface fun stopSpeaking() = runOnUiThread { narrator?.stop(); Unit }
        @JavascriptInterface fun listen() = runOnUiThread {
            narrator?.stop()
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                .putExtra(RecognizerIntent.EXTRA_PROMPT, "Ask a question, or remember a thought")
            runCatching { voiceInput.launch(intent) }
                .onFailure { emit("error", "No speech recognition service is available. You can type instead.") }
        }
        @JavascriptInterface fun exportJournal(text: String) = runOnUiThread {
            if (text.length > 500_000 || pendingExport != null) return@runOnUiThread
            pendingExport = text
            exportDocument.launch("try-my-future-journal.json")
        }
    }

    private fun initializeAndConnect() {
        if (!wantsConnection || preparation?.isActive == true) return
        preparation = lifecycleScope.launch {
            try {
                if (!initialized) {
                    Wearables.initialize(applicationContext)
                        .onSuccess { initialized = true }
                        .onFailure { _, _ -> status("Could not initialize Meta glasses. Check that Meta AI is installed and Developer Mode is on.", false) }
                }
                if (!initialized) return@launch
                observation?.cancel()
                source?.release()
                val active = GlassesCaptureSource(this@MainActivity) { permission ->
                    suspendCancellableCoroutine { continuation ->
                        permissionContinuation = continuation
                        continuation.invokeOnCancellation { permissionContinuation = null }
                        wearablePermission.launch(permission)
                    }
                }
                source = active
                observation = lifecycleScope.launch {
                    active.status.collect { state ->
                        when (state) {
                            is CaptureStatus.Ready -> status(state.detail, true)
                            is CaptureStatus.Preparing -> status(state.detail, false)
                            is CaptureStatus.Unavailable -> status(state.reason, false)
                            CaptureStatus.Idle -> status("Not connected", false)
                        }
                    }
                }
                active.prepare()
            } catch (cancelled: CancellationException) { throw cancelled }
            catch (_: Exception) { status("Could not connect. Check Meta AI pairing, then tap Connect to retry.", false) }
        }
    }

    private fun releaseSource() {
        captureJob?.cancel()
        preparation?.cancel()
        observation?.cancel()
        source?.release()
        source = null
        ready = false
    }
    private fun status(text: String, connected: Boolean) {
        lastStatus = text
        ready = connected
        send(JSONObject().put("type", "status").put("text", text).put("ready", connected))
    }
    private fun emit(type: String, text: String) { send(JSONObject().put("type", type).put("text", text)) }
    private fun send(event: JSONObject) {
        if (!isDestroyed) web.evaluateJavascript("window.onFutureNative && window.onFutureNative($event)", null)
    }
    override fun onResume() {
        super.onResume()
        if (initialized && wantsConnection && !ready && permissionContinuation == null && preparation?.isActive != true && Wearables.registrationState.value == RegistrationState.REGISTERED) initializeAndConnect()
    }
    override fun onStop() {
        narrator?.stop()
        // Meta registration/permission switches activities; let those handshakes return.
        val startingCamera = initialized && preparation?.isActive == true &&
            permissionContinuation == null && Wearables.registrationState.value == RegistrationState.REGISTERED
        if (ready || captureJob?.isActive == true || startingCamera) {
            releaseSource()
            status("Camera paused while the app is in the background.", false)
        }
        super.onStop()
    }
    override fun onDestroy() {
        wantsConnection = false
        releaseSource()
        narrator?.shutdown()
        web.removeJavascriptInterface("FutureNative")
        web.destroy()
        super.onDestroy()
    }
    companion object {
        private const val HOST = "appassets.androidplatform.net"
        private val ASSETS = setOf("index.html", "app.js", "core.js", "data.js", "fieldwork.js", "falling-block.svg", "directory-data.js", "directory.js", "devices.js", "campus.svg", "style.css", "source-sans-3.ttf", "ucsd.svg", "ut.svg", "uva.svg")
    }
}
