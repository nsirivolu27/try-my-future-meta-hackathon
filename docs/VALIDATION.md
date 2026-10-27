# Pilot validation and next work

## Automated checks

`npm test`: 29 passing behavior tests. The original 20 cover campus planning, retrieval, journal, directory and field activities. Nine new tests cover trusted campus context, generic-directory limits, citation validation, selected-institution URL boundaries, the Muse HTTP contract with an injected fake provider, setup/credit/network failures, client payload validation a cancelled-native-answer regression and an actual loopback HTTP pairing/origin test. The fake-provider tests are not evidence of successful Meta API access.

`npx --no-install tsc --noEmit`: checks all shared/browser JavaScript with strict TypeScript checking and the native bridge declaration.

`npm run build`: syntax checks JavaScript and bundles the same assets into the browser distribution and Android application.

Android compile: `android/gradlew.bat :app:assembleDebug`. An APK build does not verify physical pairing or voice/audio routing.

## Manual browser checks

The retrieval checks below describe the earlier offline interface. The current Muse revision was checked for setup-needed state, a real HTTP request yielding a readable missing-key error, retry controls and retention of the selected campus/journal. Live model answer quality is not yet evaluated.

- UCSD discovery plan prioritizes Jacobs Hall for engineering.
- Saving a reflection updates the journal count and comparison.
- Study-space question returns a source-linked Geisel Library fact.
- Tuition question explicitly reports missing verified information and can be saved as a question.
- Comparison keeps personal observations separate from questions and leaves other campuses empty.
- UVA visit layout checked at a 390 Ã— 844 phone viewport.

## Physical acceptance checklist â€” not yet verified

- Install on the Android phone paired to the user's Gen 2 glasses.
- Grant, deny and retry Android and Meta camera permissions.
- Return successfully from the Meta AI registration flow.
- Confirm connected state reflects an actual streaming camera session.
- Capture a new still photograph; disconnect/reconnect and retry.
- Fold/remove glasses and confirm status changes; ensure no previous image is described as a fresh recognition result.
- Background the app during startup, capture and narration; confirm camera teardown and no duplicate session after returning.
- Confirm spoken narration reaches the glasses, and determine which microphone Android speech input uses.
- Restart the app and verify journal persistence. Export, open and inspect the JSON.
- Exercise unavailable speech services, unavailable Meta AI and canceled export without losing the journal.

## Next implementation milestones

1. Field-test one campus, recording visitor access constraints and route information.
2. Physically test the upgraded DAT 1.0.1 camera and Speech adapters; compilation has passed.
3. Add a grounded multimodal service with explicit source provenance and conservative landmark matching; do not infer a location merely from the selected campus.
4. Add approved photo/reference data per landmark. Evaluate confident errors before enabling automatic recognition.
5. Add longer campus-specific answers and program facts from official sources, with update dates and unknown handling.
6. Confirm final hackathon rules and submission requirements before packaging; published deadline is November 4, 2026 at 9 PM ET.

## Muse and glasses voice acceptance â€” pending

- Activate credits/billing and configure the local key using `scripts/setup-ai.ps1`.
- Run real Muse questions for all three pilot campuses plus one directory-only school; review citations, unknowns and follow-up answers.
- Pair the USB guide server and test expired pairing codes and server restart recovery.
- Enable the experimental Speech capability; test microphone grants, denial, final/partial transcripts, pause/disconnect, cancellation and background behavior on Gen 2.
- Verify the narrator uses glasses media output and the microphone is DAT Speech, not Android phone dictation.
- Measure actual end-of-speech to spoken-answer delay. No latency or accuracy result has been claimed.
- Deploy authenticated HTTPS service before an untethered campus pilot; the current Android backend path requires USB.

The product scope is nationwide. UC San Diego, UT Austin and UVA are the first detailed guides. The initial directory contains 5,877 institutions; it is not complete physical-campus or verified-tour coverage.

## Current interaction validation

- Source Sans 3 loads from the bundled font; the 390 Ã— 844 mobile layout has no horizontal overflow and its home primary action clears the bottom navigation.
- A draft concern and its category survive marking an activity complete; completion updates the visit progress.
- The falling block-person logo appears in the app header; the same design is packaged as the Android launcher icon.

## Conversational interface revision

- Open activity text, icon navigation, rounded controls and white Android system bars replace the earlier ruled layout.
- Home preferences are expandable; the campus question composer is visible during a visit, with a separate voice action.
- Browser question check: asking about study spaces during the UVA visit returns the sourced Shannon Library answer.
- UI screenshots are omitted from the event repository and README while design work continues.

## College-neutral discovery

- Removed featured-campus tabs and the default UCSD selection.
- Home starts with national search; only a previously selected college appears as a personal continuation.
- The directory initially prompts for a query/state instead of showing an arbitrary school shortlist.
- Selecting a result opens a separate visit-plan screen; browser verified the search → plan → home flow.
- Android debug build and lint passed after the DAT upgrade. Lint retains six non-blocking dependency/target/backup-configuration warnings.
