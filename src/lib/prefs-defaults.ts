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
      // "More" category feeds persist independently:
      conferences: { country: DEFAULT_COUNTRY, dailyQuantity: 3, sort: "latest" },
      internships: { country: DEFAULT_COUNTRY, dailyQuantity: 3, sort: "latest" },
      jobs: { country: DEFAULT_COUNTRY, dailyQuantity: 3, sort: "latest" },
      earnings: { country: DEFAULT_COUNTRY, dailyQuantity: 3, sort: "latest" },
      business: { country: DEFAULT_COUNTRY, dailyQuantity: 3, sort: "latest" },
      "ai-tools": { country: DEFAULT_COUNTRY, dailyQuantity: 3, sort: "latest" },
      courses: { country: DEFAULT_COUNTRY, dailyQuantity: 3, sort: "latest" },
      hackathons: { country: DEFAULT_COUNTRY, dailyQuantity: 3, sort: "latest" },
      opensource: { country: DEFAULT_COUNTRY, dailyQuantity: 3, sort: "latest" },
      gov: { country: DEFAULT_COUNTRY, dailyQuantity: 3, sort: "latest" },
      science: { country: DEFAULT_COUNTRY, dailyQuantity: 3, sort: "latest" },
      finance: { country: DEFAULT_COUNTRY, dailyQuantity: 3, sort: "latest" },
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
