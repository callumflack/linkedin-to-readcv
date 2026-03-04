"use client";

// useVanaData() manages the full connect → poll → fetch-data lifecycle.
// initConnect() starts a session, the hook polls until approved, then
// fetchData() calls /api/data with the grant to retrieve user data.

import type { ConnectionStatus } from "@opendatalabs/connect/core";
import { useVanaData } from "@opendatalabs/connect/react";
import { useEffect, useRef } from "react";
import styles from "./ConnectFlow.module.css";

const STATUS_DISPLAY: Record<
  ConnectionStatus,
  { dot: string; label: string; className: string }
> = {
  idle: { dot: "\u25CB", label: "Idle", className: styles.statusDefault },
  connecting: {
    dot: "\u25CB",
    label: "Connecting",
    className: styles.statusDefault,
  },
  waiting: {
    dot: "\u25CB",
    label: "Waiting for approval",
    className: styles.statusWaiting,
  },
  approved: { dot: "\u25CF", label: "Approved", className: styles.statusApproved },
  denied: { dot: "\u25CF", label: "Denied", className: styles.statusDenied },
  expired: { dot: "\u25CF", label: "Expired", className: styles.statusExpired },
  error: { dot: "\u25CF", label: "Error", className: styles.statusError },
};

export default function ConnectFlow() {
  const {
    status,
    grant,
    data,
    error,
    connectUrl,
    initConnect,
    fetchData,
    isLoading,
  } = useVanaData();

  const initRef = useRef(false);
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      void initConnect();
    }
  }, [initConnect]);

  const display = STATUS_DISPLAY[status];
  const sessionReady = !!connectUrl;
  const hasConnectFailure = !sessionReady && !!error;

  return (
    <div>
      {/* Launch button — shown until approved */}
      {status !== "approved" && (
        <div className={styles.card}>
          <div style={{ marginBottom: 20 }}>
            <div className={styles.fieldRow}>
              <span className={styles.label}>Status</span>
              <span className={`${styles.mono} ${display.className}`}>
                {display.dot} {display.label}
              </span>
            </div>
          </div>

          {sessionReady ? (
            <a
              href={connectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnPrimary}
              style={{
                display: "inline-block",
                boxSizing: "border-box",
                fontSize: 13,
                textDecoration: "none",
                textAlign: "center",
                width: "100%",
              }}
            >
              Connect with Vana
            </a>
          ) : (
            <button
              type="button"
              onClick={() => {
                void initConnect();
              }}
              disabled={isLoading}
              className={styles.btnPrimary}
              style={{ width: "100%" }}
            >
              {isLoading ? (
                <>
                  <span className={styles.spinner} /> Creating session...
                </>
              ) : hasConnectFailure ? (
                "Retry session"
              ) : (
                "Create session"
              )}
            </button>
          )}
        </div>
      )}

      {/* Grant details + data */}
      {status === "approved" && grant && (
        <div className={`${styles.card} ${styles.cardApproved}`}>
          <div style={{ marginBottom: 20 }}>
            <div className={styles.fieldRow}>
              <span className={styles.label}>Status</span>
              <span className={`${styles.mono} ${display.className}`}>
                {display.dot} {display.label}
              </span>
            </div>
          </div>

          <div className={styles.label}>Grant</div>
          <pre className={styles.preBlock}>{JSON.stringify(grant, null, 2)}</pre>

          <button
            type="button"
            onClick={fetchData}
            disabled={isLoading}
            className={styles.btnPrimary}
            style={{ marginTop: 16, width: "100%" }}
          >
            {isLoading ? "Fetching..." : "Fetch Data"}
          </button>

          {data != null && (
            <div style={{ marginTop: 16 }}>
              <div className={styles.label}>Response</div>
              <pre className={styles.preBlock} style={{ maxHeight: 400 }}>
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Errors */}
      {error && (
        <div className={`${styles.card} ${styles.cardError}`}>
          <p className={styles.textError} style={{ margin: 0 }}>
            {error}
          </p>
        </div>
      )}

      {/* Reset — reloads the page to start a fresh session */}
      {status !== "idle" && status !== "connecting" && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={styles.btnGhost}
          style={{ marginTop: 12 }}
        >
          Reset
        </button>
      )}
    </div>
  );
}
