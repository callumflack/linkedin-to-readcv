import type { ReadCvCollectionItem, ReadCvData } from "@/types/readcv";
import { contactAddendum } from "@/data/contacts";

type LinkedInProfile = {
  about?: string;
  fullName?: string;
  headline?: string;
  location?: string;
  profilePictureUrl?: string;
  profileUrl?: string;
};

type LinkedInExperience = {
  companyName?: string;
  dates?: string;
  description?: string;
  jobTitle?: string;
  location?: string;
};

type LinkedInEducation = {
  degree?: string;
  schoolName?: string;
  years?: string;
};

type LinkedInSkill = {
  name?: string;
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

function formatBylineLocation(location?: string): string {
  const raw = clean(location);
  if (!raw) return "";

  const parts = raw.split(",").map((part) => clean(part)).filter(Boolean);
  if (parts.length === 3 && /^australia$/i.test(parts[2])) {
    return `${parts[0]}, ${parts[2]}`;
  }

  return raw;
}

function mapExperienceItems(experiences: LinkedInExperience[] = []): ReadCvCollectionItem[] {
  return experiences.map((item, index) => {
    const jobTitle = clean(item.jobTitle);
    const companyName = clean(item.companyName);
    const heading = compact([jobTitle, companyName ? `at ${companyName}` : ""]).join(" ");

    return {
      id: `exp-${index}`,
      year: formatDateRangeToYearRange(item.dates),
      heading: heading || companyName || "Experience",
      location: clean(item.location) || null,
      description: clean(item.description) || null,
      attachments: [],
    };
  });
}

function mapEducationItems(education: LinkedInEducation[] = []): ReadCvCollectionItem[] {
  return education.map((item, index) => {
    const schoolName = clean(item.schoolName);
    const degree = clean(item.degree);
    const heading = degree
      ? compact([degree, schoolName ? `at ${schoolName}` : ""]).join(" ")
      : schoolName || "Education";

    return {
      id: `edu-${index}`,
      year: formatDateRangeToYearRange(item.years),
      heading,
      description: null,
      attachments: [],
    };
  });
}

function mapSkillItems(skills: LinkedInSkill[] = []): ReadCvCollectionItem[] {
  return skills.map((item, index) => ({
    id: `skill-${index}`,
    year: "",
    heading: clean(item.name) || "Skill",
    attachments: [],
  }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractScopes(source: LinkedInSource): LinkedInScopes {
  if (isRecord(source.data)) {
    return source.data as LinkedInScopes;
  }
  return {};
}

function scopeData<T>(scopeValue: unknown): T | undefined {
  if (!isRecord(scopeValue)) return undefined;

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

export function mapLinkedInToReadcv(source: LinkedInSource): ReadCvData {
  // Canonical contract: personal server response envelope { data: { "linkedin.*": { data: ... } } }.
  const scopes = extractScopes(source);

  const profile = (scopeData<LinkedInProfile>(scopes["linkedin.profile"]) ?? {}) as LinkedInProfile;
  const experiences = arrayFromScope<LinkedInExperience>(scopes["linkedin.experience"], "experiences");
  const education = arrayFromScope<LinkedInEducation>(scopes["linkedin.education"], "education");
  const skills = arrayFromScope<LinkedInSkill>(scopes["linkedin.skills"], "skills");

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
