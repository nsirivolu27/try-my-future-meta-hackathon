# Hackathon submission draft

## Project
Try My Future — a campus visit that helps you imagine everyday student life.

## Problem
Students visiting colleges collect facts and photos, but often struggle to remember how different campuses felt and which questions they still need answered. A campus visit should help students see themselves learning, commuting, studying and finding a community.

## Experience
Search for a school, select your interests, and start a visit. Listen through your phone or compatible audio glasses, reflect on what you notice, capture your thoughts and compare visits. Sourced campus guides add specific places and context as content coverage grows.

## Built in this prototype
- Android app and browser preview with a compact blue/white/gold interface.
- Searchable offline federal directory of 5,877 institutions, SQLite database and repeatable import with provenance.
- Self-guided reflections and journal for listed institutions; three sourced pilot guides at UCSD, UT Austin and UVA.
- Hardware-independent audio mode, Android narration/dictation, and the first Meta camera adapter.
- Real-world campus activities, contextual questions to ask students, completion tracking, and evidence notes grouped into good signs, concerns and follow-up questions.
- Local journal export and comparison without invented fit scores or admissions predictions.

## Two-minute demo
1. Search for Middlesex College in New Jersey. Show that a community college can start a self-guided visit.
2. Switch to UVA or UCSD and show the difference: named discovery stops with official university sources.
3. Choose an interest and start a visit. Try the activity at a stop, read the student question, mark the activity tried and save a Good sign or Concern.
4. Ask a supported study-space question, then an unsupported tuition question; show honest fallback.
5. Open Journal and Compare, then export your notes.
6. On validated hardware only, show Meta camera capture. Clearly explain that capture does not yet recognize buildings. Without tested hardware, show the adapter UI and state that hardware validation is pending.

## What to say accurately
AI-assisted campus exploration is the intended direction. The current prototype uses deterministic retrieval and reflection prompts; no generative model or visual recognition service is running. Bluetooth audio is conditional on device support. Meta is the only implemented camera adapter, and it has not yet been tested on physical glasses. The national directory is not a national collection of verified campus tours.

## Submission preparation still required
- Verify exact hackathon name, eligibility, rules, deadline, allowed SDK versions and submission format from the actual invitation.
- Confirm whether and when the repository must be public; currently keep it private.
- Test real Android/Gen 2 pairing, audio, microphone routing and camera behavior.
- Record a demo with genuine behavior, list team members and disclose reused components.
- Complete the multimodal feature and evaluate it if required by the competition.

This file is a preparation draft. No hackathon form has been submitted.
