import { mapLinkedInToReadcv } from "@/lib/mapLinkedInToReadcv";
import type { ReadCvData } from "@/types/readcv";

type LinkedInSource = {
  data?: unknown;
};

export function mapLinkedInProfile(input: unknown): ReadCvData {
  if (isLinkedInEnvelope(input)) {
    return mapLinkedInToReadcv(input);
  }

  return mapLinkedInToReadcv({
    data: {
      "linkedin.profile": {
        data: input,
      },
    },
  });
}

function isLinkedInEnvelope(input: unknown): input is LinkedInSource {
  if (!isRecord(input) || !isRecord(input.data)) return false;
  return "linkedin.profile" in input.data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
