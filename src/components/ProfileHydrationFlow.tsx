"use client";

import { useVanaData } from "@opendatalabs/connect/react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  | "approved_fetching"
  | "hydrating"
  | "ready"
  | "error";

const LOADING_FRAMES = ["", ".", "..", "..."];

function asMappableSource(value: unknown): { data?: unknown } | null {
  if (typeof value !== "object" || value === null) return null;
  return value as { data?: unknown };
}

export default function ProfileHydrationFlow() {
  const { status, data, error, connectUrl, initConnect, fetchData, isLoading } = useVanaData();
  const [frameIndex, setFrameIndex] = useState(0);
  const fetchStartedRef = useRef(false);
  const pendingWindowRef = useRef<Window | null>(null);
  const shouldAutoOpenConnectRef = useRef(false);
  const openedConnectUrlRef = useRef<string | null>(null);

  const cv = useMemo(() => {
    const source = asMappableSource(data);
    if (!source) return null;

    try {
      return mapLinkedInToReadcv(source);
    } catch {
      return null;
    }
  }, [data]);

  const stage: HydrationStage = useMemo(() => {
    if (cv) return "ready";
    if (status === "error" || status === "denied" || status === "expired") return "error";
    if (status === "approved") return isLoading ? "approved_fetching" : "hydrating";
    if (status === "connecting" || status === "waiting") return "waiting";
    return "idle";
  }, [cv, status, isLoading]);

  useEffect(() => {
    if (status === "approved" && data == null && !fetchStartedRef.current) {
      fetchStartedRef.current = true;
      void fetchData();
    }
  }, [status, data, fetchData]);

  useEffect(() => {
    if (status === "idle") {
      fetchStartedRef.current = false;
    }
  }, [status]);

  useEffect(() => {
    if (!connectUrl || !shouldAutoOpenConnectRef.current || openedConnectUrlRef.current === connectUrl) return;

    const pendingWindow = pendingWindowRef.current;
    if (pendingWindow && !pendingWindow.closed) {
      pendingWindow.location.href = connectUrl;
    } else {
      window.open(connectUrl, "_blank", "noopener,noreferrer");
    }

    openedConnectUrlRef.current = connectUrl;
    shouldAutoOpenConnectRef.current = false;
    pendingWindowRef.current = null;
  }, [connectUrl]);

  useEffect(() => {
    if (stage === "waiting" || stage === "approved_fetching" || stage === "hydrating") {
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
      status === "denied"
        ? "Data access was denied in DataConnect."
        : status === "expired"
          ? "The connect session expired before approval."
          : (error ?? "The connection was interrupted.");

    return (
      <section className={styles.shell}>
        <h1 className={styles.stateTitle}>Could not load your profile</h1>
        <p className={styles.stateBody}>{errorMessage}</p>
        <button
          type="button"
          onClick={() => {
            fetchStartedRef.current = false;
            void initConnect();
          }}
          className={styles.ctaButton}
        >
          Try again
        </button>
      </section>
    );
  }
  const isWaitingCta = stage === "waiting" || stage === "approved_fetching" || stage === "hydrating";

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
              DataConnect
            </a>{" "}
            lets you approve a verifiable grant once, so now you can render your LI as ReadCV intended.
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
              <div className={readcvStyles.title}>Approve and revoke access anytime in DataConnect.</div>
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
              shouldAutoOpenConnectRef.current = true;
              openedConnectUrlRef.current = null;
              pendingWindowRef.current = window.open("", "_blank");
              void initConnect();
            }}
            className={styles.primaryCta}
          >
            Connect LinkedIn with Vana
            <span className={styles.ctaArrow}>
              <ArrowRight12 />
            </span>
          </button>
        )}
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
