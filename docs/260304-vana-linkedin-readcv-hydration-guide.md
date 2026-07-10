# LinkedIn to ReadCV hydration guide

This is the app-specific reference for turning a Direct Vana `linkedin.profile` read into the preserved ReadCV UI. Shared Vana app setup belongs in the [Vana data app starter README](https://github.com/vana-com/vana-data-app-starter#connect-it-to-vana).

The ReadCV bio template was open-sourced before ReadCV closed in early 2025. This project preserves the presentation from [Callum's ReadCV export](https://github.com/callumflack/readcv-nextjs-export-feb-27-2025).

## Architecture

The app has four layers:

1. **Direct Vana transport**
   - Creates the request through `/api/vana/request`.
   - Polls `/api/vana/status` for authoritative readiness.
   - Reads through `/api/vana/read`.
   - Verifies the separate `/connect/return` browser leg.
   - Comes from the released `vana-data-app-starter` transport boundary.

2. **LinkedIn normalization**
   - `src/lib/linkedin-profile.ts` accepts the Direct Vana profile value or supported scope envelope.
   - `src/lib/mapLinkedInToReadcv.ts` converts that input into the internal ReadCV model.
   - `src/data/contacts.ts` adds app-owned contact links.

3. **ReadCV product UI**
   - `src/components/ProfileHydrationFlow.tsx` translates SDK state into a small view model.
   - `src/components/ProfileHydrationView.tsx` renders the landing, waiting, delivering, ready, and error states.
   - `src/components/readcv/*` renders the finished profile.

4. **Development state browser**
   - `src/lib/ui-debug/scenarios.ts` defines fixture-backed profile and return states.
   - `src/components/UiStateBrowser.tsx` switches between them.
   - Debug scenarios branch before SDK, cookies, and network calls and are disabled outside development.

## Live lifecycle

```text
Connect LinkedIn with Vana
-> create Direct Vana request
-> open Vana approval
-> poll authoritative request status
-> read approved linkedin.profile data
-> map into the ReadCV model
-> render the profile
```

The approval page is a separate browser surface. The original app tab remains the owner of polling, reading, mapping, and rendering the result.

## Data contract and fixtures

The app requests `linkedin.profile` in `src/lib/vana/constants.ts`.

The mapper deliberately owns all accepted LinkedIn shapes. Presentation components receive only `ReadCvData`; they must not inspect raw Vana or LinkedIn payloads.

- `linkedin.json` is the broad source-envelope fixture used by `test/readcv-contract.test.ts`.
- `src/data/linkedin-profile.fixture.ts` is the focused Direct Vana input fixture.
- `src/data/readcv-profile.fixture.ts` is the mapped profile shown by the ready debug scenario.
- `src/data/contacts.ts` supplies Website, X, and GitHub values that LinkedIn does not own.

When the source contract changes, update the mapper and fixtures together, then prove the rendered ReadCV model through the contract test.

Available source scopes are documented in the public [Vana scope catalog](https://github.com/vana-com/data-connectors/blob/main/SCOPES.md). Follow the starter's [scope guide](https://github.com/vana-com/vana-data-app-starter#choose-the-data-scopes) before requesting more data. A new scope changes the product contract; it is not just a transport configuration edit.

## Session and security boundary

- `VANA_APP_PRIVATE_KEY` is server-only.
- `VANA_APP_URL` fixes the registered return origin.
- A signed HTTP-only cookie binds the request ID, runtime, and return origin to the browser session.
- Status and read routes require the bound request ID.
- The return page verifies authoritative status; URL parameters alone never prove approval.

Do not move credentials, request bindings, or authoritative checks into client code.

## Consumer and builder errors

The product and builder have different error surfaces.

- **Consumer UI:** explain what the user can do next without exposing settlement, funding, app identity, network, or SDK internals.
- **Builder diagnostics:** retain the precise transport cause in server logs or builder tooling so the operator can fix configuration and funding.

Never pass a raw transport error message directly into `ProfileHydrationView`. Classify it at the transport/controller boundary and give the view a consumer-safe message.

## UI states without a live read

Run the app and open any profile state:

```text
/?uiDebug=1&profileScenario=idle
/?uiDebug=1&profileScenario=waiting
/?uiDebug=1&profileScenario=delivering
/?uiDebug=1&profileScenario=ready
/?uiDebug=1&profileScenario=error
```

Or inspect the approval-return states:

```text
/connect/return?uiDebug=1&returnScenario=pending
/connect/return?uiDebug=1&returnScenario=ready
/connect/return?uiDebug=1&returnScenario=complete
/connect/return?uiDebug=1&returnScenario=expired
/connect/return?uiDebug=1&returnScenario=error
```

These scenarios are pure fixture views. They do not prove Vana configuration, approval, funding, settlement, or a live read.

## Modification rules

- Preserve the ReadCV model and presentation unless the product requirement changes.
- Keep raw LinkedIn compatibility handling in the mapper.
- Keep live orchestration in `ProfileHydrationFlow` and rendering in `ProfileHydrationView`.
- Keep debug scenarios pure and development-only.
- Pull transport updates from a released starter artifact as one boundary.
- Do not fork SDK retry or settlement behavior in this app.

This architecture does not use `@opendatalabs/connect`, `useVanaData`, `VANA_SCOPES`, `/api/connect`, `/api/data`, manifest signing, webhooks, DataConnect deep links, or Personal Server setup.

## Verification

```bash
mise exec -- pnpm test
mise exec -- pnpm exec tsc --noEmit
```

The contract suite covers the route boundary, LinkedIn mapping, ReadCV output, and debug-state isolation. A production proof still requires a funded Mainnet read after the starter's [production readiness blockers](https://github.com/vana-com/vana-data-app-starter#production-readiness-blockers) are cleared.
