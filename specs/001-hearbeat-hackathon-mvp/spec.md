# Feature Specification: HearBeat Hackathon MVP

**Feature Branch**: `001-hearbeat-hackathon-mvp`

**Created**: 2026-07-02

**Status**: Draft

**Input**: HearBeat MVP for Digital Future Hackathon (11–12 July 2026). Sources:
`brainstorm/hearbeat_product-vision.md`, `hackaton/hearbeat_project-guide.md`.
Implementation target folder: `HearBeat/`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Voice Check-In for Elderly Parent (Priority: P1)

An elderly parent (65+) receives an emulated incoming call from HearBeat and
answers approximately three short spoken questions in a warm, conversational tone
(e.g., how their day went, how they feel). They do not need to install an app,
create an account, or read small text. When finished, they receive a brief
confirmation that their family member will be notified.

**Why this priority**: Without the check-in, there is no voice input and no
product — only an empty dashboard. This is the entry point of the golden path.

**Independent Test**: Open the public check-in experience, complete all questions
using voice (or an approved demo voice sample), and receive a clear completion
confirmation without assistance.

**Acceptance Scenarios**:

1. **Given** a visitor opens the check-in link, **When** they start the emulated
   call, **Then** they see or hear a familiar incoming-call style experience with
   simple instructions in plain language.
2. **Given** the check-in is in progress, **When** the elderly user answers each
   of the three short questions, **Then** each answer is captured as audio for
   analysis.
3. **Given** all questions are answered, **When** the check-in completes,
   **Then** the user sees or hears a short thank-you message explaining that the
   family dashboard will be updated.
4. **Given** live voice capture is unavailable, **When** the user selects an
   approved demo voice response, **Then** the same check-in flow completes and
   produces the same outcome structure as a live recording.

---

### User Story 2 - Family Dashboard with Actionable Signal (Priority: P1)

An adult child (28–45, Ukrainian diaspora) opens the family dashboard to
understand whether their elderly parent in Ukraine sounds as usual or whether
they should call today. They see a prominent status, a vitality trend over recent
check-ins, a plain-language summary of the latest conversation, and an
explanation of what changed acoustically (e.g., slower speech, longer pauses).

**Why this priority**: This is the paying user's core job-to-be-done — objective
reassurance or an early nudge to call. The hackathon demo fails without it.

**Independent Test**: Open the dashboard after a check-in (or with pre-loaded
history) and determine within 30 seconds whether status is normal or a call is
recommended, including why.

**Acceptance Scenarios**:

1. **Given** recent check-in data exists, **When** the family member opens the
   dashboard, **Then** they see a large status of either «sounds as usual» or
   «worth calling today».
2. **Given** multiple historical check-ins exist, **When** the dashboard loads,
   **Then** a trend visualization shows vitality over time (not a single
   isolated score).
3. **Given** the latest check-in triggered a deviation, **When** the family
   member reads the dashboard, **Then** they see a human-readable explanation
   (e.g., «pauses 40% longer than usual») without medical or diagnostic language.
4. **Given** a latest check-in completed, **When** the dashboard refreshes,
   **Then** a short family summary of the conversation is visible.

---

### User Story 3 - Acoustic Baseline Comparison (Priority: P1)

After each voice check-in, the system analyzes how the person spoke (pace, pauses,
intonation variation, vocal energy) and compares the result to that person's
personal baseline built from prior check-ins. It produces a vitality score (0–100),
a status (`normal` or `check-in needed`), and stores the result for the dashboard.

**Why this priority**: This is the AI-first core. Without baseline comparison,
HearBeat is indistinguishable from a subjective «how are you?» call.

**Independent Test**: Submit two contrasting voice samples (one matching baseline,
one with slower tempo and longer pauses) and verify different statuses and
explanations are produced.

**Acceptance Scenarios**:

1. **Given** a set of baseline check-ins for one elderly profile, **When** a new
   check-in closely matches baseline acoustics, **Then** status is `normal` and
   no urgent call is recommended.
2. **Given** the same baseline, **When** a new check-in shows measurable deviation
   (e.g., slower tempo, longer pauses, lower energy), **Then** status is
   `check-in needed` and the dashboard explains the deviation in plain language.
3. **Given** any analyzed check-in, **When** results are produced, **Then** the
   system does not output diagnoses, clinical claims, or dementia-related language.
4. **Given** analysis completes, **When** results are saved, **Then** vitality
   score, status, acoustic explanation, and optional summary are available for
   the dashboard.

---

### User Story 4 - Credible Demo History (Priority: P2)

A judge or visitor opening the dashboard for the first time sees a believable
history of prior check-ins (approximately 20–50 entries) so the trend chart and
baseline comparison feel real, not empty.

**Why this priority**: An empty dashboard undermines trust during the hackathon
pitch; seeded history proves the trend concept without requiring weeks of real use.

**Independent Test**: Open the dashboard with no new check-in performed and still
see a populated trend with mixed normal days and at least one prior deviation
pattern.

**Acceptance Scenarios**:

1. **Given** a fresh public demo link, **When** the dashboard loads before any
   live check-in, **Then** historical check-ins are visible on the trend chart.
2. **Given** seeded demo data, **When** inspected, **Then** all records use
   synthetic or consented test personas — no real personal health data.

---

### User Story 5 - Conversational Summary (Priority: P3)

After acoustic analysis, the family member may optionally see a short,
human-readable summary of what was discussed in the check-in (beyond acoustic
metrics), phrased as caring family context rather than a medical report.

**Why this priority**: Strengthens emotional value for the pitch but is secondary
to the acoustic signal; a template-based summary is acceptable if the acoustic
layer works.

**Independent Test**: Complete a check-in with known spoken content and verify
the summary reflects the conversation themes without clinical terminology.

**Acceptance Scenarios**:

1. **Given** a completed check-in with transcribed or scripted content, **When**
   the dashboard displays the latest entry, **Then** a summary of 1–3 sentences
   is shown in plain language.
2. **Given** summary generation is unavailable, **When** the dashboard loads,
   **Then** acoustic status and explanation still display without blocking the
   demo.

---

### Edge Cases

- **Very short or silent recording**: System shows a friendly retry or offers an
  approved demo voice sample; dashboard is not updated with a misleading score.
- **Background noise or poor audio quality**: Analysis proceeds or degrades
  gracefully with a neutral message; demo does not crash.
- **First check-in with no baseline yet**: System treats early recordings as
  baseline-building; status defaults to neutral until enough history exists (or
  demo uses pre-seeded baseline per constitution).
- **User fears surveillance**: Check-in screen includes brief, transparent consent
  copy explaining purpose, who receives the signal, and that this is a family
  wellness tool — not diagnosis or monitoring for its own sake.
- **Two demo states for judging**: Operators can reproducibly trigger both
  «normal day» and «tired day» scenarios without code changes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a public check-in experience emulating an
  incoming call, requiring no account registration.
- **FR-002**: System MUST present approximately three short spoken questions per
  check-in in a warm, non-clinical tone.
- **FR-003**: System MUST capture voice responses as audio for each question.
- **FR-004**: System MUST offer an approved fallback path (demo voice sample)
  when live recording is unavailable, preserving the same user flow.
- **FR-005**: System MUST analyze each check-in for acoustic characteristics
  including speech tempo, pause length, intonation variability, and vocal energy.
- **FR-006**: System MUST maintain a personal acoustic baseline per elderly
  profile and compare each new check-in against it.
- **FR-007**: System MUST produce a vitality score (0–100) and a status limited
  to `normal` or `check-in needed`.
- **FR-008**: System MUST generate a plain-language acoustic explanation when
  deviation from baseline is detected (e.g., «slower than usual», «longer pauses»).
- **FR-009**: System MUST NOT display diagnoses, clinical validity claims, or
  language implying medical conditions or dementia detection.
- **FR-010**: System MUST provide a family dashboard showing current status,
  vitality trend, latest summary, and acoustic explanation.
- **FR-011**: System MUST support two reproducible demo states: «sounds as usual»
  and «worth calling today».
- **FR-012**: System MUST pre-load synthetic historical check-ins so the
  dashboard trend is credible on first visit (approximately 20–50 records).
- **FR-013**: System MUST use only synthetic or consented test data in public
  demos — no real identifiable personal health information.
- **FR-014**: System MUST display brief consent or transparency copy on the
  check-in experience explaining recording purpose and family audience.
- **FR-015**: System MAY produce an optional short conversational summary; if
  absent, acoustic status and explanation MUST still function.

### Key Entities

- **Elderly Profile**: Represents one parent being monitored; attributes include
  display name, language preference, and baseline reference window. Hackathon
  demo uses a single fixed profile.
- **Check-In**: One voice session with timestamp, audio reference, scenario label
  (e.g., baseline, normal day, tired day), acoustic features, vitality score,
  status, acoustic explanation, and optional family summary.
- **Baseline**: Aggregated acoustic norms derived from prior check-ins for one
  profile; used as comparison reference for deviation detection.
- **Family Dashboard View**: Read-only presentation of latest status, trend
  series, and explanations for the adult child persona.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor (judge) completes the full demo — open link,
  finish check-in, view updated dashboard, understand the call recommendation —
  in under 5 minutes without developer narration.
- **SC-002**: 100% of hackathon demo runs exhibit both required states: at least
  one «normal» outcome and one «check-in needed» outcome on demand.
- **SC-003**: 90% of test users correctly identify whether the system recommends
  calling after viewing the dashboard for under 30 seconds.
- **SC-004**: Dashboard displays a trend spanning at least 14 days of synthetic
  history on first load.
- **SC-005**: Zero demo screens contain medical diagnostic language or claims of
  clinical accuracy (verified by checklist review before pitch).

## Assumptions

- Target event is Digital Future Hackathon, 11–12 July 2026; delivery is a
  public web link, not a production telephony product.
- Single elderly profile and single family viewer suffice; multi-profile accounts
  and authentication are out of scope.
- Real outbound phone calls, push notifications, Telegram alerts, and cognitive
  exercise modules are deferred to post-hackathon phases.
- Ukrainian-language UX is sufficient for the hackathon; multilingual UI is out
  of scope.
- Synthetic voice samples may stand in for live elderly speakers during judging.
- Implementation code lives under `HearBeat/` per project constitution.
- If live analysis is delayed, precomputed scores may be used provided the user
  flow and dashboard contract remain identical (constitution Principle VIII).

## Out of Scope

- Real telephony (outbound/inbound phone integration)
- User registration, login, billing, family multi-user accounts
- Clinically validated thresholds or medical device claims
- Cognitive training module (product vision idea 13)
- Production-grade ML accuracy benchmarks
