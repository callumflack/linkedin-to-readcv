import { getAppUrl, getVana, makeRequestBinding, setRequestBindingCookie } from "@/lib/vana";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const vana = getVana({
    vanaEnv: params.get("vana_env"),
    network: params.get("network"),
  });

  const accessRequest = await vana.createAccessRequest({
    returnUrl: `${getAppUrl()}/connect/return`,
  });

  const response = NextResponse.json(accessRequest);
  setRequestBindingCookie(response, makeRequestBinding(accessRequest.requestId));
  return response;
}
