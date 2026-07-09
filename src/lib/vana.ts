import { createDirectDataController } from "@opendatalabs/vana-sdk/server";
import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

// The controller is created lazily so `next build` can load this module without
// requiring VANA env vars at import time.
type Controller = ReturnType<typeof createDirectDataController>;

// Vana's apps page appends launch context to the app URL when it opens us:
//   ?vana_env=dev            → launched from a Vana DEV host (app-dev.vana.org).
//                              Absent on production (app.vana.org).
//   ?network=moksha|mainnet  → the protocol network to target.
// The DCR must be created on whatever env/network the launch came from — a DCR
// is env- and network-specific, so status/data reads must reuse the SAME
// controller as the request. Controllers are built lazily and cached per
// `${env}:${network}` so `next build` (no env vars) doesn't fail at import time.
const controllers = new Map<string, Controller>();
const REQUEST_BINDING_COOKIE_PREFIX = "vana_request_binding_";

const resilientPersonalServerFetch = async (
  input: string,
  init: { method: string; headers: Record<string, string> },
): Promise<Response> => {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await fetch(input, init);
      if (res.status !== 200) return res;
      const buf = await res.arrayBuffer();
      return new Response(buf, {
        status: 200,
        headers: {
          "content-type": res.headers.get("content-type") ?? "application/json",
        },
      });
    } catch (err) {
      lastErr = err;
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  throw lastErr;
};

export function getVana({
  vanaEnv,
  network,
}: {
  vanaEnv?: string | null;
  network?: string | null;
}): Controller {
  const appPrivateKey = process.env.VANA_APP_PRIVATE_KEY;
  const appUrl = process.env.VANA_APP_URL;

  if (!appPrivateKey) {
    throw new Error("Missing VANA_APP_PRIVATE_KEY.");
  }

  if (!appUrl) {
    throw new Error("Missing VANA_APP_URL.");
  }

  const { env, network: resolvedNetwork, endpoints } = resolveVanaControllerTarget({
    vanaEnv,
    network,
  });

  const key = `${env}:${resolvedNetwork}`;
  const cached = controllers.get(key);
  if (cached) return cached;

  const controller = createDirectDataController({
    env,
    network: resolvedNetwork,
    endpoints,
    appPrivateKey,
    app: {
      id: "linkedin-to-readcv",
      name: "ReadCV",
      homepageUrl: appUrl,
    },
    source: "linkedin",
    scopes: ["linkedin.profile"],
    personalServerFetch: resilientPersonalServerFetch,
  });

  controllers.set(key, controller);
  return controller;
}

export function resolveVanaControllerTarget({
  vanaEnv,
  network,
}: {
  vanaEnv?: string | null;
  network?: string | null;
}): {
  env: "dev" | "production";
  network: "moksha" | "mainnet";
  endpoints: { escrowGatewayUrl: string } | undefined;
} {
  const env = vanaEnv === "dev" ? "dev" : "production";
  const resolvedNetwork = env === "dev" ? "moksha" : network === "moksha" ? "moksha" : "mainnet";
  const endpoints =
    env === "production" && resolvedNetwork === "moksha"
      ? { escrowGatewayUrl: "https://dp-rpc-dev.vana.org" }
      : undefined;

  return { env, network: resolvedNetwork, endpoints };
}

export const getAppAddress = () => getVana({}).getAppAddress();

export function getAppUrl(): string {
  return process.env.VANA_APP_URL ?? "";
}

export function getAppPrivateKey(): string {
  const appPrivateKey = process.env.VANA_APP_PRIVATE_KEY;
  if (!appPrivateKey) {
    throw new Error("Missing VANA_APP_PRIVATE_KEY.");
  }
  return appPrivateKey;
}

function signingKey(): Buffer {
  return createHash("sha256").update(getAppPrivateKey()).digest();
}

export function makeRequestBinding(requestId: string): string {
  const payload = requestId;
  const signature = createHmac("sha256", signingKey()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function requestBindingCookieName(requestId: string): string {
  const requestHash = createHash("sha256").update(requestId).digest("base64url");
  return `${REQUEST_BINDING_COOKIE_PREFIX}${requestHash}`;
}

export function setRequestBindingCookie(response: NextResponse, binding: string): void {
  const separatorIndex = binding.lastIndexOf(".");
  const requestId = binding.slice(0, separatorIndex);
  response.cookies.set(requestBindingCookieName(requestId), binding, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export function isRequestBindingAllowed(request: NextRequest, requestId: string): boolean {
  const binding = request.cookies.get(requestBindingCookieName(requestId))?.value;
  if (!binding) return false;

  const separatorIndex = binding.lastIndexOf(".");
  const boundRequestId = binding.slice(0, separatorIndex);
  const signature = binding.slice(separatorIndex + 1);
  if (!boundRequestId || !signature || boundRequestId !== requestId) return false;

  const expected = createHmac("sha256", signingKey()).update(boundRequestId).digest("base64url");
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(signature);
  return (
    expectedBytes.length === providedBytes.length &&
    timingSafeEqual(expectedBytes, providedBytes)
  );
}
