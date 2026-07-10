# Agent guide

This repository is a LinkedIn-to-ReadCV product built on the Direct Vana transport released by `vana-data-app-starter` v0.1.0 and `@opendatalabs/vana-sdk` 3.13.4.

## Owner boundaries

This app owns:

- `src/lib/mapLinkedInToReadcv.ts` and its fixtures;
- the ReadCV data model and `src/components/readcv/*`;
- product copy and pure UI states;
- the development-only UI state browser.

The upstream starter owns the reusable Direct Vana transport: `/api/vana/request`, `/api/vana/status`, `/api/vana/read`, `/connect/return`, session binding, runtime selection, and transport error classification. The SDK owns protocol retries and settlement.

Preserve the finished ReadCV UI. Change the mapper or product views only when the app-specific contract requires it. Update transport files from a released starter artifact as one unit, not by copying isolated routes.

## Current Direct Vana contract

- The server-only credentials are `VANA_APP_PRIVATE_KEY` and `VANA_APP_URL`.
- The requested source and scope are declared in `src/lib/vana/constants.ts`.
- The current scope is `linkedin.profile`.
- The live controller is `src/components/ProfileHydrationFlow.tsx`.
- The pure product view is `src/components/ProfileHydrationView.tsx`.
- The LinkedIn-to-ReadCV boundary is `src/lib/mapLinkedInToReadcv.ts`.
- Debug scenarios must branch before SDK, cookies, or network work and remain disabled outside development.

Use the upstream starter README for shared setup, scopes, transport, and production blockers. Keep this repository's docs limited to LinkedIn-to-ReadCV behavior.

## Audience boundary

Product UI is for the consumer. It must use safe, actionable language such as “Your LinkedIn profile could not be loaded. Try again.”

Funding, app identity, network, scope, return URL, settlement, and SDK diagnostics are for the builder. Keep their detailed cause in server logs or builder tooling; never render raw transport errors in the consumer view.

## Never reintroduce the legacy Connect architecture

Do not add back:

- `@opendatalabs/connect` or `useVanaData`;
- `VANA_PRIVATE_KEY`, `APP_URL`, or `VANA_SCOPES`;
- `/api/connect`, `/api/data`, manifest signing, or webhook setup;
- DataConnect deep links or Personal Server setup instructions.

Those belong to the removed Connect flow and are not aliases for Direct Vana.

## Done gate

Run the narrow contract proof after changes:

```bash
mise exec -- pnpm test
mise exec -- pnpm exec tsc --noEmit
```

For visible state changes, also inspect the affected `uiDebug=1` scenario in the browser. For live transport changes, prove the real approval-return-read boundary in the matching Vana environment.
