# Pilot validation and next work

## Automated checks

`npm test`: 20 behavior tests covering the requested campuses, priority selection, stop counts, immutable inputs, unsupported facts, explicit manual stop identity, campus isolation, voice commands, corrupt journal entries, bounded persistence, comparison separation, nationwide directory integrity, stable UNITID mappings, search aliases/state filtering, community/technical school inclusion, safe links, generic campus journal restoration, camera capability restrictions, contextual visitor activities, activity completion isolation, and preservation of good signs/concerns alongside older neutral notes.

`npx --no-install tsc --noEmit`: checks all shared/browser JavaScript with strict TypeScript checking and the native bridge declaration.

`npm run build`: syntax checks JavaScript and bundles the same assets into the browser distribution and Android application.

Android compile: `android/gradlew.bat :app:assembleDebug`. An APK build does not verify physical pairing or voice/audio routing.

## Manual browser checks

- UCSD discovery plan prioritizes Jacobs Hall for engineering.
- Saving a reflection updates the journal count and comparison.
- Study-space question returns a source-linked Geisel Library fact.
- Tuition question explicitly reports missing verified information and can be saved as a question.
- Comparison keeps personal observations separate from questions and leaves other campuses empty.
- UVA visit layout checked at a 390 × 844 phone viewport.

## Physical acceptance checklist — not yet verified

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
2. Upgrade/test the native capture adapter against the chosen current DAT version.
3. Add a grounded multimodal service with explicit source provenance and conservative landmark matching; do not infer a location merely from the selected campus.
4. Add approved photo/reference data per landmark. Evaluate confident errors before enabling automatic recognition.
5. Add longer campus-specific answers and program facts from official sources, with update dates and unknown handling.
6. Confirm the hackathon's actual requirements and submission deadline before packaging a competition submission.

The product scope is nationwide. UC San Diego, UT Austin and UVA are the first detailed guides. The initial directory contains 5,877 institutions; it is not complete physical-campus or verified-tour coverage.

## Current interaction validation

- Source Sans 3 loads from the bundled font; the 390 × 844 mobile layout has no horizontal overflow and its home primary action clears the bottom navigation.
- A draft concern and its category survive marking an activity complete; completion updates the visit progress.
- The falling block-person logo appears in the app header; the same design is packaged as the Android launcher icon.
