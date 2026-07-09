import assert from "node:assert/strict";
import { test } from "node:test";
import linkedInSeed from "../linkedin.json";
import { mapLinkedInToReadcv } from "../src/lib/mapLinkedInToReadcv";
import {
  isRequestBindingAllowed,
  makeRequestBinding,
  resolveVanaControllerTarget,
  setRequestBindingCookie,
} from "../src/lib/vana";

test("maps the LinkedIn replica fixture into the current ReadCV contract", () => {
  const cv = mapLinkedInToReadcv(linkedInSeed);

  assert.equal(
    cv.general.profilePhoto,
    "https://media.licdn.com/dms/image/v2/C4E03AQFx5MGH0JWROQ/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1534981698580?e=1774483200&v=beta&t=WxGluEB3uHIeqtYwXw1wr68hHfXH7Y81bHWCKyRw0Zg",
  );
  assert.equal(cv.general.displayName, "Callum Flack");
  assert.equal(cv.general.byline, "design + code in Cairns North, Australia");
  assert.equal(cv.general.website, "callum.website");
  assert.equal(cv.general.websiteURL, "https://www.callum.website/");
  assert.match(cv.general.about ?? "", /frontend engineer/);

  const sectionNames = cv.allCollections.map((collection) => collection.name);
  assert.deepEqual(sectionNames, ["Contact", "Work Experience", "Education", "Skills"]);
  assert.equal(sectionNames.includes("Languages"), false);

  const contact = cv.allCollections[0];
  assert.equal(contact.items.length, 4);
  assert.deepEqual(contact.items.map((item) => item.platform), [
    "Website",
    "X",
    "GitHub",
    "LinkedIn",
  ]);
  assert.deepEqual(contact.items.map((item) => item.handle), [
    "callum.website",
    "x.com/callumflack",
    "callumflack",
    "linkedin.com/in/callumflack",
  ]);

  const workExperience = cv.allCollections[1];
  assert.equal(workExperience.items.length, 20);
  assert.deepEqual(
    pickContractFields(workExperience.items[0]),
    {
      id: "exp-0",
      year: "2025 — Present",
      heading: "UI Designer + Design Engineer at Vana",
      location: null,
      description: null,
      attachments: [],
    },
  );

  const education = cv.allCollections[2];
  assert.equal(education.items.length, 2);
  assert.deepEqual(
    pickContractFields(education.items[0]),
    {
      id: "edu-0",
      year: "1995 — 1998",
      heading:
        "Bachelor of Visual Arts in Graphic Design, Graphic Design at Queensland College of Art, Griffith University (Morningside)",
      description: null,
      attachments: [],
    },
  );

  const skills = cv.allCollections[3];
  assert.equal(skills.items.length, 20);
  assert.deepEqual(
    pickContractFields(skills.items[0]),
    {
      id: "skill-0",
      year: "",
      heading: "Tailwind CSS",
      attachments: [],
    },
  );
});

test("maps the direct-flow linkedin.profile lite payload into the same ReadCV contract", () => {
  const cv = mapLinkedInToReadcv({
    data: {
      "linkedin.profile": {
        data: {
          fullName: "Alex Rivera",
          headline: "Founder & CEO at Northwind",
          location: { city: "Berlin", country: "Germany" },
          about: "Engineer turned founder.",
          profileUrl: "https://www.linkedin.com/in/alexrivera/",
          experience: [
            {
              title: "Founder & CEO",
              companyName: "Northwind",
              startDate: "2023-02",
              endDate: null,
            },
          ],
          education: [
            {
              school: "TU Munchen",
              degree: "M.Sc.",
              field: "Computer Science",
              years: "2011 - 2013",
            },
          ],
          skills: ["Distributed Systems", { name: "TypeScript" }],
          languages: ["English", "German"],
        },
      },
    },
  });

  assert.equal(cv.general.displayName, "Alex Rivera");
  assert.equal(cv.general.byline, "Founder & CEO at Northwind in Berlin, Germany");
  assert.deepEqual(cv.allCollections.map((collection) => collection.name), [
    "Contact",
    "Work Experience",
    "Education",
    "Skills",
  ]);
  assert.deepEqual(
    pickContractFields(cv.allCollections[1].items[0]),
    {
      id: "exp-0",
      year: "2023 — Present",
      heading: "Founder & CEO at Northwind",
      location: null,
      description: null,
      attachments: [],
    },
  );
  assert.equal(cv.allCollections[2].items[0].heading, "M.Sc. at TU Munchen");
  assert.deepEqual(
    cv.allCollections[3].items.map((item) => item.heading),
    ["Distributed Systems", "TypeScript"],
  );
});

test("uses the dev escrow gateway only for production requests on moksha", () => {
  assert.deepEqual(resolveVanaControllerTarget({ vanaEnv: "dev", network: "moksha" }), {
    env: "dev",
    network: "moksha",
    endpoints: undefined,
  });
  assert.deepEqual(resolveVanaControllerTarget({ network: "mainnet" }), {
    env: "production",
    network: "mainnet",
    endpoints: undefined,
  });
  assert.deepEqual(resolveVanaControllerTarget({ network: "moksha" }), {
    env: "production",
    network: "moksha",
    endpoints: { escrowGatewayUrl: "https://dp-rpc-dev.vana.org" },
  });
});

test("keeps concurrent Vana request bindings in independent signed cookies", () => {
  const mutableEnv = process.env as Record<string, string | undefined>;
  const previousPrivateKey = process.env.VANA_APP_PRIVATE_KEY;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.VANA_APP_PRIVATE_KEY = `0x${"1".repeat(64)}`;
  mutableEnv.NODE_ENV = "production";

  try {
    const cookies = new Map<string, { value: string; options: Record<string, unknown> }>();
    const response = {
      cookies: {
        set(name: string, value: string, options: Record<string, unknown>) {
          cookies.set(name, { value, options });
        },
      },
    };
    const firstBinding = makeRequestBinding("request-one");
    const secondBinding = makeRequestBinding("request-two");

    setRequestBindingCookie(response as never, firstBinding);
    setRequestBindingCookie(response as never, secondBinding);

    assert.equal(cookies.size, 2);
    for (const cookie of cookies.values()) {
      assert.deepEqual(cookie.options, {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
      });
    }

    const request = {
      cookies: {
        get(name: string) {
          const cookie = cookies.get(name);
          return cookie ? { value: cookie.value } : undefined;
        },
      },
    };
    assert.equal(isRequestBindingAllowed(request as never, "request-one"), true);
    assert.equal(isRequestBindingAllowed(request as never, "request-two"), true);
    assert.equal(isRequestBindingAllowed(request as never, "request-three"), false);

    const firstCookieName = [...cookies.entries()].find(
      ([, cookie]) => cookie.value === firstBinding,
    )?.[0];
    assert.ok(firstCookieName);
    cookies.set(firstCookieName, {
      value: secondBinding,
      options: cookies.get(firstCookieName)?.options ?? {},
    });
    assert.equal(isRequestBindingAllowed(request as never, "request-one"), false);
  } finally {
    if (previousPrivateKey === undefined) delete process.env.VANA_APP_PRIVATE_KEY;
    else process.env.VANA_APP_PRIVATE_KEY = previousPrivateKey;
    if (previousNodeEnv === undefined) delete mutableEnv.NODE_ENV;
    else mutableEnv.NODE_ENV = previousNodeEnv;
  }
});

function pickContractFields(value: Record<string, unknown>) {
  return stripUndefined({
    id: value.id,
    year: value.year,
    heading: value.heading,
    location: value.location,
    description: value.description,
    attachments: value.attachments,
  });
}

function stripUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as Partial<T>;
}
