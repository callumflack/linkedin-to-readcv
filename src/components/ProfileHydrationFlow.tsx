"use client";

import { useDirectVanaConnect } from "@opendatalabs/vana-sdk/react";
import { useEffect, useMemo, useState } from "react";
import ArrowRight12 from "@/components/readcv/ArrowRight12";
import Profile from "@/components/readcv/Profile";
import { mapLinkedInToReadcv } from "@/lib/mapLinkedInToReadcv";
import { LINKS } from "@/constants/links";
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

function asMappableSource(value: unknown): { data?: unknown } | null {
  if (typeof value !== "object" || value === null) return null;
  return value as { data?: unknown };
}

async function jsonFetch(path: string, init?: RequestInit) {
  const res = await fetch(path, init);
  if (!res.ok) {
    let message: string | undefined;
    try {
      const body: unknown = await res.json();
      if (typeof body === "object" && body !== null) {
        const errorBody = body as { error?: unknown; message?: unknown };
        const candidate = errorBody.error ?? errorBody.message;
        if (typeof candidate === "string" && candidate.trim()) {
          message = candidate;
        }
      }
    } catch {
      // Fall through to the status/path error when the response is not JSON.
    }
    throw new Error(message ?? `${res.status} from ${path}`);
  }
  return res.json();
}

function launchParams(): string {
  if (typeof window === "undefined") return "";
  const src = new URLSearchParams(window.location.search);
  const out = new URLSearchParams();
  const vanaEnv = src.get("vana_env");
  const network = src.get("network");
  if (vanaEnv) out.set("vana_env", vanaEnv);
  if (network) out.set("network", network);
  return out.toString();
}

function withLaunch(path: string): string {
  const lp = launchParams();
  if (!lp) return path;
  return path.includes("?") ? `${path}&${lp}` : `${path}?${lp}`;
}

export default function ProfileHydrationFlow() {
  const connect = useDirectVanaConnect({
    createRequest: () =>
      jsonFetch(withLaunch("/api/vana/request"), { method: "POST" }),
    getStatus: (requestId) =>
      jsonFetch(withLaunch(`/api/vana/status?requestId=${encodeURIComponent(requestId)}`)),
    readResult: (requestId) =>
      jsonFetch(withLaunch(`/api/vana/data?requestId=${encodeURIComponent(requestId)}`)),
  });

  const [frameIndex, setFrameIndex] = useState(0);

  const cv = useMemo(() => {
    if (connect.state.type !== "done") return null;

    const source = asMappableSource({
      data: {
        [connect.state.result.scope ?? "linkedin.profile"]: connect.state.result.data,
      },
    });
    if (!source) return null;

    try {
      return mapLinkedInToReadcv(source);
    } catch {
      return null;
    }
  }, [connect.state]);

  const stage: HydrationStage = useMemo(() => {
    if (cv) return "ready";
    if (connect.state.type === "error") return "error";
    if (connect.state.type === "done") return "error";
    if (connect.state.type === "reading") return "hydrating";
    if (connect.state.type === "creating" || connect.state.type === "awaiting_approval")
      return "waiting";
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
              void connect.start();
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
          View Vana on GitHub
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
