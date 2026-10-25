import type { Prefs } from "./types";
import { DEFAULT_COUNTRY } from "./countries";

export const DEFAULT_TIMEZONE = "Asia/Karachi";
export const DEFAULT_BRIEFING_TIME = "08:00";
export const DEFAULT_REFRESH_MINUTES = 15;
export const DEFAULT_DAILY_QUANTITY = 5;

export function defaultPrefs(profileId = "local"): Prefs {
  return {
    profileId,
    version: 1,
    language: "en",
    timezone: DEFAULT_TIMEZONE,
    briefingTime: DEFAULT_BRIEFING_TIME,
    refreshMinutes: DEFAULT_REFRESH_MINUTES,
    sections: {
      topnews: { country: DEFAULT_COUNTRY, dailyQuantity: 5, sort: "latest" },
      topit: { country: DEFAULT_COUNTRY, dailyQuantity: 5, sort: "latest" },
      scholarships: { country: DEFAULT_COUNTRY, dailyQuantity: 5, sort: "latest" },
      // "More" category feeds persist independently. Their items are global
      // (sources publish without country tags), so Worldwide is the honest
      // default — a PK default would render empty pages. noIngest for these:
      ...Object.fromEntries(
        (
          [
            ["conferences", 3], ["internships", 3], ["jobs", 3], ["earnings", 3],
            ["business", 3], ["ai-tools", 3], ["courses", 3], ["hackathons", 3],
            ["opensource", 3], ["gov", 3], ["science", 3], ["finance", 3],
          ] as Array<[string, number]>
        ).map(([id, dq]) => [id, { country: "WW", dailyQuantity: dq, sort: "latest" }]),
      ),
    },
    interests: [],
    exclusions: [],
    customTopics: [],
    notifications: {
      enabled: false, // no permission prompt until explicitly enabled
      permissionAsked: false,
      briefingAlert: false,
      importantNews: true,
      itOpportunities: true,
      scholarshipAlerts: true,
      deadlineReminders: true,
      topicMode: "selected", // conservative default; "all" is opt-in
      perInterestDefault: false,
      quietStart: "22:00",
      quietEnd: "07:00",
      maxPerHour: 4,
      maxPerDay: 24,
      emailEnabled: false,
    },
    notificationHistory: [],
    saved: [],
    feedback: [],
  };
}

/**
 * Reset Interest Preferences — touches ONLY interests + exclusions.
 * Saved items, language, appearance, notification schedules, custom topics,
 * account data and everything else remain untouched.
 */
export function resetInterestPreferences(p: Prefs): Prefs {
  return { ...p, interests: [], exclusions: [] };
}

/** More-category section ids whose content is global (with the tabs excluded). */
export const GLOBAL_MORE_SECTIONS = [
  "conferences", "internships", "jobs", "earnings", "business", "ai-tools",
  "courses", "hackathons", "opensource", "gov", "science", "finance",
] as const;

/**
 * One-time correction for profiles stored before the More-tab coverage fix.
 * Those sections defaulted to PK, but their items are worldwide — silently
 * empty pages. Bump only that stale DEFAULT; set the flag so it never touches
 * a country the visitor chose themselves afterwards.
 */
export function migrateMoreCountryWorldwide(p: Prefs): Prefs {
  if (p.migrations?.moreCountryWorldwide) return p;
  const next: Prefs = { ...p, migrations: { ...p.migrations, moreCountryWorldwide: true } };
  for (const id of GLOBAL_MORE_SECTIONS) {
    const sec = next.sections[id];
    if (sec && sec.country === "PK") next.sections[id] = { ...sec, country: "WW" };
  }
  return next;
}
