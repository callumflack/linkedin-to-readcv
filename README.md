# LinkedIn to ReadCV

Format an approved LinkedIn profile into a ReadCV-style one-page profile.

This is a small Next.js app on Vana's direct-app flow. The user approves a
`linkedin.profile` data request in Vana, the app reads the approved payload from
the user's Personal Server, and the existing ReadCV renderer hydrates from the
normalized `ReadCvData` model.

## Setup

Requires Node 22+.

```bash
pnpm install
```

Create `.env.local`:

```bash
VANA_APP_PRIVATE_KEY=0x...
VANA_APP_URL=http://localhost:3001
```

Run locally:

```bash
pnpm dev
```

Open `http://localhost:3001`, connect LinkedIn with Vana, approve the request,
and return to the original tab.

## Data Contract

Live direct flow requests only `linkedin.profile`. The lite LinkedIn payload
contains profile, experience, education, skills, and languages in one approved
scope.

The mapper also still accepts the older split-scope fixture shape in
`linkedin.json`:

```json
{
  "data": {
    "linkedin.profile": { "data": {} },
    "linkedin.experience": { "data": { "experiences": [] } },
    "linkedin.education": { "data": { "education": [] } },
    "linkedin.skills": { "data": { "skills": [] } }
  }
}
```

Use `src/lib/mapLinkedInToReadcv.ts` as the only boundary from raw LinkedIn data
to the `ReadCvData` view model. Do not bind ReadCV UI components directly to raw
Personal Server JSON.

## UI Guardrail

The ReadCV renderer is considered done. Data-flow work should adapt data to the
existing UI contract, not rewrite the UI.

Frozen surfaces for the Vana direct-flow migration:

- `src/components/readcv/**`
- `src/app/globals.css`
- `src/app/fonts/**`

## Proof

```bash
pnpm test
pnpm exec tsc --noEmit
VANA_APP_URL=http://localhost:3001 \
  VANA_APP_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000 \
  pnpm build
```
