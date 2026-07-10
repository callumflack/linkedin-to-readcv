"use client";

import { useDirectVanaConnect } from "@opendatalabs/vana-sdk/react";
import { useEffect, useMemo, useState } from "react";
import ProfileHydrationView, {
  type ProfileHydrationViewModel,
} from "@/components/ProfileHydrationView";
import type { ReadCvData } from "@/types/readcv";

const LOADING_FRAMES = ["", ".", "..", "..."];

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
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
    createRequest: () => jsonFetch(withLaunchParams("/api/vana/request"), { method: "POST" }),
    getStatus: (requestId) =>
      jsonFetch(`/api/vana/status?requestId=${encodeURIComponent(requestId)}`),
    readResult: (requestId) =>
      jsonFetch(`/api/vana/read?requestId=${encodeURIComponent(requestId)}`),
  });
  const [frameIndex, setFrameIndex] = useState(0);
  const cv = connect.state.type === "done" ? connect.state.result.data : null;

  const model = useMemo<ProfileHydrationViewModel>(() => {
    if (cv) return { type: "ready", cv };

    if (connect.state.type === "error" || connect.state.type === "done") {
      return {
        type: "error",
        title: "Could not load your profile",
        message:
          connect.state.type === "error"
            ? connect.state.error.message
            : "The connection was interrupted.",
      };
    }

    if (connect.state.type === "reading") {
      return {
        type: "delivering",
        label: `Waiting for approval${LOADING_FRAMES[frameIndex]}`,
      };
    }

    if (connect.state.type === "creating" || connect.state.type === "awaiting_approval") {
      return {
        type: "waiting",
        label: `Waiting for approval${LOADING_FRAMES[frameIndex]}`,
        approvalUrl:
          connect.state.type === "awaiting_approval" && connect.state.popupBlocked
            ? connect.state.request.approvalUrl
            : undefined,
      };
    }

    return { type: "idle" };
  }, [cv, connect.state, frameIndex]);

  useEffect(() => {
    if (model.type === "waiting" || model.type === "delivering") {
      const timer = window.setInterval(() => {
        setFrameIndex((current) => (current + 1) % LOADING_FRAMES.length);
      }, 350);
      return () => window.clearInterval(timer);
    }

    setFrameIndex(0);
    return undefined;
  }, [model.type]);

  return (
    <ProfileHydrationView
      model={model}
      actions={{
        onStart: () => connect.start(),
        onReset: () => connect.reset(),
        onCancel: () => connect.reset(),
      }}
    />
  );
}
