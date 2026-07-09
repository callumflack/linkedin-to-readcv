import { isRequestBindingAllowed, getVana } from "@/lib/vana";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const requestId = params.get("requestId");

  if (!requestId) {
    return Response.json({ error: "Missing requestId" }, { status: 400 });
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
  const status = await vana.getAccessRequestStatus(requestId);
  return Response.json(status);
}
