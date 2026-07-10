import type { ReadCvCollectionItem, ReadCvData } from "@/types/readcv";
import { contactAddendum } from "@/data/contacts";

type LinkedInProfile = {
  about?: string;
  fullName?: string;
  headline?: string;
  location?: unknown;
  profilePictureUrl?: string;
  profileUrl?: string;
};

type LinkedInExperience = {
  companyName?: string;
  company?: string;
  employer?: string;
  organization?: string;
  subtitle?: string;
  dates?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  jobTitle?: string;
  title?: string;
  position?: string;
  role?: string;
  location?: unknown;
};

type LinkedInEducation = {
  degree?: string;
  field?: string;
  fieldOfStudy?: string;
  schoolName?: string;
  school?: string;
  institution?: string;
  university?: string;
  years?: string;
  dates?: string;
  startDate?: string;
  endDate?: string;
};

type LinkedInSkill = {
  name?: string;
  skill?: string;
  title?: string;
};

type LinkedInProfileLite = LinkedInProfile & {
  experience?: unknown;
  experiences?: unknown;
  positions?: unknown;
  workExperience?: unknown;
  work_experience?: unknown;
  jobs?: unknown;
  education?: unknown;
  educations?: unknown;
  schools?: unknown;
  skills?: unknown;
  topSkills?: unknown;
  top_skills?: unknown;
  languages?: unknown;
};


type LinkedInScopes = {
  "linkedin.profile"?: unknown;
  "linkedin.experience"?: unknown;
  "linkedin.education"?: unknown;
  "linkedin.skills"?: unknown;
  "linkedin.languages"?: unknown;
};

type LinkedInSource = {
  data?: unknown;
};

type ScopeEnvelope<T> = {
  $schema?: string;
  version?: string;
  scope?: string;
  collectedAt?: string;
  data?: T;
};

function clean(value?: string): string {
  return (value ?? "").trim();
}

/**
 * Normalize LinkedIn-style date ranges to year-only display.
 *
 * Examples:
 * - "Aug 2007 - Dec 2010" -> "2007 — 2010"
 * - "2009 - 2009" -> "2009"
 * - "Oct 2025 - Present" -> "2025 — Present"
 */
function formatDateRangeToYearRange(raw?: string): string {
  const input = clean(raw);
  if (!input) return "";

  const split = input.split(/\s[-–—]\s/);
  if (split.length < 2) {
    const yearMatch = input.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? yearMatch[0] : input;
  }

  const [startRaw, endRaw] = split;

  const toYearToken = (value: string): string => {
    const part = clean(value);
    if (!part) return "";
    if (/^present$/i.test(part)) return "Present";

    const yearMatch = part.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? yearMatch[0] : part;
  };

  const start = toYearToken(startRaw);
  const end = toYearToken(endRaw);

  if (!start && !end) return input;
  if (!end || start === end) return start || end;
  if (!start) return end;
  return `${start} — ${end}`;
}

function compact<T>(values: Array<T | null | undefined | false>): T[] {
  return values.filter(Boolean) as T[];
}

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringFrom(value: unknown): string {
  return typeof value === "string" ? clean(value) : "";
}

function firstString(record: object, keys: string[]): string {
  const source = record as Record<string, unknown>;
  for (const key of keys) {
    const candidate = source[key];
    if (typeof candidate === "string") {
      const cleaned = clean(candidate);
      if (cleaned) return cleaned;
    }
  }
  return "";
}

function locationLabel(value: unknown): string {
  if (typeof value === "string") return clean(value);
  if (!isStringRecord(value)) return "";

  const named = firstString(value, ["name", "default", "full", "locationName"]);
  if (named) return named;

  const city = firstString(value, ["city"]);
  const region = firstString(value, ["region", "state"]);
  const country = firstString(value, ["country"]);
  const parts = compact([city, region, country]);

  if (parts.length === 3 && /^australia$/i.test(parts[2])) {
    return `${parts[0]}, ${parts[2]}`;
  }

  return parts.join(", ");
}

function formatWebsiteLabel(url?: string): string {
  const raw = clean(url);
  if (!raw) return "";
  return raw.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
}

function formatContactHandle(url?: string): string {
  const raw = clean(url);
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname.replace(/^\/+|\/+$/g, "");
    if (host.includes("twitter.com") && path) return `@${path}`;
    if (host.includes("github.com") && path) return path;
    return host + (path ? `/${path}` : "");
  } catch {
    return formatWebsiteLabel(raw);
  }
}

function formatBylineLocation(location?: unknown): string {
  if (typeof location === "string") {
    const raw = clean(location);
    if (!raw) return "";

    const parts = raw.split(",").map((part) => clean(part)).filter(Boolean);
    if (parts.length === 3 && /^australia$/i.test(parts[2])) {
      return `${parts[0]}, ${parts[2]}`;
    }

    return raw;
  }

  return locationLabel(location);
}

function yearToken(value?: unknown): string {
  const raw = stringFrom(value);
  if (!raw) return "";
  if (/^present$/i.test(raw)) return "Present";

  const yearMatch = raw.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? yearMatch[0] : raw;
}

function formatYearRange(start?: unknown, end?: unknown, ongoing = false): string {
  const startToken = yearToken(start);
  const endToken = yearToken(end);
  const normalizedEnd = endToken || (ongoing && startToken ? "Present" : "");

  if (!startToken && !normalizedEnd) return "";
  if (!startToken) return normalizedEnd;
  if (!normalizedEnd || startToken === normalizedEnd) return startToken;
  return `${startToken} — ${normalizedEnd}`;
}

function mapExperienceItems(experiences: LinkedInExperience[] = []): ReadCvCollectionItem[] {
  return experiences.map((item, index) => {
    const jobTitle = firstString(item, ["jobTitle", "title", "position", "role"]);
    const companyName = firstString(item, [
      "companyName",
      "company",
      "employer",
      "organization",
      "subtitle",
    ]);
    const heading = compact([jobTitle, companyName ? `at ${companyName}` : ""]).join(" ");
    const year =
      formatDateRangeToYearRange(item.dates) || formatYearRange(item.startDate, item.endDate, true);

    return {
      id: `exp-${index}`,
      year,
      heading: heading || companyName || "Experience",
      location: locationLabel(item.location) || null,
      description: clean(item.description) || null,
      attachments: [],
    };
  });
}

function mapEducationItems(education: LinkedInEducation[] = []): ReadCvCollectionItem[] {
  return education.map((item, index) => {
    const schoolName = firstString(item, ["schoolName", "school", "institution", "university"]);
    const degree = firstString(item, ["degree"]);
    const heading = degree
      ? compact([degree, schoolName ? `at ${schoolName}` : ""]).join(" ")
      : schoolName || "Education";

    const year =
      formatDateRangeToYearRange(item.years) || formatYearRange(item.startDate, item.endDate);

    return {
      id: `edu-${index}`,
      year,
      heading,
      description: null,
      attachments: [],
    };
  });
}

function mapSkillItems(skills: Array<LinkedInSkill | string> = []): ReadCvCollectionItem[] {
  return skills.map((item, index) => {
    const heading =
      typeof item === "string"
        ? clean(item)
        : firstString(item, ["name", "skill", "title"]);

    return {
      id: `skill-${index}`,
      year: "",
      heading: heading || "Skill",
      attachments: [],
    };
  });
}

function extractScopes(source: LinkedInSource): LinkedInScopes {
  if (isStringRecord(source.data)) {
    return source.data as LinkedInScopes;
  }
  return {};
}

function scopeData<T>(scopeValue: unknown): T | undefined {
  if (!isStringRecord(scopeValue)) return undefined;

  if ("data" in scopeValue) {
    const envelope = scopeValue as ScopeEnvelope<T>;
    if (envelope.data !== undefined) {
      return envelope.data;
    }
  }

  return scopeValue as T;
}

function arrayFromScope<T>(scopeValue: unknown, key: string): T[] {
  const payload = scopeData<Record<string, unknown>>(scopeValue);
  if (!payload) return [];
  const value = payload[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

function arrayFromProfile<T>(profile: Record<string, unknown>, keys: string[]): T[] {
  for (const key of keys) {
    const value = profile[key];
    if (Array.isArray(value)) return value as T[];
  }
  return [];
}

export function mapLinkedInToReadcv(source: LinkedInSource): ReadCvData {
  // Canonical contract: personal server response envelope { data: { "linkedin.*": { data: ... } } }.
  const scopes = extractScopes(source);

  const profile = (scopeData<LinkedInProfileLite>(scopes["linkedin.profile"]) ?? {}) as LinkedInProfileLite;

  const experiencesFromScope = arrayFromScope<LinkedInExperience>(
    scopes["linkedin.experience"],
    "experiences",
  );
  const experiences =
    experiencesFromScope.length > 0
      ? experiencesFromScope
      : arrayFromProfile<LinkedInExperience>(profile, [
          "experience",
          "experiences",
          "positions",
          "workExperience",
          "work_experience",
          "jobs",
        ]);

  const educationFromScope = arrayFromScope<LinkedInEducation>(scopes["linkedin.education"], "education");
  const education =
    educationFromScope.length > 0
      ? educationFromScope
      : arrayFromProfile<LinkedInEducation>(profile, ["education", "educations", "schools"]);

  const skillsFromScope = arrayFromScope<LinkedInSkill>(scopes["linkedin.skills"], "skills");
  const skills =
    skillsFromScope.length > 0
      ? skillsFromScope
      : arrayFromProfile<LinkedInSkill | string>(profile, ["skills", "topSkills", "top_skills"]);

  const byline = compact([clean(profile.headline), formatBylineLocation(profile.location)]).join(" in ");
  const linkedInUrl = clean(profile.profileUrl);
  const primaryWebsiteUrl = clean(contactAddendum.website) || linkedInUrl;
  const xUrl = clean(contactAddendum.x);
  const githubUrl = clean(contactAddendum.github);

  const allCollections = compact([
    {
      name: "Contact",
      items: compact([
        primaryWebsiteUrl
          ? {
              id: "contact-website",
              platform: "Website",
              handle: formatWebsiteLabel(primaryWebsiteUrl),
              url: primaryWebsiteUrl,
            }
          : null,
        xUrl
          ? {
              id: "contact-x",
              platform: "X",
              handle: formatContactHandle(xUrl),
              url: xUrl,
            }
          : null,
        githubUrl
          ? {
              id: "contact-github",
              platform: "GitHub",
              handle: formatContactHandle(githubUrl),
              url: githubUrl,
            }
          : null,
        linkedInUrl
          ? {
              id: "contact-linkedin",
              platform: "LinkedIn",
              handle: formatWebsiteLabel(linkedInUrl),
              url: linkedInUrl,
            }
          : null,
      ]),
    },
    experiences.length ? { name: "Work Experience", items: mapExperienceItems(experiences) } : null,
    education.length ? { name: "Education", items: mapEducationItems(education) } : null,
    skills.length ? { name: "Skills", items: mapSkillItems(skills) } : null,
  ]);

  return {
    general: {
      profilePhoto: clean(profile.profilePictureUrl),
      displayName: clean(profile.fullName) || "LinkedIn Profile",
      byline: byline || clean(profile.headline),
      website: formatWebsiteLabel(primaryWebsiteUrl),
      websiteURL: primaryWebsiteUrl,
      about: clean(profile.about),
    },
    allCollections,
  };
}
