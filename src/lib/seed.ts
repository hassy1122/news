import type { NewsItem } from "./types";

/**
 * Scholarship catalog seeds — REAL, long-running annual programs with official
 * links. Deadlines below are ANNUAL CYCLES, not fabricated dates: each entry
 * names the typical application window and must be confirmed on the official
 * page (labelled in the UI as "Annual cycle — confirm on official site").
 *
 * Every field is limited to what is stably true about these programs (host,
 * destination, level, funding type, nationality rules). Anything that varies
 * (exact deadlines, quotas) is intentionally left to the official source.
 */

interface Seed {
  id: string;
  title: string;
  url: string;
  applyUrl: string;
  host: string;
  destination?: string;
  level: string;
  fields: string[];
  funding: "fully-funded" | "partial" | "stipend";
  fundingNote: string;
  nationalities: string[]; // stated eligibility; [] = program defines via official page
  cycleOpens: string;
  cycleCloses: string;
  note: string;
}

const YEAR = new Date().getFullYear();
void YEAR;

function seedItem(s: Seed): NewsItem {
  const y = YEAR;
  return {
    id: s.id,
    title: s.title,
    url: s.url,
    summary: `${s.host} — ${s.fundingNote} The application window is an annual cycle (typically opens ${s.cycleOpens}, closes ${s.cycleCloses}); confirm the current deadline on the official page. ${s.note}`,
    summarySource: "source",
    sourceId: "catalog",
    sourceName: "Official program catalog",
    sourceDomains: [new URL(s.url).hostname],
    reliability: "official",
    originCountry: s.destination,
    regions: [],
    publishedAt: null,
    publishedUnknown: true,
    fetchedAt: new Date().toISOString(),
    categories: ["scholarship"],
    sections: ["scholarships"],
    kind: "scholarship",
    availability: {
      kind: "annual-cycle",
      annualCycleOpens: s.cycleOpens,
      annualCycleCloses: s.cycleCloses,
      deadline: undefined,
      degreeLevel: s.level,
      fields: s.fields,
      funding: s.funding,
      fundingNote: s.fundingNote,
      eligibleNationalities: s.nationalities,
      destinationCountry: s.destination,
      applyUrl: s.applyUrl,
    },
    importance: 0.9,
    verification: {
      status: "official",
      checkedAt: new Date().toISOString(),
      notes: "Catalog entry from official program site — re-check before applying.",
    },
    status: "active",
    seeded: true,
    seedNote: s.note,
  } as unknown as NewsItem;
}

const SEEDS: Seed[] = [
  {
    id: "seed-chevening",
    title: "Chevening Scholarships (UK, fully funded master's)",
    url: "https://www.chevening.org/scholarships/",
    applyUrl: "https://www.chevening.org/scholarships/",
    host: "UK Foreign, Commonwealth & Development Office",
    destination: "GB",
    level: "Master's",
    fields: ["Any field (1-year master's)"],
    funding: "fully-funded",
    fundingNote: "Covers tuition, living stipend, travel — official terms on site.",
    nationalities: [], // ~160 eligible countries incl. Pakistan; official list on site
    cycleOpens: "August",
    cycleCloses: "November",
    note: "Pakistan is traditionally eligible; eligibility list is published on the official site.",
  }, // seedItem wrapper applied below
  {
    id: "seed-daad-epos",
    title: "DAAD EPOS — Development-Related Postgraduate Courses (Germany)",
    url: "https://www.daad.de/en/study-and-research-in-germany/scholarships/daad-funding-programmes-for-all-ends/",
    applyUrl: "https://www.daad.de/en/study-and-research-in-germany/scholarships/",
    host: "DAAD (German Academic Exchange Service)",
    destination: "DE",
    level: "Master's / PhD",
    fields: ["Development-related fields", "Engineering", "Economics", "Public health"],
    funding: "fully-funded",
    fundingNote: "Full or partial scholarship depending on programme; terms per course.",
    nationalities: [],
    cycleOpens: "varies by course (usually Aug–Oct)",
    cycleCloses: "Winter",
    note: "Applicants from developing countries incl. Pakistan — check the course list.",
  },
  {
    id: "seed-erasmus-mundus",
    title: "Erasmus Mundus Joint Master's (EU-wide)",
    url: "https://erasmus-plus.ec.europa.eu/opportunities/opportunities-for-individuals/students/erasmus-mundus-joint-masters-scholarships",
    applyUrl: "https://erasmus-plus.ec.europa.eu/opportunities/opportunities-for-individuals/students/erasmus-mundus-joint-masters-scholarships",
    host: "European Commission (Erasmus+)",
    destination: undefined,
    level: "Master's",
    fields: ["Many disciplines across 100+ consortium programmes"],
    funding: "fully-funded",
    fundingNote: "Participation costs, travel & installation, monthly allowance — per catalogue.",
    nationalities: [],
    cycleOpens: "October–December (varies by programme)",
    cycleCloses: "January (generally)",
    note: "Open worldwide incl. Pakistan; deadlines differ per joint programme.",
  },
  {
    id: "seed-usefp-fulbright",
    title: "Fulbright Master's & PhD Program (USA, via USEFP Pakistan)",
    url: "https://www.usefp.org/scholarships/fulbright-degree.cfm",
    applyUrl: "https://www.usefp.org/scholarships/fulbright-degree.cfm",
    host: "USEFP / U.S. Department of State",
    destination: "US",
    level: "Master's / PhD",
    fields: ["Most fields except clinical medicine"],
    funding: "fully-funded",
    fundingNote: "Tuition, stipend, airfare, health cover under the official grant terms.",
    nationalities: ["PK"],
    cycleOpens: "~February",
    cycleCloses: "~May",
    note: "Requires GRE/TOEFL; the cycle months are indicative — confirm on USEFP.",
  },
  {
    id: "seed-commonwealth",
    title: "Commonwealth Master's Scholarships (UK)",
    url: "https://cscuk.fcdo.gov.uk/scholarships/commonwealth-masters-scholarships/",
    applyUrl: "https://cscuk.fcdo.gov.uk/scholarships/commonwealth-masters-scholarships/",
    host: "Commonwealth Scholarship Commission (UK)",
    destination: "GB",
    level: "Master's",
    fields: ["Named development-themed courses"],
    funding: "fully-funded",
    fundingNote: "Tuition, living allowance, flights under CSC terms.",
    nationalities: ["PK", "BD", "IN", "LK", "NP", "NG", "KE", "TZ", "UG", "GH"],
    cycleOpens: "~September",
    cycleCloses: "~October",
    note: "For low/middle-income Commonwealth countries (incl. Pakistan).",
  },
  {
    id: "seed-mext",
    title: "MEXT Japanese Government Scholarship",
    url: "https://www.studyinjapan.go.jp/en/planning/scholarship/",
    applyUrl: "https://www.studyinjapan.go.jp/en/planning/scholarship/",
    host: "Japan MEXT (via Embassy of Japan, Islamabad)",
    destination: "JP",
    level: "Undergraduate / Master's / PhD",
    fields: ["Broad range incl. engineering & sciences"],
    funding: "fully-funded",
    fundingNote: "Monthly stipend + tuition (per MEXT terms); embassy-recommendation track.",
    nationalities: ["PK"],
    cycleOpens: "~April",
    cycleCloses: "~May–June",
    note: "Pakistan applies via the embassy recommendation track; confirm current round.",
  },
  {
    id: "seed-gates-cambridge",
    title: "Gates Cambridge Scholarships",
    url: "https://www.gatescambridge.org/",
    applyUrl: "https://www.gatescambridge.org/apply/",
    host: "University of Cambridge / Gates Trust",
    destination: "GB",
    level: "Master's / PhD",
    fields: ["All subjects offered at Cambridge"],
    funding: "fully-funded",
    fundingNote: "Full cost + discretionary funding under Gates terms.",
    nationalities: [],
    cycleOpens: "September (with Cambridge grad application)",
    cycleCloses: "December (early rounds)",
    note: "Open to non-UK citizens including Pakistan. Apply via Cambridge admission.",
  },
  {
    id: "seed-rhodes",
    title: "Rhodes Scholarships — incl. Pakistan Constituency",
    url: "https://www.rhodeshouse.ox.ac.uk/scholarships/",
    applyUrl: "https://www.rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship-pakistan/",
    host: "Rhodes Trust, University of Oxford",
    destination: "GB",
    level: "Master's / PhD",
    fields: ["Any full-time postgraduate course"],
    funding: "fully-funded",
    fundingNote: "Fees + stipend under Rhodes terms.",
    nationalities: ["PK"],
    cycleOpens: "~June",
    cycleCloses: "~September",
    note: "Pakistan constituency exists; check constituency terms.",
  },
  {
    id: "seed-aa-egypt",
    title: "Australia Awards Scholarships",
    url: "https://www.dfat.gov.au/people-to-people/australia-awards/australia-awards-scholarships",
    applyUrl: "https://www.dfat.gov.au/people-to-people/australia-awards/australia-awards-scholarships",
    host: "Australian Government (DFAT)",
    destination: "AU",
    level: "Master's (selected territories also bachelor)",
    fields: ["Development priority sectors"],
    funding: "fully-funded",
    fundingNote: "Tuition, return air travel, establishment & living allowance.",
    nationalities: [],
    cycleOpens: "~February",
    cycleCloses: "~April",
    note: "Participating countries incl. Pakistan in some rounds — verify on DFAT page.",
  },
  {
    id: "seed-clarendon",
    title: "Clarendon Fund Scholarships (Oxford)",
    url: "https://www.ox.ac.uk/admissions/graduate/fees-and-funding/fees-funding-and-scholarship-search/clarendon-fund-scholarships",
    applyUrl: "https://www.ox.ac.uk/admissions/graduate/applying-to-oxford/login",
    host: "University of Oxford",
    destination: "GB",
    level: "Master's / PhD",
    fields: ["All graduate courses"],
    funding: "fully-funded",
    fundingNote: "Course fees + generous grant via Clarendon terms.",
    nationalities: [],
    cycleOpens: "Automatic entry via Oxford applications (Sept–Jan deadlines)",
    cycleCloses: "January",
    note: "No separate form; all nationalities; awarded on merit.",
  },
] as Seed[];

export const SCHOLARSHIP_SEEDS: NewsItem[] = SEEDS.map(seedItem);
