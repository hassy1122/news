// ── Core domain types ────────────────────────────────────────────────────
export type SectionId = "topnews" | "topit" | "scholarships" | string;

export type Reliability = "official" | "high" | "medium" | "low";

export type VerifStatus =
  | "official" // from an official government/university/company source
  | "corroborated" // same core claim independently reported by 2+ sources
  | "single-source" // default: one reputable source
  | "flagged" // suspicious claims (unrealistic income, fees, etc.)
  | "unverified"; // not yet assessed

export interface Corroboration {
  url: string;
  sourceName: string;
}

export interface Verification {
  status: VerifStatus;
  checkedAt: string; // ISO
  notes?: string;
}

export interface Availability {
  /** scholarship / job / event-style deadline info */
  kind?: "deadline" | "annual-cycle" | "open" | "event" | "none";
  deadline?: string; // ISO when verifiable
  annualCycleOpens?: string; // e.g. "August" (catalog entries)
  annualCycleCloses?: string; // e.g. "November"
  endedAt?: string; // for events that have finished
  degreeLevel?: string; // "Master's", "PhD", ...
  fields?: string[]; // academic fields / disciplines
  funding?: "fully-funded" | "partial" | "stipend" | "paid-position" | "varies" | "unpaid";
  fundingNote?: string;
  eligibleNationalities?: string[]; // ISO codes; empty = not stated by source
  destinationCountry?: string;
  locations?: string[]; // employer/campus location(s)
  remote?: boolean | null; // null = unknown
  compensation?: string; // only when disclosed by the source
  benefits?: string[];
  applyUrl?: string; // official application/registration page
}

export interface NewsItem {
  id: string; // sha1 of url
  title: string;
  url: string;
  summary: string; // short, source-grounded (0–3 sentence excerpt)
  summarySource: "source" | "ai"; // "ai" implies LLM-written from source text
  whyItMatters?: string; // AI-generated when configured; never fabricated locally
  imageUrl?: string;
  imageAlt?: string;
  sourceId: string;
  sourceName: string;
  sourceDomains: string[];
  reliability: Reliability;
  originCountry?: string; // ISO code of story country, when identifiable
  regions: string[]; // e.g. ["south-asia"]
  publishedAt?: string | null; // ORIGINAL publication time; null = unknown
  publishedUnknown?: boolean;
  updatedSubstantiveAt?: string | null; // latest substantive update
  fetchedAt: string;
  categories: string[]; // taxonomy concept ids
  sections: SectionId[]; // inferred feeds this item may appear in
  kind: "news" | "scholarship" | "job" | "internship" | "event" | "course" | "evergreen";
  availability?: Availability;
  importance: number; // 0–1
  verification: Verification;
  status: "active" | "expired";
  expiredAt?: string;
  seeded?: boolean; // scholarship catalog seed (not from a live feed)
  seedNote?: string;
  flagged?: string; // scam-risk note
  corroborations?: Corroboration[];
  matchedAt?: string; // AI translation cache name
  ai?: { summary?: string; why?: string }; // cached AI outputs (en)
}

export interface Briefing {
  id: string;
  localDate: string; // YYYY-MM-DD in user's tz
  createdAt: string;
  timezone: string;
  sections: Array<{
    sectionId: SectionId;
    label: string;
    itemIds: string[];
    items: NewsItem[]; // snapshot
  }>;
}

export type NotifyDelivery =
  | "generated" // created, awaiting a live browser to display
  | "delivered-live"
  | "suppressed-quiet"
  | "suppressed-duplicate"
  | "suppressed-expired"
  | "suppressed-excluded"
  | "failed";

export interface NotificationRecord {
  id: string;
  createdAt: string;
  title: string;
  body: string;
  url: string;
  topic: string;
  sourceName?: string;
  delivery: NotifyDelivery;
  note?: string; // accurate failure/suppression reason
}

export interface Interest {
  id: string;
  text: string;
  enabled: boolean;
  category?: string; // tax-id hint
  country?: string; // ISO or "WW"
  priority: "low" | "normal" | "high";
  notify: { mode: "off" | "immediate" | "digest" | "briefing"; threshold?: number };
  createdAt: string;
}

export interface Exclusion {
  id: string;
  text: string;
  enabled: boolean;
  type: "semantic"; // keyword+concept based
  scope: "all" | SectionId[];
  exception?: string; // a topic that overrides this exclusion
  createdAt: string;
}

export interface CustomTopic {
  id: string;
  name: string;
  description: string; // user's natural-language request
  prefs: {
    section: "topit" | "scholarships" | "topnews" | "any";
    quantityPerDay: number;
    keywords: string[];
    excludeKeywords: string[];
    country?: string;
    remoteOnly?: boolean;
    requireOfficialApplicationPage?: boolean;
    notify: { mode: "off" | "immediate" | "digest" | "briefing" };
  };
  createdAt: string;
  parsedBy: "heuristic" | "ai";
}

export interface Appearance {
  theme: "light" | "dark" | "system";
  accent: string; // rgb triplet "79 70 229"
  textSize: "sm" | "md" | "lg" | "xl";
  readingDensity: "compact" | "standard" | "comfortable";
  feedLayout: "cards" | "list";
  showImages: boolean;
  animations: boolean;
  highContrast: boolean;
}

export interface SectionPrefs {
  country: string; // ISO or "WW"
  dailyQuantity: number; // briefing quantity (default 5)
  sort: "latest" | "important" | "relevant";
}

export interface NotificationSettings {
  enabled: boolean; // master
  permissionAsked: boolean;
  briefingAlert: boolean; // daily briefing notification
  importantNews: boolean;
  itOpportunities: boolean;
  scholarshipAlerts: boolean;
  deadlineReminders: boolean;
  topicMode: "selected" | "all"; // selected topics only vs all enabled categories
  perInterestDefault: boolean; // default notify ON for new interests
  quietStart: string; // "22:00"
  quietEnd: string; // "07:00"
  maxPerHour: number;
  maxPerDay: number;
  emailEnabled: boolean; // documented as requiring config; off by default
}

export interface SavedItem {
  id: string;
  itemId: string;
  savedAt: string;
  snapshot: NewsItem; // survives source expiry
  applicationStatus?: "not-started" | "applying" | "submitted" | "result";
}

export interface FeedbackEntry {
  id: string;
  createdAt: string;
  itemId?: string;
  rating: "accurate" | "inaccurate" | "not-relevant" | "other";
  comment: string;
}

export interface Prefs {
  profileId: string;
  version: 1;
  language: "en" | "ur"; // content language
  timezone: string; // IANA
  briefingTime: string; // "08:00" local
  refreshMinutes: number; // ingestion interval
  sections: Record<string, SectionPrefs>;
  interests: Interest[];
  exclusions: Exclusion[];
  customTopics: CustomTopic[];
  notifications: NotificationSettings;
  notificationHistory: NotificationRecord[];
  saved: SavedItem[];
  feedback: FeedbackEntry[];
}
