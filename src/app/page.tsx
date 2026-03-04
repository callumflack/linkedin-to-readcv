import ConnectFlow from "@/components/ConnectFlow";
import ProfileHydrationFlow from "@/components/ProfileHydrationFlow";
// import { mapLinkedInToReadcv } from "@/lib/mapLinkedInToReadcv";
// import linkedInSeed from "../../linkedin.json";
import styles from "./page.module.css";

export default function Home() {
  // const cv = mapLinkedInToReadcv(linkedInSeed);
  const isDev = process.env.NODE_ENV === "development";

  return (
    <main className={styles.page}>
      {/* <Profile cv={cv} /> */}
      <ProfileHydrationFlow />
      {/* {isDev ? (
        <details className={styles.debugPanel}>
          <summary>Data Connect Debug</summary>
          <div className={styles.debugBody}>
            <ConnectFlow />
          </div>
        </details>
      ) : null} */}
    </main>
  );
}
