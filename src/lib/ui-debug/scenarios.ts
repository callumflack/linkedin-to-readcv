import type { ProfileHydrationViewModel } from "@/components/ProfileHydrationView";
import { READCV_PROFILE_FIXTURE } from "@/data/readcv-profile.fixture";
import { returnStateForStatus, type ReturnState } from "@/lib/vana/return-state";

type SearchParams = Record<string, string | string[] | undefined>;

export type ScenarioBrowserItem = {
  id: string;
  label: string;
  href: string;
  active: boolean;
};

export type ScenarioSelection<T> = {
  activeId: string;
  label: string;
  model: T;
  items: ScenarioBrowserItem[];
};

type ScenarioRow<T> = {
  id: string;
  label: string;
  model: T;
};

const PROFILE_SCENARIOS = [
  { id: "idle", label: "Landing", model: { type: "idle" } },
  {
    id: "waiting",
    label: "Waiting for approval",
    model: { type: "waiting", label: "Waiting for approval…" },
  },
  {
    id: "delivering",
    label: "Delivering data",
    model: { type: "delivering", label: "Loading your profile…" },
  },
  {
    id: "ready",
    label: "Profile ready",
    model: { type: "ready", cv: READCV_PROFILE_FIXTURE },
  },
  {
    id: "error",
    label: "Load failed",
    model: {
      type: "error",
      title: "Could not load your profile",
      message: "Your LinkedIn profile could not be loaded. Try again.",
    },
  },
] as const satisfies readonly ScenarioRow<ProfileHydrationViewModel>[];

const RETURN_SCENARIOS = [
  { id: "pending", label: "Approval pending", model: returnStateForStatus("pending") },
  { id: "ready", label: "Profile approved", model: returnStateForStatus("ready_for_read") },
  { id: "complete", label: "Read complete", model: returnStateForStatus("completed") },
  { id: "expired", label: "Request expired", model: returnStateForStatus("expired") },
  {
    id: "error",
    label: "Status unavailable",
    model: {
      title: "Status unavailable",
      message: "The request status could not be verified. Return to the profile tab to try again.",
      kind: "error",
    },
  },
] as const satisfies readonly ScenarioRow<ReturnState>[];

export function isUiDebugEnabled(nodeEnv: string | undefined): boolean {
  return nodeEnv === "development";
}

export function resolveProfileScenario(
  params: SearchParams,
  enabled: boolean,
): ScenarioSelection<ProfileHydrationViewModel> | null {
  return resolveScenario<ProfileHydrationViewModel>(
    params,
    enabled,
    "profileScenario",
    "/",
    PROFILE_SCENARIOS,
  );
}

export function resolveReturnScenario(
  params: SearchParams,
  enabled: boolean,
): ScenarioSelection<ReturnState> | null {
  return resolveScenario<ReturnState>(
    params,
    enabled,
    "returnScenario",
    "/connect/return",
    RETURN_SCENARIOS,
  );
}

function resolveScenario<T>(
  params: SearchParams,
  enabled: boolean,
  paramName: string,
  pathname: string,
  rows: readonly ScenarioRow<T>[],
): ScenarioSelection<T> | null {
  if (!enabled || singleParam(params.uiDebug) !== "1") return null;

  const scenarioId = singleParam(params[paramName]);
  if (!scenarioId) return null;

  const active = rows.find((row) => row.id === scenarioId);
  if (!active) return null;

  return {
    activeId: active.id,
    label: active.label,
    model: active.model,
    items: rows.map((row) => ({
      id: row.id,
      label: row.label,
      href: `${pathname}?uiDebug=1&${paramName}=${row.id}`,
      active: row.id === active.id,
    })),
  };
}

function singleParam(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}
