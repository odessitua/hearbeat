<!--
Sync Impact Report
==================
Version change: (template) → 1.0.0
Modified principles: N/A (initial ratification)
Added sections:
  - Core Principles (8 principles)
  - Scope & Constraints
  - Development Workflow
  - Governance
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md — ✅ no change (Constitution Check filled at plan time)
  - .specify/templates/spec-template.md — ✅ no change (generic; constraints applied via spec content)
  - .specify/templates/tasks-template.md — ✅ no change (paths resolved in plan.md)
Follow-up TODOs: none
-->

# HearBeat Constitution

## Core Principles

### I. AI-First, Not Medical

The product MUST center on acoustic baseline comparison and vitality trends derived from
voice check-ins. The system MUST NOT produce diagnoses, clinical claims, validated medical
thresholds, or language implying dementia detection or replacement of a physician.

**Rationale**: Trust and hackathon credibility depend on a family wellness signal, not
unvalidated medical assertions. Removing AI leaves only subjective «how are you?» calls
with no objective signal between conversations.

### II. Simplicity for Elderly Users

Check-ins MUST use a familiar, low-friction interaction pattern (incoming-call emulation
or voice response) without requiring new apps, logins, complex forms, or fine motor UI
tasks. Elderly users MUST NOT feel monitored, controlled, or treated as patients.

**Rationale**: The primary elderly persona resists new technology; adoption depends on
feeling like a normal conversation, not a clinical workflow.

### III. Family-Centric Dashboard

The paying user and primary dashboard audience is the adult child (or family member) who
needs an objective signal between real calls. The dashboard MUST surface trend, status,
and a clear «worth calling today» recommendation derived from acoustic analysis and
optional short summary.

**Rationale**: The core job-to-be-done is «don't miss when something changed» — the
family member acts on the signal, not the elderly parent reading analytics.

### IV. Hackathon Scope Lock

The hackathon MVP MUST demonstrate web-based incoming-call emulation plus a family
dashboard. Real outbound telephony (Vapi, Twilio, Bland, etc.), multi-profile family
accounts, full authentication, cognitive modules, multilingual UI, and clinically
validated thresholds are explicitly OUT OF SCOPE for the hackathon build.

**Rationale**: One verifiable AI flow beats a partial production telephony stack within
a 48-hour window. Telephony is Phase 1 after value is proven in demo.

### V. Demo Sufficiency

The hackathon deliverable MUST include one public end-to-end scenario that a judge or
visitor can complete without developer narration:

open link → complete voice check-in → see updated dashboard → understand why the system
recommends calling (or that status is normal).

**Rationale**: Success is measured by demonstrable user value, not internal pipeline
completeness.

### VI. Two Mandatory Demo States

The demo MUST support two contrasting, reproducible states:

1. **Normal** — voice sounds like the personal baseline; no urgent call recommended.
2. **Check-in needed** — measurable acoustic deviation (e.g., slower tempo, longer pauses)
   triggers a visible family signal.

**Rationale**: The product thesis is early deviation detection; a single happy path
cannot prove the AI core.

### VII. Synthetic Data Only

All hackathon demo audio, profiles, and dashboard history MUST use synthetic or
consented test data. Real personal or identifiable health data MUST NOT appear in public
demos, repositories, or shared environments.

**Rationale**: Privacy, ethics, and reproducible judging require controlled demo datasets
(typically TTS-generated with intentional acoustic variation).

### VIII. Fallback Without Lying

If live browser recording or the ML API is unavailable in time, the system MAY use
precomputed features, TTS samples, or cached scores — but the user-facing flow and data
schema MUST remain identical to the live pipeline. Fallbacks MUST NOT fake a different
product or hide that the same analysis path exists.

**Rationale**: Hackathon risk management without abandoning the AI-first story; judges
see the same dashboard contract whether audio is live or seeded.

## Scope & Constraints

### In Scope (Hackathon MVP)

- Voice check-in screen (emulated call) with ~3 short spoken questions
- Acoustic feature extraction and personal baseline comparison
- `vitality_score`, status (`normal` / `check-in needed`), trend, and family summary
- Dashboard for the adult child with historical check-ins (seeded synthetic data)
- Implementation code under `HearBeat/` at repository root

### Out of Scope (Defer to Phase 1+)

- Real phone calls and call orchestration (n8n, Make)
- Multiple family profiles, auth, billing, push/Telegram alerts
- Cognitive exercise module (idea 13), clinical validation, diagnostic language
- Production-grade ML accuracy claims

### Authoritative Product Documents

When specs conflict, resolve in this order:

1. This constitution (non-negotiable gates)
2. Active feature spec under `specs/`
3. `hackaton/hearbeat_project-guide.md` (hackathon tactical scope)
4. `brainstorm/hearbeat_product-vision.md` (long-term product vision)

Long-term vision informs roadmap; hackathon scope lock wins for MVP delivery.

## Development Workflow

### Spec-Driven Development

All feature work in `HearBeat/` MUST flow through Spec Kit:

`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`

Optional quality gates: `/speckit-clarify`, `/speckit-checklist`, `/speckit-analyze`.

### Constitution Check (Plan Gate)

Every implementation plan MUST include a Constitution Check section verifying compliance
with all eight principles before Phase 0 research and again after Phase 1 design. Any
violation MUST be documented in Complexity Tracking with justification.

### Implementation Layout

```
HearBeat/
├── web/       # Check-in UI + family dashboard
├── ml/        # Acoustic analysis pipeline
├── data/      # Synthetic audio and seed data
└── README.md
```

Exact structure MAY be refined in `plan.md` but MUST remain under `HearBeat/`.

### Two-Engine Rule (Hackathon)

- **AI chat (planning, prompts, pitch)**: cheap thinking — specs, copy, debug wording
- **Builder (Lovable / codegen)**: UI assembly and public link
- **Python / ML**: acoustic core — para-programmer for the differentiating AI layer

Do not burn builder credits on tasks solvable in chat; do not skip ML for generic
LLM-only wrappers.

## Governance

This constitution supersedes ad-hoc implementation decisions for the HearBeat project.
Amendments require:

1. Explicit user or team approval
2. Version bump per semantic versioning (see below)
3. Update to `LAST_AMENDED_DATE`
4. Re-run Constitution Check on any active `specs/*/plan.md` affected by the change

**Compliance**: Every PR and `/speckit-implement` session MUST verify no violation of
Principles I–VIII. Scope creep (telephony, medical claims, real PII in demo) is a
blocking defect.

**Versioning policy**:

- **MAJOR**: Principle removed or redefined incompatibly
- **MINOR**: New principle or materially expanded constraint
- **PATCH**: Wording clarifications without semantic change

**Runtime guidance**: `hackaton/hearbeat_project-guide.md`, `README.md`, and active
files under `specs/` supplement this document but do not override it.

**Version**: 1.0.0 | **Ratified**: 2026-07-02 | **Last Amended**: 2026-07-02
