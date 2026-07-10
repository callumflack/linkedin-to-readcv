import assert from "node:assert/strict";
import { test } from "node:test";
import linkedInSeed from "../linkedin.json";
import { mapLinkedInToReadcv } from "../src/lib/mapLinkedInToReadcv";

test("preserves the replica LinkedIn payload as the finished ReadCV contract", () => {
  const cv = mapLinkedInToReadcv(linkedInSeed);

  assert.equal(cv.general.displayName, "Callum Flack");
  assert.equal(cv.general.byline, "design + code in Cairns North, Australia");
  assert.equal(cv.general.website, "callum.website");
  assert.match(cv.general.about ?? "", /frontend engineer/);

  assert.deepEqual(cv.allCollections.map((collection) => collection.name), [
    "Contact",
    "Work Experience",
    "Education",
    "Skills",
  ]);
  assert.deepEqual(
    cv.allCollections[0]?.items.map((item) => item.platform),
    ["Website", "X", "GitHub", "LinkedIn"],
  );
  assert.deepEqual(pickContractFields(cv.allCollections[1]?.items[0]), {
    id: "exp-0",
    year: "2025 — Present",
    heading: "UI Designer + Design Engineer at Vana",
    location: null,
    description: null,
    attachments: [],
  });
  assert.equal(
    cv.allCollections[2]?.items[0]?.heading,
    "Bachelor of Visual Arts in Graphic Design, Graphic Design at Queensland College of Art, Griffith University (Morningside)",
  );
  assert.equal(cv.allCollections[3]?.items[0]?.heading, "Tailwind CSS");
});

function pickContractFields(
  value:
    | {
        id?: string;
        year?: string;
        heading?: string;
        location?: string | null;
        description?: string | null;
        attachments?: unknown[];
      }
    | undefined,
) {
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
