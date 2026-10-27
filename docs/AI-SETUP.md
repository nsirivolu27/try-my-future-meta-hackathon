# Muse campus guide setup

The guide calls **Muse Spark 1.3 on Meta Model API**. It is a real provider integration, not a simulated answer generator. Live access needs an activated Meta account, credits/billing and an API key. No successful live call or physical glasses test has been recorded yet.

## Activate the account

1. Open [Meta Model API](https://dev.meta.ai/) using the account associated with your hackathon entry. Claim the participant credits using the organizer's invitation. Check Billing for the grant; creating a key does not itself apply credits.
2. Open **API keys → Create API key**. If disabled, resolve the account's billing/eligibility requirements in Meta's own UI. A spend-notification threshold is not a hard billing cap.
3. In this repository, run `powershell -File scripts/setup-ai.ps1`. Paste the key into the hidden local prompt. It creates ignored `.env.local`; do not put the key into chat, the browser app, Android resources or Git. Alternatively supply `MODEL_API_KEY` in the server process environment.
4. Restart `npm run dev`. Ask a question at a campus visit. The first real response verifies provider/model access; “key configured” alone does not.

The `.env.local` file contains the server secret as plain text and is local development configuration, not a production secret manager. The Android app never receives it. Never share the entire working folder with `.env.local` included.

## Android + Meta Gen 2, USB developer preview

1. Build with `npm run build`, then `android/gradlew.bat :app:assembleDebug` from the Android directory. Install `android/app/build/outputs/apk/debug/app-debug.apk` on your phone.
2. Keep `npm run dev` running on the computer. Connect the phone with USB debugging authorized. Run `adb reverse tcp:4317 tcp:4317`.
3. In the Android app open **Glasses → Campus AI connection** and enter the 8-digit pairing code printed by the server. This is a temporary app token, not your Meta key. Re-pair after restarting either the app or the server.
4. Pair Gen 2 glasses in the Meta AI app. Enable Developer Mode, and enable the experimental **Speech** capability for your app in Wearables Developer Center as required by Meta. Choose **Meta glasses / voice + camera** in Try My Future.
5. Select a campus and start a visit. Tap the question microphone. Grant Nearby devices and Meta microphone access when prompted. If registration opens Meta AI, finish it and tap the microphone again.
6. Wait for **Listening through Meta glasses**, ask one question, and pause. A final transcript goes to Muse; the short answer is spoken using Android media output. Choose the glasses as media output and check **Test audio** first.

This path uses DAT **1.0.1 Speech** directly: no phone microphone or camera stream is needed for Meta recognition. Availability depends on actual hardware/firmware and the developer capability grant. Unsupported devices show an error; choose audio mode for explicitly labelled Android dictation, or type. Generic audio mode does not promise that its microphone is the glasses microphone.

Speech is experimental and currently limited to development/beta channels. The app must remain in the foreground. Each question starts with an app microphone tap; custom Hey Meta invocation, frame-button activation, continuous conversation and screen-off operation are not implemented. Camera capture and voice run separately; after voice, reconnect the camera to take a photo.

USB is the only implemented Android-to-server connection in this build. It is suitable for a desk/demo test, not an untethered campus walk. A deployed HTTPS backend with user authentication, persistent quotas and operating-cost controls is still needed for field use. Release builds reject the USB HTTP endpoint; cleartext is allowed only for debug loopback.

## Sources and privacy

- The server resolves campus IDs against the shipped national directory; clients cannot substitute source records. The three pilot campuses also supply their reviewed stop facts.
- Muse can search for additional official campus information. Only selected-institution citations or supplied-source references are accepted. An answer without an accepted citation is replaced with a clear verification fallback.
- Citation checks establish attribution, not factual entailment. Manually evaluate accuracy, freshness and campus attribution before relying on the guide for visitor access, hours, pricing or transport.
- Journal entries, photos and precise location are not sent. Questions, selected campus, interest and up to four recent Q&A turns are sent to Meta. `store: false` disables Responses conversation storage; this is not a claim that Meta has no other operational retention.
- Follow-up context is held in app memory, scoped by campus, and cleared when the app reloads. Notes remain local. Navigating away cancels the request and late answers cannot overwrite a different campus.
- Server errors never echo provider response bodies or API keys. Offline guide excerpts are labelled as saved content, not live AI answers.
- Local demo limits: 100 model attempts per process run, 12/minute, two concurrent, 45-second provider timeout, 2,400 output tokens per attempt. Limits reset on server restart and are not a dollar spending cap. Pairing permits ten attempts per run. The server binds only to loopback and does not enable cross-origin access.

## Verification before a student pilot

Run the automated checks, then perform real questions on UCSD, UT Austin, UVA and a directory-only institution. Include a follow-up, a current-hours question, an unknown fact, a prompt injection, a campus switch during generation, a revoked microphone grant and a Bluetooth disconnect. Check that spoken and displayed answers agree, sources support the claims, cancellation stops listening and the voice route is the glasses. Record actual latency and outcomes; do not infer successful hardware behavior from compilation.

Official references: [Meta quickstart](https://dev.meta.ai/docs/quickstart), [Responses API](https://dev.meta.ai/docs/protocols/responses), [search grounding](https://dev.meta.ai/docs/search-grounding), [Android speech capability](https://github.com/facebook/meta-wearables-dat-android/blob/main/plugins/mwdat-android/skills/speech/SKILL.md).
