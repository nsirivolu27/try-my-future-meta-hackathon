# Working on Try My Future

This is a standalone Android campus-visit app with an offline browser UI, not Fantasy Copilot. Keep work scoped to this repository.

- Keep campus planning, retrieval, directory search and journal rules pure and behavior-tested.
- Do not invent campus facts, vendor SDKs, device support, tour access, model accuracy or hackathon requirements.
- Distinguish federal institution directory coverage from manually sourced guides. Preserve UNITIDs and existing journal IDs.
- Use CSS color tokens. Keep the interface compact and app-oriented, with the blue/white/gold visual identity.
- No new runtime web dependencies without a concrete need. Python importer uses the standard library.
- Vendor camera integrations implement CaptureSource. Audio-only operation must work without registering a camera vendor.
- Run npm test, strict TypeScript checking, and npm run build. Rebuild Android when native code or bundled assets change.
- Never commit local.properties, credentials, caches, raw downloads or APKs. Preserve android/NOTICE-DUO.txt.
- A successful APK compile does not verify physical hardware. Record exactly what was tested.
