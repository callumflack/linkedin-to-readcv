import ProfileHydrationFlow from "@/components/ProfileHydrationFlow";
import ProfileHydrationView from "@/components/ProfileHydrationView";
import UiStateBrowser from "@/components/UiStateBrowser";
import { isUiDebugEnabled, resolveProfileScenario } from "@/lib/ui-debug/scenarios";
import styles from "./page.module.css";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const debugScenario = resolveProfileScenario(params, isUiDebugEnabled(process.env.NODE_ENV));

  if (debugScenario) {
    return (
      <main className={styles.page} data-debug-scenario={debugScenario.activeId}>
        <ProfileHydrationView model={debugScenario.model} />
        <UiStateBrowser items={debugScenario.items} />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <ProfileHydrationFlow />
    </main>
  );
}
