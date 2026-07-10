import { readRequestBinding } from "@/lib/vana/binding";
import { assertLinkedInReadReady } from "@/lib/vana/capability";
import { returnStateForStatus, type ReturnState } from "@/lib/vana/return-state";
import { getVanaController, getVanaServerConfig } from "@/lib/vana/server";
import { isUiDebugEnabled, resolveReturnScenario } from "@/lib/ui-debug/scenarios";
import UiStateBrowser from "@/components/UiStateBrowser";
import { cookies } from "next/headers";
import styles from "@/components/ProfileHydrationFlow.module.css";

export default async function ConnectReturn({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const debugScenario = resolveReturnScenario(params, isUiDebugEnabled(process.env.NODE_ENV));

  if (debugScenario) {
    return (
      <ReturnView
        state={debugScenario.model}
        debugScenario={debugScenario.activeId}
        browser={
          <UiStateBrowser items={debugScenario.items} />
        }
      />
    );
  }

  const requestId = typeof params.request_id === "string" ? params.request_id : null;
  const state = await authoritativeReturnState(requestId);

  return <ReturnView state={state} />;
}

function ReturnView({
  state,
  debugScenario,
  browser,
}: {
  state: ReturnState;
  debugScenario?: string;
  browser?: React.ReactNode;
}) {
  return (
    <main className={styles.shell} data-debug-scenario={debugScenario}>
      <p className={styles.stateBody}>Verified request status</p>
      <h1 className={styles.stateTitle}>{state.title}</h1>
      <p className={styles.stateBody}>{state.message}</p>
      <a className={styles.ctaButton} href="/">Return to profile</a>
      {browser}
    </main>
  );
}

async function authoritativeReturnState(requestId: string | null): Promise<ReturnState> {
  if (!requestId || requestId.length > 256) return invalidReturn();

  try {
    const config = getVanaServerConfig();
    const binding = readRequestBinding(
      await cookies(),
      { requestId, returnOrigin: config.returnOrigin },
      config.appPrivateKey,
    );
    if (!binding) return invalidReturn();

    const status = await getVanaController(binding.runtime, config).getAccessRequestStatus(requestId);
    if (status.status === "approved" || status.status === "ready_for_read") assertLinkedInReadReady(status);
    return returnStateForStatus(status.status);
  } catch (error) {
    console.error(`[vana/return] Return verification failed for ${requestId}`, error);
    return {
      title: "Status unavailable",
      message: "The request status could not be verified. Return to the profile tab to try again.",
      kind: "error",
    };
  }
}

function invalidReturn(): ReturnState {
  return {
    title: "Request unavailable",
    message: "This return does not match a request from the current browser session.",
    kind: "error",
  };
}
