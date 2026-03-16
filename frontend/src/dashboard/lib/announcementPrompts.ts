export type AnnouncementTargetAudience = "all" | "website" | "admin";

export type AnnouncementPromptDefaults = {
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  targetAudience: AnnouncementTargetAudience;
};

type CohortAnnouncementMode = "coming_soon" | "open" | "closed" | "running" | "completed" | "deleted";
type EventAnnouncementMode = "coming_up" | "completed";

function buildProgramPath(programSlug?: string | null, fallbackPath = "/programs") {
  const slug = String(programSlug || "").trim();
  return slug ? `/programs/${slug}` : fallbackPath;
}

export function buildCohortAnnouncementDefaults(input: {
  mode: CohortAnnouncementMode;
  cohortName: string;
  programName: string;
  programSlug?: string | null;
  cohortId?: number | null;
}): AnnouncementPromptDefaults {
  const cohortName = input.cohortName || (input.cohortId ? `Cohort #${input.cohortId}` : "This cohort");
  const programName = input.programName || "this program";
  const programPath = buildProgramPath(input.programSlug, "/programs");
  const cohortPath = input.cohortId ? `/cohorts/${input.cohortId}` : programPath;

  switch (input.mode) {
    case "open":
      return {
        title: `${cohortName} is now open`,
        body: `Applications are now open for ${cohortName} in ${programName}.`,
        ctaLabel: "Apply Now",
        ctaUrl: cohortPath,
        targetAudience: "website",
      };
    case "closed":
      return {
        title: `${cohortName} applications closed`,
        body: `Applications for ${cohortName} in ${programName} are now closed.`,
        ctaLabel: "Learn More",
        ctaUrl: programPath,
        targetAudience: "website",
      };
    case "running":
      return {
        title: `${cohortName} is now running`,
        body: `${cohortName} in ${programName} has started. Welcome to all participants.`,
        ctaLabel: "Learn More",
        ctaUrl: programPath,
        targetAudience: "website",
      };
    case "completed":
      return {
        title: `${cohortName} has completed`,
        body: `${cohortName} in ${programName} has successfully completed.`,
        ctaLabel: "See Program",
        ctaUrl: programPath,
        targetAudience: "website",
      };
    case "deleted":
      return {
        title: `${cohortName} has been cancelled`,
        body: `${cohortName} in ${programName} has been cancelled.`,
        ctaLabel: "View Programs",
        ctaUrl: "/programs",
        targetAudience: "website",
      };
    case "coming_soon":
    default:
      return {
        title: `${cohortName} is coming soon`,
        body: `Applications for ${cohortName} in ${programName} will open soon.`,
        ctaLabel: "Learn More",
        ctaUrl: cohortPath,
        targetAudience: "website",
      };
  }
}

export function buildEventAnnouncementDefaults(input: {
  mode: EventAnnouncementMode;
  eventTitle: string;
  eventSlug?: string | null;
}): AnnouncementPromptDefaults {
  const eventTitle = input.eventTitle || "This event";
  const eventPath = String(input.eventSlug || "").trim() ? `/events/${input.eventSlug}` : "/events";

  if (input.mode === "completed") {
    return {
      title: `${eventTitle} has concluded`,
      body: `Thank you to everyone who joined ${eventTitle}.`,
      ctaLabel: "See Events",
      ctaUrl: "/events",
      targetAudience: "website",
    };
  }

  return {
    title: `${eventTitle} is coming up`,
    body: `Join us for ${eventTitle}. Save the date.`,
    ctaLabel: "View Event",
    ctaUrl: eventPath,
    targetAudience: "website",
  };
}
