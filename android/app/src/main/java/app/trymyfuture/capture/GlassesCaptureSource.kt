package app.trymyfuture.capture

import android.app.Activity
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Log
import com.meta.wearable.dat.camera.Camera
import com.meta.wearable.dat.camera.Stream
import com.meta.wearable.dat.camera.addCamera
import com.meta.wearable.dat.camera.types.PhotoData
import com.meta.wearable.dat.camera.types.StreamConfiguration
import com.meta.wearable.dat.camera.types.StreamState
import com.meta.wearable.dat.camera.types.VideoQuality
import com.meta.wearable.dat.core.Wearables
import com.meta.wearable.dat.core.selectors.AutoDeviceSelector
import com.meta.wearable.dat.core.session.DeviceSession
import com.meta.wearable.dat.core.session.DeviceSessionState
import com.meta.wearable.dat.core.types.Permission
import com.meta.wearable.dat.core.types.PermissionStatus
import com.meta.wearable.dat.core.types.RegistrationState
import java.io.ByteArrayOutputStream
import java.io.Closeable
import java.nio.ByteBuffer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull

/** Ray-Ban Meta capture through the Wearables Device Access Toolkit (DAT). */
class GlassesCaptureSource(
    private val activity: Activity,
    private val requestPermission: suspend (Permission) -> PermissionStatus,
) : CaptureSource {

    override val kind = SourceKind.GLASSES

    private val _status = MutableStateFlow<CaptureStatus>(CaptureStatus.Idle)
    override val status: StateFlow<CaptureStatus> = _status.asStateFlow()

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var session: DeviceSession? = null
    private var camera: Camera? = null
    private var stream: Stream? = null
    private var sessionStateJob: Job? = null
    private var sessionErrorJob: Job? = null
    private var streamStateJob: Job? = null
    private var streamErrorJob: Job? = null

    override suspend fun prepare() {
        if (stream?.state?.value == StreamState.STREAMING) return

        if (Wearables.registrationState.value != RegistrationState.REGISTERED) {
            _status.value = CaptureStatus.Preparing("Registering with the Meta AI app…")
            Wearables.startRegistration(activity)
            return
        }

        var permissionStatus: PermissionStatus = PermissionStatus.Denied
        Wearables.checkPermissionStatus(Permission.CAMERA)
            .onSuccess { permissionStatus = it }
            .onFailure { error, _ ->
                Log.e(TAG, "Camera permission check failed: ${error.description}")
            }
        if (permissionStatus != PermissionStatus.Granted) {
            _status.value = CaptureStatus.Preparing("Waiting for glasses camera permission…")
            permissionStatus = requestPermission(Permission.CAMERA)
        }
        if (permissionStatus != PermissionStatus.Granted) {
            _status.value = CaptureStatus.Unavailable(
                "Camera access was not granted in the Meta AI app.",
                recoverable = true,
            )
            return
        }

        _status.value = CaptureStatus.Preparing("Connecting to glasses…")
        var createdSession: DeviceSession? = null
        Wearables.createSession(AutoDeviceSelector())
            .onSuccess { createdSession = it }
            .onFailure { error, _ ->
                Log.e(TAG, "Session creation failed: ${error.description}")
                _status.value = CaptureStatus.Unavailable(
                    "No glasses found. Turn them on, wear them, and check the Meta AI connection.",
                    recoverable = true,
                )
            }
        val activeSession = createdSession ?: return
        session = activeSession
        observeSession(activeSession)

        activeSession.start()
        val sessionStarted = withTimeoutOrNull(SESSION_TIMEOUT_MS) {
            activeSession.state.first {
                it == DeviceSessionState.STARTED || it == DeviceSessionState.STOPPED
            }
        } == DeviceSessionState.STARTED
        if (!sessionStarted) {
            _status.value = CaptureStatus.Unavailable(
                "The glasses connection did not become ready.",
                recoverable = true,
            )
            return
        }

        _status.value = CaptureStatus.Preparing("Opening glasses camera…")
        var addedCamera: Camera? = null
        activeSession.addCamera(
            StreamConfiguration(
                videoQuality = VideoQuality.MEDIUM,
                frameRate = STREAM_FPS,
                compressVideo = false,
            )
        ).onSuccess { addedCamera = it }
            .onFailure { error, _ ->
                Log.e(TAG, "Camera attachment failed: ${error.description}")
                _status.value = CaptureStatus.Unavailable(
                    "Could not open the glasses camera: ${error.description}",
                    recoverable = true,
                )
            }
        val activeCamera = addedCamera ?: return
        camera = activeCamera
        val activeStream = activeCamera.stream
        stream = activeStream
        observeStream(activeStream)

        activeStream.start().onFailure { error, _ ->
            Log.e(TAG, "Stream start failed: ${error.description}")
            _status.value = CaptureStatus.Unavailable(error.description, recoverable = true)
        }
        val streamStarted = withTimeoutOrNull(STREAM_TIMEOUT_MS) {
            activeStream.state.first {
                it == StreamState.STREAMING || it == StreamState.CLOSED
            }
        } == StreamState.STREAMING
        _status.value = if (streamStarted) {
            CaptureStatus.Ready("Meta glasses ready")
        } else {
            CaptureStatus.Unavailable("The glasses camera did not start.", recoverable = true)
        }
    }

    override suspend fun capture(): CapturedPhoto? {
        if (stream?.state?.value != StreamState.STREAMING) prepare()
        val activeStream = stream?.takeIf { it.state.value == StreamState.STREAMING } ?: return null

        _status.value = CaptureStatus.Preparing("Capturing from Meta glasses…")
        var captured: CapturedPhoto? = null
        withTimeoutOrNull(CAPTURE_TIMEOUT_MS) {
            activeStream.capturePhoto()
                .onSuccess { photo -> captured = encodePhoto(photo) }
                .onFailure { error, _ ->
                    Log.e(TAG, "Photo capture failed: ${error.description}")
                    _status.value = CaptureStatus.Unavailable(
                        "The glasses did not return a photograph: ${error.description}",
                        recoverable = true,
                    )
                }
        }
        if (captured == null && _status.value is CaptureStatus.Preparing) {
            _status.value = CaptureStatus.Unavailable("Glasses capture timed out.", recoverable = true)
        } else if (captured != null) {
            _status.value = CaptureStatus.Ready("Meta glasses ready")
        }
        return captured
    }

    private suspend fun encodePhoto(photo: PhotoData): CapturedPhoto? = withContext(Dispatchers.Default) {
        val bitmap = when (photo) {
            is PhotoData.Bitmap -> photo.bitmap
            is PhotoData.HEIC -> decodeBuffer(photo.data)
        } ?: return@withContext null

        val output = ByteArrayOutputStream()
        if (!bitmap.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, output)) {
            Log.e(TAG, "Could not encode captured bitmap as JPEG")
            return@withContext null
        }
        CapturedPhoto(output.toByteArray(), rotationDeg = 0, bitmap.width, bitmap.height)
    }

    private fun decodeBuffer(data: ByteBuffer): Bitmap? {
        val copy = data.duplicate().apply { rewind() }
        val bytes = ByteArray(copy.remaining())
        copy.get(bytes)
        return BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
    }

    private fun observeSession(activeSession: DeviceSession) {
        sessionStateJob = scope.launch {
            activeSession.state.collect { state ->
                if (state == DeviceSessionState.PAUSED) {
                    _status.value = CaptureStatus.Unavailable(
                        "Glasses paused. Put them on and close other camera users.",
                        recoverable = true,
                    )
                } else if (state == DeviceSessionState.STOPPED) {
                    _status.value = CaptureStatus.Unavailable("Glasses disconnected.", true)
                }
            }
        }
        sessionErrorJob = scope.launch {
            activeSession.errors.collect { error ->
                Log.e(TAG, "Session error: ${error.description}")
                _status.value = CaptureStatus.Unavailable(error.description, recoverable = true)
            }
        }
    }

    private fun observeStream(activeStream: Stream) {
        streamStateJob = scope.launch {
            activeStream.state.collect { state -> Log.d(TAG, "Stream state: $state") }
        }
        streamErrorJob = scope.launch {
            activeStream.errorStream.collect { error ->
                Log.e(TAG, "Stream error: ${error.description}")
                _status.value = CaptureStatus.Unavailable(error.description, recoverable = true)
            }
        }
    }

    override fun release() {
        sessionStateJob?.cancel()
        sessionErrorJob?.cancel()
        streamStateJob?.cancel()
        streamErrorJob?.cancel()
        closeCamera(camera)
        session?.stop()
        camera = null
        stream = null
        session = null
        scope.cancel()
        _status.value = CaptureStatus.Idle
    }

    private fun closeCamera(capability: Closeable?) {
        runCatching { capability?.close() }
            .onFailure { Log.w(TAG, "Camera release failed", it) }
    }

    companion object {
        private const val TAG = "GlassesCapture"
        const val STREAM_FPS = 2
        private const val JPEG_QUALITY = 90
        private const val SESSION_TIMEOUT_MS = 15_000L
        private const val STREAM_TIMEOUT_MS = 15_000L
        private const val CAPTURE_TIMEOUT_MS = 15_000L
    }
}
