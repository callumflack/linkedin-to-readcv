"use client";

import { useDirectVanaConnect } from "@opendatalabs/vana-sdk/react";
import { useEffect, useMemo, useState } from "react";
import ArrowRight12 from "@/components/readcv/ArrowRight12";
import Profile from "@/components/readcv/Profile";
import { LINKS } from "@/constants/links";
import type { ReadCvData } from "@/types/readcv";
import readcvStyles from "@/components/readcv/Profile.module.css";
import Image from "next/image";
import styles from "./ProfileHydrationFlow.module.css";

type HydrationStage =
  | "idle"
  | "waiting"
  | "hydrating"
  | "ready"
  | "error";

const LOADING_FRAMES = ["", ".", "..", "..."];

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
        ? body.error
        : `${response.status} from ${path}`;
    throw new Error(message);
  }

  return body as T;
}

function withLaunchParams(path: string): string {
  const launch = new URLSearchParams();
  const current = new URLSearchParams(window.location.search);
  const vanaEnv = current.get("vana_env");
  const network = current.get("network");
  if (vanaEnv) launch.set("vana_env", vanaEnv);
  if (network) launch.set("network", network);

  const query = launch.toString();
  return query ? `${path}${path.includes("?") ? "&" : "?"}${query}` : path;
}

export default function ProfileHydrationFlow() {
  const connect = useDirectVanaConnect<ReadCvData>({
    createRequest: () =>
      jsonFetch(withLaunchParams("/api/vana/request"), { method: "POST" }),
    getStatus: (requestId) =>
      jsonFetch(`/api/vana/status?requestId=${encodeURIComponent(requestId)}`),
    readResult: (requestId) =>
      jsonFetch(`/api/vana/read?requestId=${encodeURIComponent(requestId)}`),
  });
  const [frameIndex, setFrameIndex] = useState(0);
  const cv = connect.state.type === "done" ? connect.state.result.data : null;

  const stage: HydrationStage = useMemo(() => {
    if (cv) return "ready";
    if (connect.state.type === "error" || connect.state.type === "done") return "error";
    if (connect.state.type === "reading") return "hydrating";
    if (connect.state.type === "creating" || connect.state.type === "awaiting_approval") {
      return "waiting";
    }
    return "idle";
  }, [cv, connect.state.type]);

  useEffect(() => {
    if (stage === "waiting" || stage === "hydrating") {
      const timer = window.setInterval(() => {
        setFrameIndex((current) => (current + 1) % LOADING_FRAMES.length);
      }, 350);
      return () => window.clearInterval(timer);
    }

    setFrameIndex(0);
    return undefined;
  }, [stage]);

  if (stage === "ready" && cv) {
    return <Profile cv={cv} />;
  }

  if (stage === "error") {
    const errorMessage =
      connect.state.type === "error"
        ? connect.state.error.message
        : "The connection was interrupted.";

    return (
      <section className={styles.shell}>
        <h1 className={styles.stateTitle}>Could not load your profile</h1>
        <p className={styles.stateBody}>{errorMessage}</p>
        <button
          type="button"
          onClick={() => {
            connect.reset();
          }}
          className={styles.ctaButton}
        >
          Try again
        </button>
      </section>
    );
  }
  const isWaitingCta = stage === "waiting" || stage === "hydrating";

  return (
    <section className={readcvStyles.profile}>
      <div className={readcvStyles.profileHeader}>
        <div className={readcvStyles.profilePhoto}>
          <Image src="/harold.png" alt="Hide the Pain Harold" width={92} height={92} />
        </div>
        <div className={readcvStyles.profileInfo}>
          <h1>Own your LinkedIn profile</h1>
          <div className={`${readcvStyles.byline} ${styles.oneLineByline}`}>Export your LinkedIn and format it like ReadCV.</div>
          {/* <a
            className={readcvStyles.website}
            href={LINKS.dataconnect}
            target="_blank"
            rel="noreferrer"
          >
            vana.org/dataconnect
          </a> */}
        </div>
      </div>

      <section className={`${readcvStyles.profileSection} ${readcvStyles.about}`}>
        <h3>About</h3>
        <div className={readcvStyles.description}>
          <p>
            Personal data should be user-controlled, portable, and reusable across apps.{" "}
            <a href={LINKS.dataconnect} target="_blank" rel="noreferrer">
              Vana
            </a>{" "}
            lets you approve a verifiable data request once, so now you can render your LI as ReadCV intended.
          </p>
        </div>
      </section>

      <section className={readcvStyles.profileSection}>
        <h3>Contact</h3>
        <div className={readcvStyles.contacts}>
          <div className={readcvStyles.experience}>
            <div className={readcvStyles.year}>
              <span>Personal Data</span>
            </div>
            <div className={readcvStyles.experienceContent}>
              <div className={readcvStyles.title}>Your data stays yours. Share it with apps you like.</div>
            </div>
          </div>

          <div className={readcvStyles.experience}>
            <div className={readcvStyles.year}>
              <span>Grant Control</span>
            </div>
            <div className={readcvStyles.experienceContent}>
              <div className={readcvStyles.title}>Approve and revoke access anytime in Vana.</div>
            </div>
          </div>

          <div className={readcvStyles.experience}>
            <div className={readcvStyles.year}>
              <span>Portable Identity</span>
            </div>
            <div className={readcvStyles.experienceContent}>
              <div className={readcvStyles.title}>Turn your LinkedIn into reusable context across apps.</div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.ctaBlock}>
        {isWaitingCta ? (
          <button type="button" className={`${styles.primaryCta} ${styles.primaryCtaDisabled}`} disabled>
            Waiting for approval{LOADING_FRAMES[frameIndex]}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              connect.start();
            }}
            className={styles.primaryCta}
          >
            Connect LinkedIn with Vana
            <span className={styles.ctaArrow}>
              <ArrowRight12 />
            </span>
          </button>
        )}
        {connect.state.type === "awaiting_approval" && connect.state.popupBlocked ? (
          <a
            href={connect.state.request.approvalUrl}
            target="_blank"
            rel="noreferrer"
            className={styles.secondaryCta}
          >
            Open approval
          </a>
        ) : null}
        {/* <a
          href={LINKS.dataconnectGithub}
          target="_blank"
          rel="noreferrer"
          className={styles.secondaryCta}
        >
          View DataConnect on GitHub
        </a> */}
        {isWaitingCta ? (
          <button
            type="button"
            className={styles.cancelLink}
            onClick={() => {
              window.location.reload();
            }}
          >
            (cancel)
          </button>
        ) : null}
      </div>
    </section>
  );
}
