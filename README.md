# Try My Future

An AI campus guide for students exploring any U.S. college. Ask about campus life through your phone or Meta glasses, keep observations, and compare visits.

Built for the **Meta Global AI Developer Hackathon**, following the acceptance and credit emails from Cerebral Valley. Submission deadline: **November 4, 2026, 9 PM ET**. [Event and email checklist](EVENT.md)

## Where it stands

- Search 5,877 institutions; no featured or default school. Directory coverage is broader than verified campus-guide coverage.
- Campus activities, local notes and visit comparison work in the prototype.
- Muse Spark Q&A and experimental Meta glasses speech are implemented. **Live AI and physical glasses testing are still pending.** Android currently reaches the guide server over USB.
- 29 tests, strict type checking, browser/Android builds and Android lint passed locally.

## Next two days · October 28–29

**October 28 — get the AI answering.** Claim the email's $150 credits, complete Meta account setup, and configure the API key locally. Test campus questions, follow-ups and source links. If credits are still processing, finish setup and error-flow checks.

**October 29 — test the glasses experience.** Install on Android, enable Meta Speech access, and test question → transcript → answer → spoken response. Check two student-selected colleges, unknown questions and disconnects. Record what works and fix the biggest failure before recording a demo.

**Success for this sprint:** one real, source-linked campus conversation through Gen 2 glasses. If access or hardware blocks it, document the blocker rather than presenting a simulated success.

## Run

Node 22+: `npm run dev` → http://127.0.0.1:4317

[AI and glasses setup](docs/AI-SETUP.md) · [Development and attribution](docs/DEVELOPMENT.md) · [Validation](docs/VALIDATION.md) · [Pitch draft](docs/SUBMISSION.md)

Private working repository. No event submission has been sent. UI screenshots are intentionally omitted.
