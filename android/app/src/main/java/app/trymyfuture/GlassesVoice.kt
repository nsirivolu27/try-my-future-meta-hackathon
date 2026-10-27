package app.trymyfuture

import com.meta.wearable.dat.core.Wearables
import com.meta.wearable.dat.core.selectors.AutoDeviceSelector
import com.meta.wearable.dat.core.session.DeviceSession
import com.meta.wearable.dat.core.session.DeviceSessionState
import com.meta.wearable.dat.core.types.Permission
import com.meta.wearable.dat.core.types.PermissionStatus
import com.meta.wearable.dat.speech.Speech
import com.meta.wearable.dat.speech.addSpeech
import com.meta.wearable.dat.speech.removeSpeech
import com.meta.wearable.dat.speech.types.SpeechState
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Job
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout

/** One deliberate question per tap. Recognition runs on the glasses, without a camera stream. */
class GlassesVoice {
    private var session: DeviceSession? = null
    private var speech: Speech? = null
    private val collectors = mutableListOf<Job>()

    suspend fun listen(
        requestPermission: suspend (Permission) -> PermissionStatus,
        onPartial: (String) -> Unit,
        onStatus: (String) -> Unit,
    ): String = coroutineScope {
        var permission: PermissionStatus = PermissionStatus.Denied
        Wearables.checkPermissionStatus(Permission.MICROPHONE).onSuccess { permission = it }
        if (permission != PermissionStatus.Granted) permission = requestPermission(Permission.MICROPHONE)
        check(permission == PermissionStatus.Granted) { "Allow microphone access in Meta AI to ask through your glasses." }
        try {
            onStatus("Connecting to the glasses microphone…")
            Wearables.createSession(AutoDeviceSelector()).onSuccess { session = it }
            val link = checkNotNull(session) { "No glasses available. Check Meta AI pairing and wear your glasses." }
            val result = CompletableDeferred<String>()
            collectors += launch(start = CoroutineStart.UNDISPATCHED) {
                link.errors.collect { result.completeExceptionally(IllegalStateException("The glasses connection failed. Try again.")) }
            }
            collectors += launch(start = CoroutineStart.UNDISPATCHED) {
                link.state.collect { state ->
                    if (state == DeviceSessionState.PAUSED || state == DeviceSessionState.STOPPED) {
                        result.completeExceptionally(IllegalStateException("Glasses paused or disconnected. Wear them and try again."))
                    }
                }
            }
            link.start()
            withTimeout(15000) { link.state.first { it == DeviceSessionState.STARTED || it == DeviceSessionState.STOPPED } }
            check(link.state.value == DeviceSessionState.STARTED) { "The glasses session could not start." }
            link.addSpeech().onSuccess { speech = it }
            val recognizer = checkNotNull(speech) { "Glasses speech is unavailable. Enable the experimental Speech capability for this app in Wearables Developer Center, or choose phone dictation." }
            collectors += launch(start = CoroutineStart.UNDISPATCHED) {
                recognizer.transcriptions.collect { transcript ->
                    if (transcript != null && transcript.text.isNotBlank()) {
                        if (transcript.isFinal) result.complete(transcript.text.take(1000))
                        else onPartial(transcript.text.take(1000))
                    }
                }
            }
            collectors += launch(start = CoroutineStart.UNDISPATCHED) {
                recognizer.errors.collect { result.completeExceptionally(IllegalStateException("Glasses speech failed. Check that Speech is enabled and supported by your glasses.")) }
            }
            var heardStart = false
            collectors += launch(start = CoroutineStart.UNDISPATCHED) {
                recognizer.state.collect { state ->
                    if (state == SpeechState.STARTED) { heardStart = true; onStatus("Listening through Meta glasses. Ask your campus question.") }
                    if (state == SpeechState.STOPPED && heardStart && !result.isCompleted) result.completeExceptionally(IllegalStateException("Listening stopped without a question. Tap the microphone to try again."))
                }
            }
            recognizer.start().onFailure { _, _ -> result.completeExceptionally(IllegalStateException("Could not start the glasses microphone.")) }
            withTimeout(30000) { result.await() }
        } finally { release() }
    }

    fun release() {
        collectors.forEach { it.cancel() }; collectors.clear()
        runCatching { speech?.stop() }
        runCatching { session?.removeSpeech() }
        runCatching { session?.stop() }
        speech = null; session = null
    }
}
