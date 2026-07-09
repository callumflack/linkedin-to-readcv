import ProfileHydrationFlow from "@/components/ProfileHydrationFlow";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <ProfileHydrationFlow />
    </main>
  );
}
