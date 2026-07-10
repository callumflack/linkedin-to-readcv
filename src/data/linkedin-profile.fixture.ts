export const LINKEDIN_PROFILE_FIXTURE = {
  data: {
    "linkedin.profile": {
      data: {
        fullName: "Alex Rivera",
        headline: "Product engineer building useful data tools",
        location: { city: "Melbourne", country: "Australia" },
        about: "Engineer focused on useful, user-owned data products.",
        profilePictureUrl: "https://example.com/alex-rivera.jpg",
        profileUrl: "https://www.linkedin.com/in/alex-rivera/",
        experience: [
          {
            title: "Staff Product Engineer",
            companyName: "Northwind Labs",
            startDate: "2022-04",
            endDate: null,
            isCurrent: true,
          },
          {
            title: "Senior Software Engineer",
            companyName: "Fieldwork",
            startDate: "2018-01",
            endDate: "2022-03",
          },
        ],
        education: [
          {
            schoolName: "University of Melbourne",
            degree: "Bachelor of Science, Computing",
            years: "2012 - 2015",
          },
        ],
        skills: ["TypeScript", "Product engineering", "Data systems", "Design systems"],
      },
    },
  },
} as const;
