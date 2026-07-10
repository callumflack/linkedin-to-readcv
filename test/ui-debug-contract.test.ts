import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isUiDebugEnabled,
  resolveProfileScenario,
  resolveReturnScenario,
} from "../src/lib/ui-debug/scenarios";

test("UI debug is enabled only in the development runtime", () => {
  assert.equal(isUiDebugEnabled(undefined), false);
  assert.equal(isUiDebugEnabled("test"), false);
  assert.equal(isUiDebugEnabled("production"), false);
  assert.equal(isUiDebugEnabled("development"), true);
});

test("profile UI scenarios are opt-in, fail closed, and own their browser URLs", () => {
  assert.equal(resolveProfileScenario({ uiDebug: "1", profileScenario: "idle" }, false), null);
  assert.equal(resolveProfileScenario({ profileScenario: "idle" }, true), null);
  assert.equal(resolveProfileScenario({ uiDebug: ["1"], profileScenario: "idle" }, true), null);
  assert.equal(resolveProfileScenario({ uiDebug: "1", profileScenario: "unknown" }, true), null);
  assert.equal(
    resolveProfileScenario({ uiDebug: "1", returnScenario: "pending" }, true),
    null,
  );

  const selection = resolveProfileScenario(
    { uiDebug: "1", profileScenario: "ready" },
    true,
  );
  assert.ok(selection);
  assert.equal(selection.activeId, "ready");
  assert.deepEqual(
    selection.items.map(({ id, href, active }) => ({ id, href, active })),
    [
      { id: "idle", href: "/?uiDebug=1&profileScenario=idle", active: false },
      { id: "waiting", href: "/?uiDebug=1&profileScenario=waiting", active: false },
      {
        id: "delivering",
        href: "/?uiDebug=1&profileScenario=delivering",
        active: false,
      },
      { id: "ready", href: "/?uiDebug=1&profileScenario=ready", active: true },
      { id: "error", href: "/?uiDebug=1&profileScenario=error", active: false },
    ],
  );
  assert.equal(selection.model.type, "ready");
  if (selection.model.type === "ready") {
    assert.equal(selection.model.cv.general.displayName, "Callum Flack");
  }
});

test("return UI scenarios are a separate axis with exact browser URLs", () => {
  assert.equal(resolveReturnScenario({ uiDebug: "1", returnScenario: "pending" }, false), null);
  assert.equal(
    resolveReturnScenario({ uiDebug: "1", profileScenario: "waiting" }, true),
    null,
  );

  const selection = resolveReturnScenario(
    { uiDebug: "1", returnScenario: "ready" },
    true,
  );
  assert.ok(selection);
  assert.equal(selection.activeId, "ready");
  assert.equal(selection.model.title, "Profile approved");
  assert.deepEqual(
    selection.items.map(({ id, href }) => ({ id, href })),
    [
      {
        id: "pending",
        href: "/connect/return?uiDebug=1&returnScenario=pending",
      },
      { id: "ready", href: "/connect/return?uiDebug=1&returnScenario=ready" },
      {
        id: "complete",
        href: "/connect/return?uiDebug=1&returnScenario=complete",
      },
      {
        id: "expired",
        href: "/connect/return?uiDebug=1&returnScenario=expired",
      },
      { id: "error", href: "/connect/return?uiDebug=1&returnScenario=error" },
    ],
  );
});
