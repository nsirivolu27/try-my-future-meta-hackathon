# Hackathon submission draft

## Project
Try My Future — a campus visit that helps you imagine everyday student life.

## Problem
Students visiting colleges collect facts and photos, but often struggle to remember how different campuses felt and which questions they still need answered. A campus visit should help students see themselves learning, commuting, studying and finding a community.

## Experience
Search for a school, select your interests, and start a visit. Listen through your phone or compatible audio glasses, reflect on what you notice, capture your thoughts and compare visits. Sourced campus guides add specific places and context as content coverage grows.

## Built in this prototype
- Android app and browser preview with a compact, conversational interface with blue accents.
- Searchable offline federal directory of 5,877 institutions, SQLite database and repeatable import with provenance.
- Self-guided reflections and journal for listed institutions; three sourced pilot guides at UCSD, UT Austin and UVA.
- Muse Spark 1.3 backend with campus context, official-source search citations, scoped follow-ups, cancellation and honest failure states. Live API activation/validation pending.
- Hardware-independent audio mode, Android narration/dictation, Meta camera adapter and experimental DAT 1.0.1 glasses Speech integration. Physical validation pending.
- Real-world campus activities, contextual questions to ask students, completion tracking, and evidence notes grouped into good signs, concerns and follow-up questions.
- Local journal export and comparison without invented fit scores or admissions predictions.

## Two-minute demo
1. Search for Middlesex College in New Jersey. Show that a community college can start a self-guided visit.
2. Switch to UVA or UCSD and show the difference: named discovery stops with official university sources.
3. Choose an interest and start a visit. Try the activity at a stop, read the student question, mark the activity tried and save a Good sign or Concern.
4. With a configured and validated Meta key, ask a study-space question and a follow-up; show the actual response and university citations. Ask an unverifiable question to demonstrate the fallback. Without a key, show the explicit setup-needed state.
5. Open Journal and Compare, then export your notes.
6. On validated hardware only, show Meta camera capture. Clearly explain that capture does not yet recognize buildings. Without tested hardware, show the adapter UI and state that hardware validation is pending.

## What to say accurately
The prototype includes a real Muse Spark API client; account activation, credits and a key are required. No successful live-model test has yet been recorded. Reflection/planning stays deterministic. There is no visual recognition service. Meta Speech is experimental and the USB server connection is only a developer preview, not untethered field operation. Bluetooth audio is conditional on device support. Meta is the only implemented camera adapter, and it has not yet been tested on physical glasses. The national directory is not a national collection of verified campus tours.

## Submission preparation still required
- Confirm eligibility, final rules, allowed SDK versions and submission format. The event is the Meta Global AI Developer Hackathon; the published deadline is November 4, 2026 at 9 PM ET.
- Activate the hackathon API credits, configure a server key, run live response evaluations and deploy an authenticated HTTPS service for untethered field use.
- Confirm whether and when the repository must be public; currently keep it private.
- Test real Android/Gen 2 pairing, audio, microphone routing and camera behavior.
- Record a demo with genuine behavior, list team members and disclose reused components.
- Complete the multimodal feature and evaluate it if required by the competition.

This file is a preparation draft. No hackathon form has been submitted.
