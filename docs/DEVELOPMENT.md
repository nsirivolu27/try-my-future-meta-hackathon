# Development

## Browser and checks

Requires Node 22+. No npm runtime dependencies.

```sh
npm run dev
npm test
npx --yes --package typescript@5.9.3 tsc --noEmit
npm run build
```

Preview: http://127.0.0.1:4317. Build copies `web/` into `dist/` and Android assets. Live AI requires the separate [server-key setup](AI-SETUP.md).

## Android

Requires JDK 17 and Android SDK platform 35. Set `ANDROID_HOME` or an ignored `android/local.properties` with `sdk.dir`.

```sh
npm run build
cd android
./gradlew :app:assembleDebug :app:lintDebug
```

Windows: use `gradlew.bat`. APK: `android/app/build/outputs/apk/debug/app-debug.apk`. See [AI-SETUP.md](AI-SETUP.md) for USB pairing and experimental DAT 1.0.1 Speech. Compilation does not establish physical compatibility.

## Source map and attribution

- `web/`: shared app, pure planning/journal rules, directory search and native bridge.
- `server/`: Muse requests, campus context, citation checks and local pairing API.
- `android/`: WebView shell, narration, glasses speech and camera adapter.
- `data/`: IPEDS institution database and [provenance](../data/README.md). Detailed guide facts link to university sources in `web/data.js`.
- This event repo began from `nsirivolu27/try-my-future`, commit `a64fa34edb85d6cdf6248058419ed415bfc0a7e9`, on October 27, 2026.
- Camera adapter and Gradle wrapper adapted from DUO Tour; retain [its MIT notice](../android/NOTICE-DUO.txt). Meta SDK terms apply separately.
- Source Sans 3: [font license](FONT-LICENSE.txt), [source](https://github.com/google/fonts/tree/main/ofl/sourcesans3). Campus drawings are original illustrations, not university logos or photos.

Keep secrets, APKs, caches and UI captures out of Git. Journal data stays on the device; export before clearing storage. Questions and recent follow-ups go to Meta only when using the live guide.
