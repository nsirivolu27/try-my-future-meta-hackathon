# Try My Future — Meta Event

Dedicated Meta event workspace. See [event preparation](EVENT.md) and the [submission draft](docs/SUBMISSION.md).

**Imagine your everyday at college.** An Android campus-visit companion for prospective students, transfer students and anyone exploring their next school. A light, conversational interface with blue accents, the falling block-person logo and Source Sans 3 typography; built as a compact app with a campus directory, personal visits, field notes and comparison.

## Current scope

- **5,877 institutions** across the 50 states, D.C. and five U.S. territories, sourced from **NCES IPEDS HD2025**. Search by school, reported alias, city and state. Includes community colleges and technical schools.
- Every listed institution supports general self-guided reflection activities, narration, a local journal and comparison. Directory coverage is institution-level, not every physical branch campus; online institutions may also appear. Confirm visits with the school.
- **UC San Diego, UT Austin and UVA** have four manually sourced discovery stops each, with university references. These are suggestions, not verified pedestrian routes.
- Choose interests, commuting/resident preference and a 20/40/60-minute exploration budget. Walking time is extra.
- **Try campus life:** short activities such as finding a study spot, rehearsing a commute, looking for student projects and planning questions for an adviser. Completion is saved per campus, stop and activity.
- **Ask a real student:** contextual conversation starters to save for later.
- **Keep evidence:** categorize notes as Noticed, Good sign, Concern or To ask. Compare these observations across visits, then export your journal and activity progress. No accounts are needed for the offline app; live Muse answers use your server-side Meta API credits.

## Glasses support

The campus experience is independent of hardware. **Audio mode** works on the phone and can use glasses exposing standard Android Bluetooth media audio. Pair in Android settings and select the glasses as media output. Check routing with Test audio. Compatibility still needs testing on each model.

**Meta mode** uses DAT 1.0.1 for the first camera adapter and experimental on-glasses speech recognition. It requests Meta AI registration and permissions and captures a temporary still image. It requires a paired Android phone and Meta developer mode. Other vendors' cameras/displays need official SDK adapters and are **not integrated yet**. The shared `CaptureSource` boundary is ready for those integrations.

A Muse Spark backend now answers campus questions with supplied university facts and official-source search, scoped follow-ups and source links. Voice questions trigger spoken answers. See [AI and glasses setup](docs/AI-SETUP.md). An activated Meta API key is still required; a successful live call has not yet been verified.

No phone or glasses have been attached for physical validation. Compilation is not evidence of successful pairing, capture, audio routing or microphone routing. There is no custom wake-word or screen-off operation.

## Live AI

Follow [AI setup](docs/AI-SETUP.md) to add the Meta key through a hidden local prompt. The default model is `muse-spark-1.3`, using the documented Meta Responses API. The key never enters web assets or the APK. The USB preview needs the computer server; untethered campus use still needs a deployed HTTPS service.

## Run

Requires **Node 22+**. The web app has no npm runtime dependencies.

```sh
npm run dev
```

Open **http://127.0.0.1:4317**. Browser preview supports the campus/journal experience and browser narration where available; it cannot connect a glasses camera.

```sh
npm test
npm run build
```

For strict JavaScript type checking, use TypeScript **5.9.3** already on your PATH (`npm run typecheck`), or run the pinned compiler without adding project dependencies:

```sh
npx --yes --package typescript@5.9.3 tsc --noEmit
```

Build copies web assets to `dist/` and `android/app/src/main/assets/site/`. Generated assets are ignored by Git. The offline directory snapshot and SQLite database are included, so normal startup requires no network requests.

## Android build

Requires JDK 17, Android SDK platform 35, and Google/Maven Central access on the first build. Set `ANDROID_HOME` or create your own ignored `android/local.properties` with `sdk.dir`.

```sh
npm run build
cd android
./gradlew :app:assembleDebug
```

Windows: use `gradlew.bat`. APK: `android/app/build/outputs/apk/debug/app-debug.apk`. Install on your Android phone with `adb install -r` and that path. Package: `app.trymyfuture`.

For Meta Gen 2: pair in Meta AI, enable Developer Mode, install the app, open **Glasses**, choose **Meta glasses / voice + camera**, then **Connect Meta glasses**. Grant Android and Meta permissions, wait for the actual ready state, then tap Capture in a visit. Select glasses as Android media output to test narration. In audio mode, Android dictation may use the phone microphone and system provider. In Meta mode, the question microphone uses the experimental DAT Speech capability directly. See the setup guide for required capability grants and USB server pairing.

DAT 1.0.1 is pinned for reproducible camera and speech integration. This is a developer-mode build, not Play Store or Meta release-channel distribution.

## What remains

This is an initial functional prototype, not a finished AI tour guide. The Muse integration needs activated credits and a server key; live answers and physical glasses behavior still require validation. Offline question handling retrieves saved facts and labels them separately. Photos are not identified, uploaded or stored in the journal. Students select stops manually. No admissions predictions, guaranteed building access or accessible-route claims are made. University endorsement is not implied. See the [product standard](docs/PRODUCT-STANDARD.md) for the adoption ambition and evidence needed before promotion.

Next: field validation on Android/glasses, verified campus location content, a source-grounded multimodal service with evaluation, and official adapters for additional glasses. The hackathon's exact identity, rules, submission link and deadline still need verification before actual submission.

## Data and architecture

- `data/campuses.sqlite`: indexed institution database, unique federal UNITID and provenance table.
- `data/provenance.json`: official source URL, snapshot year, retrieval time, source hash and filters.
- `scripts/import-directory.py`: reproducible standard-library importer; run with `--download` to refresh the pinned source.
- `web/directory-data.js`: generated offline export; `web/directory.js`: search and general reflection activities.
- `web/data.js`: sourced content for the three detailed pilots; `web/core.js`: pure planning, retrieval and journal validation.
- `web/fieldwork.js`: visitor activities and completion validation; `web/app.js`: compact app screens, local persistence and native bridge; `web/devices.js`: capability declarations.
- `android/app/src/main/java/app/trymyfuture/`: WebView, speech, export, lifecycle and camera adapter.

See [data documentation](data/README.md), [validation](docs/VALIDATION.md), and the [hackathon submission draft](docs/SUBMISSION.md).

The native bridge runs only on allowlisted bundled assets at a local HTTPS WebView origin. Source links open in the system browser. Notes stay in browser/WebView local storage (200-entry cap) and are not synchronized. App backup is disabled. Export before uninstalling or clearing storage.

## Attribution

Federal directory: [NCES IPEDS HD2025](https://nces.ed.gov/ipeds/complete-data-files/HD2025.zip). Detailed stop summaries link to university sources in `web/data.js`, reviewed October 27, 2026. Directory records do not imply reviewed tour content.

The camera adapter and Gradle wrapper were adapted from the user's existing DUO Tour Android project. Its MIT notice is retained at `android/NOTICE-DUO.txt`. Meta's SDK has its own terms. Campus-inspired drawings are original illustrations, not university logos or site photographs.

Source Sans 3 is bundled for offline typography under the SIL Open Font License. See [font license](docs/FONT-LICENSE.txt). Source: https://github.com/google/fonts/tree/main/ofl/sourcesans3
