# Vana LinkedIn ReadCV Hydration Guide

This doc explains what this app actually is, what is custom vs starter behavior, and how to run/extend it without breaking the data contract.

The ReadCV bio template was open-sourced prior to ReadCV's closure in early 2025. [Here's the copy](https://github.com/callumflack/readcv-nextjs-export-feb-27-2025) used for this project.

## WTF this app is

This project is a Vana direct app wired into a ReadCV-like profile renderer.

It has 3 layers:

1. **Vana direct-app transport layer**
   - Creates a Vana data connection request
   - Waits for approval in the Vana approval tab
   - Fetches approved data from the user's Personal Server

2. **LinkedIn data normalization layer** (custom)
   - Accepts both:
     - `data["linkedin.profile"].data`
     - `data["linkedin.experience"].data`
     - `data["linkedin.education"].data`
     - `data["linkedin.skills"].data`
   - Or the direct-flow lite payload under `data["linkedin.profile"].data`
     with experience/education/skills/languages embedded on the profile
   - Treats both as the supported input contract
   - Converts it into one internal ReadCV data model

3. **ReadCV presentation layer** (customized starter UI)
   - Renders profile header, about, contact, work, education, skills
   - Uses ReadCV-derived styles/components

## Key files and responsibilities

- `src/components/ProfileHydrationFlow.tsx`
  - Connect CTA, approval/read state, and final `Profile` render
  - Uses the direct-app lifecycle from `@opendatalabs/vana-sdk/react`

- `src/lib/vana.ts`
  - Direct data controller config
  - App identity, launch environment/network resolution, request binding, and Personal Server retry behavior

- `src/app/api/vana/*`
  - Creates, polls, and reads direct Vana data connection requests

- `src/lib/mapLinkedInToReadcv.ts`
  - Single mapping boundary from LinkedIn envelope -> ReadCV model
  - Date normalization (`Aug 2007 - Dec 2010` -> `2007 — 2010`)
  - Section construction/order

- `src/data/contacts.ts`
  - Contact addendum object (Website, X, GitHub)
  - Merged with LinkedIn-derived contact data

- `src/components/readcv/*`
  - ReadCV-like renderer + styles

- `src/app/page.tsx`
  - Current page shell
  - Renders the hydration flow

## Data shape nuance (important)

The live direct-app shape is a single `linkedin.profile` payload that includes
profile fields plus experience, education, skills, and languages arrays.

The older fixture shape is scope-envelope based and remains supported for
contract tests:

```json
{
  "data": {
    "linkedin.experience": {
      "$schema": "...",
      "version": "1.0",
      "scope": "linkedin.experience",
      "collectedAt": "...",
      "data": {
        "experiences": []
      }
    }
  }
}
```

`linkedin.json` in repo root is a **replica fixture** of that real personal-server response shape.  
Developers should reference `linkedin.json` as the contract sample when editing mapper/UI behavior.

## Required scopes for full render

Live direct flow requests only `linkedin.profile`. The mapper still accepts the
old replica fixture shape in `linkedin.json` for contract tests and local
development.

Current UI intentionally ignores languages.

## Contact behavior

Contacts are merged from two sources:

1. LinkedIn profile URL (from personal server)
2. Addendum (`src/data/contacts.ts`) for Website/X/GitHub

Header primary link behavior:

- if `contactAddendum.website` exists, use that in header
- else fallback to LinkedIn `profileUrl`

## What to avoid breaking

- Do not change API route interfaces in:
  - `src/app/api/vana/request/route.ts`
  - `src/app/api/vana/status/route.ts`
  - `src/app/api/vana/data/route.ts`
- Do not bypass mapper and bind UI directly to raw personal server JSON
- Keep source-shape handling centralized in `mapLinkedInToReadcv.ts`
- Keep support for both mapper inputs: direct `linkedin.profile` lite payload and the old split-scope fixture envelope

## Direct-flow freeze guardrail

During the direct-flow migration, treat these UI surfaces as frozen:

- `src/components/readcv/**`
- `src/app/globals.css`
- `src/app/fonts/**`

The hardening guard lives on the data side: raw LinkedIn payload -> `src/lib/mapLinkedInToReadcv.ts` -> `ReadCvData` contract tests.

## If we push this app (production hydration flow)

Goal: user signs in with Vana and their LinkedIn data hydrates the ReadCV template.

### Suggested user flow

1. Page load
2. CTA: **Connect LinkedIn with Vana**
3. User approves the data request in Vana
4. App fetches personal server data
5. Mapper normalizes data
6. UI hydrates profile sections

### Suggested states (simple + explicit)

- `idle`: CTA visible
- `connecting`: `Loading`
- `waiting`: `Loading.`
- `approved_fetching`: `Loading..`
- `hydrating`: `Loading...`
- `ready`: profile visible
- `error`: show retry button + error text

No smooth animation needed. Just advance dot count on a timer.

### Minimal loader spec (dot plop)

- Tick every `350ms`
- Cycle text in place:
  - `Loading`
  - `Loading.`
  - `Loading..`
  - `Loading...`
  - repeat

Pseudo-implementation:

```ts
const frames = ["Loading", "Loading.", "Loading..", "Loading..."];
let idx = 0;
setInterval(() => {
  label = frames[idx % frames.length];
  idx += 1;
}, 350);
```

## Practical next step

Before enabling the Vana Web app card, prove the live launch path:

1. Open the app from Vana Web so `vana_env`/`network` launch params are present.
2. Approve the `linkedin.profile` request.
3. Confirm the hydrated ReadCV profile still renders Contact, Work Experience, Education, and Skills.
