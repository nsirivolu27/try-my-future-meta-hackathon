package app.trymyfuture.capture

import kotlinx.coroutines.flow.StateFlow

/** Hardware adapter boundary. Meta is the first implementation; new camera vendors
 * require their official SDK. Audio mode does not allocate a capture source. */
interface CaptureSource {

    val kind: SourceKind

    /** Human-readable state for the status line. Never null, never empty. */
    val status: StateFlow<CaptureStatus>

    /**
     * Prepare the source: bind the camera, or register with the Meta AI app,
     * request wearable permission and open a device session and stream.
     * Safe to call more than once.
     */
    suspend fun prepare()

    /**
     * Take one photograph. Returns null if the source is not ready -- callers
     * show [status] rather than inventing an error message of their own.
     */
    suspend fun capture(): CapturedPhoto?

    /** Release hardware. The glasses source must always reach this: an open
     *  stream keeps the glasses' camera powered and drains them fast. */
    fun release()
}

enum class SourceKind(val envelopeValue: String) {
    /** Ray-Ban Meta glasses through the Wearables Device Access Toolkit. */
    GLASSES("meta_wearables_dat"),

    /** The phone's own camera, for development without hardware. */
    PHONE("phone_camera"),
}

/**
 * @param jpeg encoded image bytes, ready to post
 * @param rotationDeg clockwise rotation needed to bring the image upright
 * @param width pixel width as captured, 0 when the source does not report it
 * @param height pixel height as captured, 0 when the source does not report it
 */
data class CapturedPhoto(
    val jpeg: ByteArray,
    val rotationDeg: Int,
    val width: Int = 0,
    val height: Int = 0,
) {
    // ByteArray in a data class needs these; the default identity equals would
    // make two captures of the same bytes compare unequal.
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is CapturedPhoto) return false
        return rotationDeg == other.rotationDeg &&
            width == other.width &&
            height == other.height &&
            jpeg.contentEquals(other.jpeg)
    }

    override fun hashCode(): Int =
        jpeg.contentHashCode() * 31 + rotationDeg * 7 + width * 3 + height
}

sealed interface CaptureStatus {
    /** Nothing has been attempted yet. */
    data object Idle : CaptureStatus

    /** Working on it -- registration, pairing, binding, opening a stream. */
    data class Preparing(val detail: String) : CaptureStatus

    /** Ready to capture. */
    data class Ready(val detail: String) : CaptureStatus

    /**
     * Not usable, with a reason a person can act on.
     *
     * [recoverable] distinguishes "put the glasses on and try again" from
     * "this build cannot talk to glasses at all", because the UI should offer
     * a retry for the first and a source switch for the second.
     */
    data class Unavailable(val reason: String, val recoverable: Boolean = true) : CaptureStatus
}
