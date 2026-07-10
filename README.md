# LinkedIn to ReadCV

LinkedIn to ReadCV reads a user's `linkedin.profile` data through Direct Vana and maps it into the preserved ReadCV profile UI.

This repository is a downstream consumer of the [Vana data app starter](https://github.com/vana-com/vana-data-app-starter). The starter owns the reusable Direct Vana transport and the shared builder setup. This repository owns the LinkedIn-to-ReadCV mapping and product experience.

## Run locally

```bash
mise install
mise exec -- pnpm install
mise exec -- pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

You can inspect the landing screen without Vana credentials. A live read requires a registered and funded Vana app identity.

## Inspect every UI state

The development-only state browser renders fixture-backed product states without opening Vana or making network requests.

Profile flow:

```text
http://localhost:3000/?uiDebug=1&profileScenario=idle
http://localhost:3000/?uiDebug=1&profileScenario=waiting
http://localhost:3000/?uiDebug=1&profileScenario=delivering
http://localhost:3000/?uiDebug=1&profileScenario=ready
http://localhost:3000/?uiDebug=1&profileScenario=error
```

Approval-return flow:

```text
http://localhost:3000/connect/return?uiDebug=1&returnScenario=pending
http://localhost:3000/connect/return?uiDebug=1&returnScenario=ready
http://localhost:3000/connect/return?uiDebug=1&returnScenario=complete
http://localhost:3000/connect/return?uiDebug=1&returnScenario=expired
http://localhost:3000/connect/return?uiDebug=1&returnScenario=error
```

The switcher in the bottom-right moves between states. These routes are disabled outside development.

## Connect real LinkedIn data

First follow the starter's [Connect it to Vana](https://github.com/vana-com/vana-data-app-starter#connect-it-to-vana) guide. It is the canonical setup for creating an app identity, matching the runtime network, configuring the return URL, and funding reads.

Then configure this app:

```bash
cp .env.example .env.local
```

```bash
VANA_APP_PRIVATE_KEY=0x...
VANA_APP_URL=http://localhost:3000
```

This app requests one data scope: `linkedin.profile`. It is declared in `src/lib/vana/constants.ts`, not in an environment variable. Read the starter's [Choose the data scopes](https://github.com/vana-com/vana-data-app-starter#choose-the-data-scopes) guide before changing it. The public [Vana scope catalog](https://github.com/vana-com/data-connectors/blob/main/SCOPES.md) lists the available source scopes.

## LinkedIn to ReadCV contract

The mapping boundary is `src/lib/mapLinkedInToReadcv.ts`:

```text
linkedin.profile
-> LinkedIn source normalization
-> ReadCV data model
-> preserved ReadCV components
```

- `linkedin.json` is the full contract fixture used by the ReadCV contract test.
- `src/data/linkedin-profile.fixture.ts` is the focused Direct Vana mapping fixture.
- `src/data/readcv-profile.fixture.ts` powers the ready state in the UI browser.
- `src/data/contacts.ts` adds app-owned Website, X, and GitHub links.
- `src/components/readcv/*` owns the preserved ReadCV presentation.

Keep raw source-shape handling inside the mapper. Do not bind the UI directly to LinkedIn JSON.

## Ownership

This repository owns:

- the LinkedIn mapper and fixtures;
- the ReadCV model, components, layout, and product copy;
- the pure profile views and development state browser.

The starter's [transport boundary](https://github.com/vana-com/vana-data-app-starter#transport-boundary) owns the reusable `/api/vana/*` request, status, read, return, session-binding, and error-classification plumbing. The Vana SDK owns protocol retries and settlement behavior.

When updating the transport, pull the released starter artifact as a unit. Do not copy individual route files or fork protocol behavior inside this app.

## Production readiness

This app is not production-proven until the starter's [production readiness blockers](https://github.com/vana-com/vana-data-app-starter#production-readiness-blockers) are cleared and a funded Mainnet read succeeds end to end.

That upstream section is the canonical blocker list. Keep this README linked to it instead of duplicating issue descriptions that will go stale.

## Verify

```bash
mise exec -- pnpm test
mise exec -- pnpm exec tsc --noEmit
```

For the current architecture and modification rules, see [the hydration guide](docs/260304-vana-linkedin-readcv-hydration-guide.md).
