import type { Reliability, SectionId } from "./types";

export interface FeedSource {
  id: string;
  name: string;
  homepage: string;
  reliability: Reliability;
  defaultCountry?: string; // ISO – source's editorial focus
  feeds: string[]; // RSS/Atom URLs
  bestFor: SectionId[];
  official?: boolean; // official government/university/company source
}

/**
 * All sources below are free, permitted RSS/Atom feeds — no API key required.
 * A source failing (rate limit, downtime, geo-block) is recorded in the job
 * log and surfaced in Settings → Sources. It never blocks other sources.
 */
export const SOURCES: FeedSource[] = [
  {
    id: "bbc-world",
    name: "BBC News — World",
    homepage: "https://www.bbc.com/news/world",
    reliability: "high",
    feeds: ["https://feeds.bbci.co.uk/news/world/rss.xml"],
    bestFor: ["topnews"],
  },
  {
    id: "bbc-tech",
    name: "BBC News — Technology",
    homepage: "https://www.bbc.com/news/technology",
    reliability: "high",
    feeds: ["https://feeds.bbci.co.uk/news/technology/rss.xml"],
    bestFor: ["topit"],
  },
  {
    id: "bbc-science",
    name: "BBC News — Science & Environment",
    homepage: "https://www.bbc.com/news/science_and_environment",
    reliability: "high",
    feeds: ["https://feeds.bbci.co.uk/news/science_and_environment/rss.xml"],
    bestFor: ["topnews", "science"],
  },
  {
    id: "aljazeera",
    name: "Al Jazeera",
    homepage: "https://www.aljazeera.com",
    reliability: "high",
    feeds: ["https://www.aljazeera.com/xml/rss/all.xml"],
    bestFor: ["topnews"],
  },
  {
    id: "dawn",
    name: "Dawn (Pakistan)",
    homepage: "https://www.dawn.com",
    reliability: "high",
    defaultCountry: "PK",
    feeds: ["https://www.dawn.com/feeds/home"],
    bestFor: ["topnews"],
  },
  {
    id: "tribune",
    name: "The Express Tribune (Pakistan)",
    homepage: "https://tribune.com.pk",
    reliability: "medium",
    defaultCountry: "PK",
    feeds: ["https://tribune.com.pk/feed/home"],
    bestFor: ["topnews"],
  },
  {
    id: "techcrunch",
    name: "TechCrunch",
    homepage: "https://techcrunch.com",
    reliability: "high",
    feeds: ["https://techcrunch.com/feed/"],
    bestFor: ["topit", "ai-tools"],
  },
  {
    id: "arstechnica",
    name: "Ars Technica",
    homepage: "https://arstechnica.com",
    reliability: "high",
    feeds: ["https://feeds.arstechnica.com/arstechnica/index"],
    bestFor: ["topit", "science"],
  },
  {
    id: "theverge",
    name: "The Verge",
    homepage: "https://www.theverge.com",
    reliability: "high",
    feeds: ["https://www.theverge.com/rss/index.xml"],
    bestFor: ["topit"],
  },
  {
    id: "hn-frontpage",
    name: "Hacker News (front page)",
    homepage: "https://news.ycombinator.com",
    reliability: "medium",
    feeds: ["https://hnrss.org/frontpage?count=30"],
    bestFor: ["topit", "jobs"],
  },
  {
    id: "hn-hiring",
    name: "Hacker News — Who is hiring threads",
    homepage: "https://news.ycombinator.com/showhn",
    reliability: "medium",
    feeds: ['https://hnrss.org/newest?q=%22who%27s+hiring%22&count=20'],
    bestFor: ["topit", "jobs"],
  },
  {
    id: "wwr",
    name: "We Work Remotely — Programming",
    homepage: "https://weworkremotely.com",
    reliability: "high",
    feeds: ["https://weworkremotely.com/categories/remote-programming-jobs.rss"],
    bestFor: ["topit", "jobs"],
  },
  {
    id: "devto",
    name: "DEV Community",
    homepage: "https://dev.to",
    reliability: "medium",
    feeds: ["https://dev.to/feed"],
    bestFor: ["topit", "courses", "conferences"],
  },
  {
    id: "githubblog",
    name: "The GitHub Blog",
    homepage: "https://github.blog",
    reliability: "official",
    official: true,
    feeds: ["https://github.blog/feed/"],
    bestFor: ["topit", "ai-tools", "opensource"],
  },
  {
    id: "o4a",
    name: "Opportunities For Africans",
    homepage: "https://www.opportunitiesforafricans.com/",
    reliability: "medium",
    feeds: ["https://www.opportunitiesforafricans.com/feed/"],
    bestFor: ["scholarships", "internships"],
  },
  {
    id: "o4y",
    name: "Opportunities For Youths",
    homepage: "https://www.opportunitiesforyouths.com/",
    reliability: "medium",
    feeds: ["https://www.opportunitiesforyouths.com/feed/"],
    bestFor: ["scholarships", "internships"],
  },
  {
    id: "educationusa",
    name: "educationusa (U.S. State Dept. network)",
    homepage: "https://educationusa.state.gov/",
    reliability: "official",
    official: true,
    feeds: ["https://educationusa.state.gov/rss.xml"],
    bestFor: ["scholarships"],
  },
];

export function sourceById(id: string): FeedSource | undefined {
  return SOURCES.find((s) => s.id === id);
}

// ── per-country editions ───────────────────────────────────────────────────
// The text-hint country tagger can only catch stories that explicitly name a
// country, so most countries ended with an empty feed. Google News' free RSS
// editions give every English-edition country a real local feed.
const GNEWS_ISO_EN: Array<[string, string]> = [
  ["PK", "Pakistan"],
  ["IN", "India"],
  ["AU", "Australia"],
  ["NZ", "New Zealand"],
  ["US", "United States"],
  ["CA", "Canada"],
  ["GB", "United Kingdom"],
  ["IE", "Ireland"],
  ["ZA", "South Africa"],
  ["NG", "Nigeria"],
  ["KE", "Kenya"],
  ["GH", "Ghana"],
  ["TZ", "Tanzania"],
  ["UG", "Uganda"],
  ["SG", "Singapore"],
  ["MY", "Malaysia"],
  ["PH", "Philippines"],
  ["LK", "Sri Lanka"],
  ["BD", "Bangladesh"],
  ["NP", "Nepal"],
  ["AE", "United Arab Emirates"],
];

function gNewsTop(iso: string): string {
  return `https://news.google.com/rss?hl=en&gl=${iso}&ceid=${iso}:en`;
}

function gNewsTopic(q: string, iso = "US"): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en&gl=${iso}&ceid=${iso}:en`;
}

for (const [iso, name] of GNEWS_ISO_EN) {
  SOURCES.push({
    id: `gnews-${iso.toLowerCase()}`,
    name: `Google News — ${name}`,
    homepage: `https://news.google.com/topstories?hl=en&gl=${iso}`,
    reliability: "medium",
    defaultCountry: iso,
    feeds: [gNewsTop(iso), gNewsTopic("technology", iso)],
    bestFor: ["topnews", "topit", "jobs"],
  });
}

SOURCES.push(
  {
    id: "gnews-free-courses",
    name: "Google News — free online courses",
    homepage: "https://news.google.com/search?q=free+online+courses",
    reliability: "medium",
    feeds: [gNewsTopic("free online courses")],
    bestFor: ["courses"],
  },
  {
    id: "gnews-internships",
    name: "Google News — internships",
    homepage: "https://news.google.com/search?q=internships",
    reliability: "medium",
    feeds: [gNewsTopic("internships funding OR applications")],
    bestFor: ["internships"],
  },
  {
    id: "gnews-hackathons",
    name: "Google News — hackathons",
    homepage: "https://news.google.com/search?q=hackathons",
    reliability: "medium",
    feeds: [gNewsTopic("hackathon")],
    bestFor: ["hackathons"],
  },
  {
    id: "gnews-conferences",
    name: "Google News — tech conferences",
    homepage: "https://news.google.com/search?q=tech+conferences",
    reliability: "medium",
    feeds: [gNewsTopic("tech conferences developer")],
    bestFor: ["conferences"],
  },
  {
    id: "gnews-gov",
    name: "Google News — government programs",
    homepage: "https://news.google.com/search?q=government+schemes",
    reliability: "medium",
    feeds: [gNewsTopic('govtech OR "government scheme" OR "e-government" OR "digital id"')],
    bestFor: ["topnews"],
  },
);
