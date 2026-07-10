import linkedInSeed from "../../linkedin.json";
import { mapLinkedInToReadcv } from "@/lib/mapLinkedInToReadcv";

const mappedProfile = mapLinkedInToReadcv(linkedInSeed);

export const READCV_PROFILE_FIXTURE = {
  ...mappedProfile,
  general: {
    ...mappedProfile.general,
    profilePhoto: "/harold.png",
  },
};
