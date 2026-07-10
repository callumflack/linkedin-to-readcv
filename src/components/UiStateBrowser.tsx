import type { ScenarioBrowserItem } from "@/lib/ui-debug/scenarios";
import styles from "./UiStateBrowser.module.css";

type UiStateBrowserProps = {
  items: ScenarioBrowserItem[];
};

export default function UiStateBrowser({ items }: UiStateBrowserProps) {
  return (
    <aside className={styles.browser} aria-label="UI state browser">
      <p className={styles.eyebrow}>UI debug — fixtures, not real data</p>
      <nav className={styles.states} aria-label="Preview UI state">
        {items.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className={item.active ? styles.activeState : styles.state}
            aria-current={item.active ? "page" : undefined}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
