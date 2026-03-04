# Vana LinkedIn ReadCV Hydration Guide

This doc explains what this app actually is, what is custom vs starter behavior, and how to run/extend it without breaking the data contract.

The ReadCV bio template was open-sourced prior to ReadCV's closure in early 2025. [Here's the copy](https://github.com/callumflack/readcv-nextjs-export-feb-27-2025) used for this project.

## WTF this app is

This project is the Vana Connect starter wired into a ReadCV-like profile renderer.

It has 3 layers:

1. **Vana Connect transport layer** (already in starter)
   - Creates connect session
   - Waits for approval in DataConnect
   - Fetches approved data from personal server

2. **LinkedIn data normalization layer** (custom)
   - Accepts the personal server envelope shape:
     - `data["linkedin.profile"].data`
     - `data["linkedin.experience"].data`
     - `data["linkedin.education"].data`
     - `data["linkedin.skills"].data`
   - Treats this as the only supported input contract
   - Converts it into one internal ReadCV data model

3. **ReadCV presentation layer** (customized starter UI)
   - Renders profile header, about, contact, work, education, skills
   - Uses ReadCV-derived styles/components

## Key files and responsibilities

- `src/components/ConnectFlow.tsx`
  - Connect button + grant/data debug
  - `useVanaData()` lifecycle (`initConnect`, poll, `fetchData`)

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
  - Renders mapped profile + Connect debug panel

## Data shape nuance (important)

The personal server shape is scope-envelope based and must be treated as canonical:

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

This is equivalent in content to per-scope files in `data/<scope>/...json`, but wrapped under top-level `data`.

`linkedin.json` in repo root is a **replica fixture** of that real personal-server response shape.  
Developers should reference `linkedin.json` as the contract sample when editing mapper/UI behavior.

## Required scopes for full render

Set:

```bash
VANA_SCOPES=linkedin.experience,linkedin.education,linkedin.skills,linkedin.languages,linkedin.profile
```

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
  - `src/app/api/connect/route.ts`
  - `src/app/api/data/route.ts`
- Do not bypass mapper and bind UI directly to raw personal server JSON
- Keep source-shape handling centralized in `mapLinkedInToReadcv.ts`
- Assume a single input shape (`source.data["linkedin.*"]`); do not reintroduce legacy root/container handling

## If we push this app (production hydration flow)

Goal: user signs in with Vana and their LinkedIn data hydrates the ReadCV template.

### Suggested user flow

1. Page load
2. CTA: **Connect LinkedIn with Vana**
3. User approves grant in DataConnect
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

When moving from reference JSON to fully live hydration:

1. Keep `mapLinkedInToReadcv` unchanged
2. Feed it live `useVanaData().data` envelope after `fetchData()`
3. Keep reference `linkedin.json` as the contract replica fixture for development
4. Keep Connect debug panel available behind a details toggle

