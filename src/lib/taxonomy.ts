/**
 * Concept taxonomy — the "semantic layer".
 *
 * Every concept gathers real-world synonyms / related entities so that an
 * interest like "Artificial Intelligence" also matches "OpenAI", "LLM",
 * "machine learning", etc. The same taxonomy powers:
 *   1. section/category classification during ingestion,
 *   2. interest expansion,
 *   3. exclusions ("Celebrity Gossip" filters the related concept, not just
 *      the literal words).
 *
 * `includes` links related concepts (used for the user-facing explanation
 * "what related content the system will include").
 */

export interface Concept {
  id: string;
  label: string;
  /** user-facing explanation of what matches this concept */
  includes: string;
  related: string[];
  synonyms: string[]; // lowercase phrases
  section: "news" | "it" | "scholarship" | "none";
  boost: number; // importance boost 0–1 for importance ranking
}

export const CONCEPTS: Concept[] = [
  {
    id: "ai",
    label: "Artificial Intelligence",
    includes: "AI models & research, LLM releases, AI tools, AI industry & policy news",
    related: ["ml", "products", "opensource"],
    synonyms: [
      "artificial intelligence", "machine intelligence", "ai model", "large language model",
      "llm", "genai", "generative ai", "chatbot", "chatgpt", "openai", "anthropic",
      "google gemini", "deepmind", "foundation model", "neural network", "transformer model",
      "ai tool", "copilot", "multimodal", "inference", "training compute",
    ],
    section: "it",
    boost: 0.8,
  },
  {
    id: "ml",
    label: "Machine Learning & Data Science",
    includes: "ML research results, data science, datasets, model evaluation",
    related: ["ai"],
    synonyms: [
      "machine learning", "deep learning", "reinforcement learning", "classifier",
      "data science", "data scientist", "kaggle", "dataset", "fine-tuning",
    ],
    section: "it",
    boost: 0.6,
  },
  {
    id: "softdev",
    label: "Software Engineering",
    includes: "Programming, languages, frameworks, developer tools, engineering practices",
    related: ["webdev", "opensource", "cloud"],
    synonyms: [
      "software engineer", "developer", "programming", "python", "javascript", "typescript",
      "java", "golang", "rust", "c++", "api", "sdk", "compiler", "database", "sql",
      "mongodb", "postgres", "docker", "kubernetes", "linux", "git", "refactor",
      "code review", "microservices", "developer tools", "ide", "visual studio",
    ],
    section: "it",
    boost: 0.6,
  },
  {
    id: "webdev",
    label: "Web & Mobile Development",
    includes: "React, Next.js, JS/TS ecosystem, mobile platforms, frontend/backend stacks",
    related: ["softdev"],
    synonyms: [
      "react", "next.js", "nextjs", "vue", "angular", "svelte", "tailwind", "css", "html",
      "node.js", "nodejs", "express", "frontend", "backend", "fullstack", "flutter",
      "swift", "kotlin", "android", "ios app", "web app", "pwa", "responsive design",
    ],
    section: "it",
    boost: 0.6,
  },
  {
    id: "cyber",
    label: "Cybersecurity",
    includes: "Breaches, vulnerabilities, malware, security research, infosec policy",
    related: [],
    synonyms: [
      "cybersecurity", "cyber attack", "ransomware", "phishing", "data breach",
      "malware", "zero-day", "vulnerability", "infosec", "hacker", "exploit",
      "encryption", "penetration test", "apt ", "botnet", "leaked credentials",
    ],
    section: "it",
    boost: 0.75,
  },
  {
    id: "cloud",
    label: "Cloud & Data Infrastructure",
    includes: "Cloud platforms, data engineering, compute infrastructure",
    related: ["softdev"],
    synonyms: [
      "cloud computing", "aws", "azure", "google cloud", "serverless", "data center",
      "big data", "data engineering", "etl", "analytics", "gpu cluster", "tpu",
    ],
    section: "it",
    boost: 0.55,
  },
  {
    id: "products",
    label: "Company & Product Announcements",
    includes: "Launches, releases, acquisitions, major platform updates",
    related: ["ai"],
    synonyms: [
      "launches", "unveils", "announces", "release", "rollout", "beta", "acquisition",
      "acquires", "merger", "partnership with", "platform update", "now available",
    ],
    section: "it",
    boost: 0.5,
  },
  {
    id: "opensource",
    label: "Open Source",
    includes: "OSS releases, maintainership, open-source grants and programs",
    related: ["softdev"],
    synonyms: [
      "open source", "open-source", "github", "maintainer", "repository", "pull request",
      "go fund open", "oss grant", "license", "foss",
    ],
    section: "it",
    boost: 0.5,
  },
  {
    id: "jobs",
    label: "Jobs & Remote Work",
    includes: "Job openings, hiring rounds, remote positions, freelance work",
    related: ["internships"],
    synonyms: [
      "job opening", "hiring", "vacancy", "we are hiring", "recruitment",
      "remote job", "work from home", "remote position", "freelance", "looking for a",
      "is looking to hire", "apply now", "position available", "junior developer",
      "frontend developer", "backend developer", "full stack", "career opportunities",
      "job application", "open position", "job listing",
    ],
    section: "it",
    boost: 0.7,
  },
  {
    id: "internships",
    label: "Internships & Traineeships",
    includes: "Internship programs, trainee positions, graduate schemes",
    related: ["jobs"],
    synonyms: [
      "internship", "intern program", "trainee", "graduate scheme", "internship program",
      "summer internship", "paid internship",
    ],
    section: "it",
    boost: 0.75,
  },
  {
    id: "hackathons",
    label: "Hackathons & Competitions",
    includes: "Hackathons, coding contests, competitive programming, tech competitions",
    related: ["conferences"],
    synonyms: [
      "hackathon", "coding competition", "competitive programming", "code sprint",
      "coding challenge", "contest", "innovation challenge", "icpc",
    ],
    section: "it",
    boost: 0.65,
  },
  {
    id: "conferences",
    label: "Conferences & Conventions",
    includes: "Tech conferences, summits, expos, developer conventions",
    related: [],
    synonyms: [
      "conference", "summit", "expo", "convention", "keynote", "meetup", "devdays",
      "developer day", "tech week",
    ],
    section: "it",
    boost: 0.6,
  },
  {
    id: "scholarship",
    label: "Scholarships & Fellowships",
    includes: "Fully/partially funded scholarships, fellowships, grants, study-abroad funding",
    related: ["internships"],
    synonyms: [
      "scholarship", "scholarships", "fully funded", "tuition waiver", "stipend",
      "fellowship", "scholarship program", "financial aid", "bursary", "study abroad",
      "student grant", "phd position", "postdoctoral", "research assistantship",
      "funded masters", "funded phd", "scholarship application",
    ],
    section: "scholarship",
    boost: 0.95,
  },
  {
    id: "courses",
    label: "Free Courses & Certifications",
    includes: "MOOCs, free certifications, developer education programs",
    related: ["scholarship"],
    synonyms: [
      "free course", "certification", "mooc", "learn online", "coursera", "edx",
      "udemy", "bootcamp", "certificate program", "free training",
    ],
    section: "it",
    boost: 0.55,
  },
  {
    id: "politics",
    label: "Politics & Government",
    includes: "Elections, parliaments, government decisions, laws, institutions",
    related: [],
    synonyms: [
      "election", "parliament", "government", "minister", "president", "prime minister",
      "senate", "supreme court", "legislation", "policy", "political", "cabinet",
      "constitution", "impeach", "referendum", "diplomacy", "sanctions", "treaty",
    ],
    section: "news",
    boost: 0.8,
  },
  {
    id: "economy",
    label: "Economy & Business",
    includes: "Inflation, markets, trade, budgets, central banks, major business moves",
    related: [],
    synonyms: [
      "economy", "inflation", "stock market", "rupee", "dollar", "interest rate",
      "imf", "budget", "trade", "exports", "imports", "gdp", "recession", "markets",
      "central bank", "oil prices", "stock exchange", "startup funding", "valuation",
      "profit", "revenue", "business",
    ],
    section: "news",
    boost: 0.8,
  },
  {
    id: "safety",
    label: "Public Safety & Global Events",
    includes: "Disasters, conflicts, security incidents, significant global developments",
    related: [],
    synonyms: [
      "attack", "violence", "flood", "earthquake", "explosion", "casualties", "rescue",
      "military", "conflict", "war", "emergency", "evacuation", "protest", "strike",
      "outbreak", "pandemic", "clashes", "terror",
    ],
    section: "news",
    boost: 0.9,
  },
  {
    id: "science",
    label: "Science & Research",
    includes: "Space, physics, environment, health studies, research institutions",
    related: [],
    synonyms: [
      "research", "study finds", "scientists", "nasa", "isro", "suparco", "space",
      "telescope", "physics", "quantum", "genomics", "climate", "biology", "medicine",
      "clinical trial", "nobel", "discovery", "experiment",
    ],
    section: "news",
    boost: 0.7,
  },
  {
    id: "govtech",
    label: "Government Programs & Public Opportunities",
    includes: "Public schemes, e-governance, civic tech, official programs",
    related: ["politics"],
    synonyms: [
      "government program", "public scheme", "e-governance", "digital pakistan",
      "nadra", "passport", "bisp", "public portal", "citizen service", "govt initiative",
    ],
    section: "news",
    boost: 0.6,
  },
  {
    id: "finance",
    label: "Finance & Earning",
    includes: "Personal finance, earning platforms, financial industry news",
    related: ["economy"],
    synonyms: [
      "earn money", "income", "salary", "freelancing", "upwork", "fiverr", "payments",
      "fintech", "banking", "easypaisa", "jazzcash", "investing", "savings",
    ],
    section: "news",
    boost: 0.4,
  },
  {
    id: "crypto",
    label: "Cryptocurrency & Blockchain",
    includes: "Crypto markets, blockchain tech, digital assets",
    related: [],
    synonyms: [
      "cryptocurrency", "bitcoin", "ethereum", "token", "nft", "blockchain",
      "web3", "crypto exchange", "stablecoin", "crypto", "cryptocurrencies",
    ],
    section: "it",
    boost: 0.4,
  },
  {
    id: "celebrity",
    label: "Entertainment & Celebrity Gossip",
    includes: "Celebrity news, showbiz, gossip columns, entertainment drama",
    related: [],
    synonyms: [
      "celebrity", "gossip", "showbiz", "bollywood", "lollywood", "hollywood star",
      "tabloid", "red carpet", "dating", "breakup", "wedding ceremony", "fashion show",
      "movie box office", "drama serial", "tiktoker", "influencer", "entertainment",
    ],
    section: "none",
    boost: 0,
  },
  {
    id: "cricket",
    label: "Cricket & Sports",
    includes: "Cricket matches, sports leagues, tournaments",
    related: [],
    synonyms: [
      "cricket", "t20", "odi", "test match", "pcb", "batsman", "bowler", "world cup",
      "ipl", "psl", "sports", "football match", "fifa", "olympics", "hockey",
    ],
    section: "none",
    boost: 0,
  },
];

export const CONCEPT_BY_ID = new Map<string, Concept>(CONCEPTS.map((c) => [c.id, c]));

/**
 * Section membership: which category feeds belong to which primary tab.
 * "More" categories reuse the same taxonomy ids.
 */
export const FEED_CATEGORIES: Array<{
  id: string;
  section: "topnews" | "topit" | "scholarships";
  concepts: string[];
}> = [
  { id: "topnews", section: "topnews", concepts: ["politics", "economy", "safety", "science", "govtech", "finance"] },
  { id: "topit", section: "topit", concepts: ["ai", "softdev", "webdev", "cyber", "cloud", "products", "opensource", "crypto"] },
  { id: "scholarships", section: "scholarships", concepts: ["scholarship"] },
];

export const MORE_CATEGORIES: Array<{ id: string; concepts: string[]; kind?: string }> = [
  { id: "conferences", concepts: ["conferences"] },
  { id: "internships", concepts: ["internships"] },
  { id: "jobs", concepts: ["jobs"] },
  { id: "companies", concepts: ["products"] }, // rankings require a data source (see page)
  { id: "richest", concepts: [] }, // rankings require a data source (see page)
  { id: "earnings", concepts: ["finance"] },
  { id: "business", concepts: ["economy"] },
  { id: "ai-tools", concepts: ["ai", "products"] },
  { id: "courses", concepts: ["courses"] },
  { id: "hackathons", concepts: ["hackathons"] },
  { id: "opensource", concepts: ["opensource"] },
  { id: "gov", concepts: ["govtech"] },
  { id: "science", concepts: ["science"] },
  { id: "finance", concepts: ["economy", "finance"] },
];
