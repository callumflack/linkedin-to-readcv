import { isRequestBindingAllowed, getVana } from "@/lib/vana";
import {
  AccessNotApprovedError,
  DirectConfigError,
  PaymentRequiredError,
  PersonalServerReadError,
} from "@opendatalabs/vana-sdk/server";
import { NextRequest } from "next/server";

function describeCause(err: unknown, depth = 0): unknown {
  if (!err || depth > 5) return undefined;
  if (typeof err !== "object") return String(err);
  const e = err as { message?: string; code?: string; cause?: unknown };
  return {
    message: e.message,
    code: e.code,
    cause: e.cause ? describeCause(e.cause, depth + 1) : undefined,
  };
}

function networkErrorCode(err: unknown, depth = 0): string | undefined {
  if (!err || typeof err !== "object" || depth > 5) return undefined;
  const e = err as { code?: string; cause?: unknown };
  if (typeof e.code === "string" && /^E[A-Z]+$/.test(e.code)) return e.code;
  return networkErrorCode(e.cause, depth + 1);
}

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const requestId = params.get("requestId");

  if (!requestId) {
    return Response.json(
      { error: "Missing requestId", kind: "bad_request" },
      { status: 400 },
    );
  }

  if (!isRequestBindingAllowed(request, requestId)) {
    return Response.json(
      { kind: "forbidden", error: "This request is not available in the current browser session." },
      { status: 403 },
    );
  }

  const vana = getVana({
    vanaEnv: params.get("vana_env"),
    network: params.get("network"),
  });

  try {
    const result = await vana.readApprovedData({ requestId });
    return Response.json(result);
  } catch (err) {
    const base = {
      requestId,
      name: err instanceof Error ? err.name : "UnknownError",
      message: err instanceof Error ? err.message : String(err),
      code: (err as { code?: string } | null)?.code,
      cause: describeCause((err as { cause?: unknown } | null)?.cause),
      stack: err instanceof Error ? err.stack : undefined,
    };

    let httpStatus = 500;
    let kind = "internal_error";
    let details: Record<string, unknown> | undefined;
    const netCode = networkErrorCode(err);

    if (err instanceof PaymentRequiredError) {
      httpStatus = 402;
      kind = "payment_required";
      details = err.details;
    } else if (err instanceof AccessNotApprovedError) {
      httpStatus = 403;
      kind = "not_approved";
      details = err.details;
    } else if (err instanceof PersonalServerReadError) {
      httpStatus = err.status && err.status >= 400 ? err.status : 502;
      kind = "personal_server_read_failed";
      details = err.details;
    } else if (err instanceof DirectConfigError) {
      httpStatus = 500;
      kind = "config_error";
      details = err.details;
    } else if (netCode) {
      httpStatus = 502;
      kind = "personal_server_unreachable";
      details = {
        networkCode: netCode,
        hint: "The Personal Server isn't reachable. Open/refresh the browser tab hosting the PS so it reconnects to the relay, then retry.",
      };
    }

    console.error(
      `[vana/data] read failed for requestId=${requestId} -> ${httpStatus} ${kind}`,
      { ...base, details },
    );

    const clientError =
      kind === "payment_required"
        ? "Payment is required to complete this read."
        : kind === "not_approved"
          ? "The request was not approved."
          : kind === "personal_server_read_failed"
            ? "The Personal Server read failed."
            : kind === "personal_server_unreachable"
              ? "The Personal Server is unreachable."
              : kind === "config_error"
                ? "The Vana controller is misconfigured."
                : "Failed to read approved data.";

    return Response.json({ kind, error: clientError }, { status: httpStatus });
  }
}
