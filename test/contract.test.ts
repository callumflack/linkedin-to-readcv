import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AccessNotApprovedError,
  PaymentRequiredError,
  PersonalServerReadError,
} from "@opendatalabs/vana-sdk/server";
import { LINKEDIN_PROFILE_FIXTURE } from "../src/data/linkedin-profile.fixture";
import { mapLinkedInProfile } from "../src/lib/linkedin-profile";
import { resolveAppUrl } from "../src/lib/vana/app-url";
import {
  createRequestBinding,
  readRequestBinding,
  requestBindingCookieName,
  setRequestBindingCookie,
} from "../src/lib/vana/binding";
import { assertLinkedInReadReady } from "../src/lib/vana/capability";
import { mapClientError } from "../src/lib/vana/errors";
import { jsonNoStore } from "../src/lib/vana/response";
import { resolveLaunchRuntime } from "../src/lib/vana/runtime";

const SECRET = `0x${"1".repeat(64)}`;
const ORIGIN = "https://snapshot.example";

test("maps the sample linkedin.profile fixture into the ReadCV contract", () => {
  const cv = mapLinkedInProfile(LINKEDIN_PROFILE_FIXTURE);
  assert.equal(cv.general.displayName, "Alex Rivera");
  assert.equal(
    cv.general.byline,
    "Product engineer building useful data tools in Melbourne, Australia",
  );
  assert.equal(cv.general.profilePhoto, "https://example.com/alex-rivera.jpg");
  assert.deepEqual(cv.allCollections.map((collection) => collection.name), [
    "Contact",
    "Work Experience",
    "Education",
    "Skills",
  ]);
  assert.deepEqual(pickContractFields(cv.allCollections[1]?.items[0]), {
    id: "exp-0",
    year: "2022 — Present",
    heading: "Staff Product Engineer at Northwind Labs",
    location: null,
    description: null,
    attachments: [],
  });
  assert.equal(cv.allCollections[2]?.items[0]?.heading, "Bachelor of Science, Computing at University of Melbourne");
  assert.deepEqual(
    cv.allCollections[3]?.items.map((item) => item.heading),
    ["TypeScript", "Product engineering", "Data systems", "Design systems"],
  );
});

test("maps a raw direct-flow linkedin.profile payload through the app-owned mapper", () => {
  const cv = mapLinkedInProfile({
    fullName: "Grace Hopper",
    headline: "Computer scientist",
    positions: [{ role: "Admiral", companyName: "US Navy", startDate: "1943" }],
    educations: [{ institution: "Yale", degree: "PhD" }],
    skills: [{ title: "Compilers" }, " COBOL "],
  });

  assert.equal(cv.general.displayName, "Grace Hopper");
  assert.deepEqual(pickContractFields(cv.allCollections[1]?.items[0]), {
    id: "exp-0",
    year: "1943 — Present",
    heading: "Admiral at US Navy",
    location: null,
    description: null,
    attachments: [],
  });
  assert.equal(cv.allCollections[2]?.items[0]?.heading, "PhD at Yale");
  assert.deepEqual(cv.allCollections[3]?.items.map((item) => item.heading), ["Compilers", "COBOL"]);
});

test("strictly validates and resolves launch runtime", () => {
  assert.deepEqual(resolveLaunchRuntime(new URLSearchParams()), {
    env: "production",
    network: "mainnet",
  });
  assert.deepEqual(resolveLaunchRuntime(new URLSearchParams("network=moksha")), {
    env: "production",
    network: "moksha",
  });
  assert.deepEqual(resolveLaunchRuntime(new URLSearchParams("vana_env=dev")), {
    env: "dev",
    network: "moksha",
  });
  assert.throws(() => resolveLaunchRuntime(new URLSearchParams("vana_env=production")), /Invalid vana_env/);
  assert.throws(() => resolveLaunchRuntime(new URLSearchParams("network=testnet")), /Invalid network/);
  assert.throws(() => resolveLaunchRuntime(new URLSearchParams("vana_env=dev&network=mainnet")), /only supports/);
  assert.throws(() => resolveLaunchRuntime(new URLSearchParams("network=moksha&network=mainnet")), /only be provided once/);
});

test("derives a fixed return URL from VANA_APP_URL origin", () => {
  assert.deepEqual(resolveAppUrl("https://snapshot.example/some/path?caller=ignored"), {
    appUrl: "https://snapshot.example/some/path?caller=ignored",
    returnOrigin: ORIGIN,
    returnUrl: `${ORIGIN}/connect/return`,
  });
  assert.throws(() => resolveAppUrl("javascript:alert(1)"), /HTTP or HTTPS/);
});

test("keeps concurrent request bindings independent and rejects tampering", () => {
  const now = 1_000;
  const runtime = { env: "dev", network: "moksha" } as const;
  const cookies = new Map<string, { value: string; options: Record<string, unknown> }>();
  const writer = {
    set(name: string, value: string, options: Record<string, unknown>) {
      cookies.set(name, { value, options });
    },
  };
  const reader = {
    get(name: string) {
      const cookie = cookies.get(name);
      return cookie ? { value: cookie.value } : undefined;
    },
  };

  for (const requestId of ["dcr_one", "dcr_two"]) {
    const binding = createRequestBinding({ requestId, runtime, returnOrigin: ORIGIN, now }, SECRET);
    setRequestBindingCookie(writer, requestId, binding, true);
  }

  assert.equal(cookies.size, 2);
  assert.deepEqual(cookies.get(requestBindingCookieName("dcr_one"))?.options, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
  });
  assert.equal(readRequestBinding(reader, { requestId: "dcr_one", returnOrigin: ORIGIN, now: now + 1 }, SECRET)?.runtime.env, "dev");
  assert.equal(readRequestBinding(reader, { requestId: "dcr_two", returnOrigin: ORIGIN, now: now + 1 }, SECRET)?.runtime.network, "moksha");
  assert.equal(readRequestBinding(reader, { requestId: "dcr_missing", returnOrigin: ORIGIN, now: now + 1 }, SECRET), null);
  assert.equal(readRequestBinding(reader, { requestId: "dcr_one", returnOrigin: "https://evil.example", now: now + 1 }, SECRET), null);
  assert.equal(readRequestBinding(reader, { requestId: "dcr_one", returnOrigin: ORIGIN, now: now + 1 }, `${SECRET}bad`), null);

  const cookieName = requestBindingCookieName("dcr_one");
  const original = cookies.get(cookieName);
  assert.ok(original);
  cookies.set(cookieName, { ...original, value: `${original.value.slice(0, -1)}x` });
  assert.equal(readRequestBinding(reader, { requestId: "dcr_one", returnOrigin: ORIGIN, now: now + 1 }, SECRET), null);

  cookies.set(cookieName, original);
  assert.equal(readRequestBinding(reader, { requestId: "dcr_one", returnOrigin: ORIGIN, now: now + 11 * 60 * 1000 }, SECRET), null);
});

test("blocks reads until the requested linkedin.profile capability is ready", () => {
  assert.doesNotThrow(() => assertLinkedInReadReady({ status: "ready_for_read", scope: "linkedin.profile" }));
  assert.throws(() => assertLinkedInReadReady({ status: "pending" }), AccessNotApprovedError);
  assert.throws(() => assertLinkedInReadReady({ status: "approved", scope: "linkedin.skills" }), AccessNotApprovedError);
});

test("maps SDK and unknown failures to sanitized client errors", () => {
  const paymentError = mapClientError(
    new PaymentRequiredError("private payment detail", { secret: true }),
  );
  assert.deepEqual(paymentError, {
    kind: "payment_required",
    error: "Your LinkedIn profile could not be loaded. Try again.",
    status: 402,
  });
  assert.doesNotMatch(paymentError.error, /escrow|fund|app identity/i);
  assert.deepEqual(mapClientError(new AccessNotApprovedError("private status detail")), {
    kind: "not_ready",
    error: "The approved LinkedIn profile is not ready to read.",
    status: 409,
  });
  assert.deepEqual(mapClientError(new PersonalServerReadError("private upstream detail", 502)), {
    kind: "unavailable",
    error: "The Personal Server is temporarily unavailable.",
    status: 503,
  });
  assert.deepEqual(mapClientError(new Error("private internal detail")), {
    kind: "failed",
    error: "The Vana request failed.",
    status: 500,
  });
});

test("marks JSON responses as non-cacheable", async () => {
  const response = jsonNoStore(
    { error: "Sanitized failure" },
    { status: 503, headers: { "Cache-Control": "public, max-age=60" } },
  );

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { error: "Sanitized failure" });
});

function pickContractFields(value: Record<string, unknown> | undefined) {
  assert.ok(value);
  return {
    id: value.id,
    year: value.year,
    heading: value.heading,
    location: value.location,
    description: value.description,
    attachments: value.attachments,
  };
}
