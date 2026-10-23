export interface Country {
  code: string; // ISO 3166-1 alpha-2 (or "WW")
  name: string;
  flag: string; // emoji
  region: string;
}

export const WORLDWIDE: Country = {
  code: "WW",
  name: "Worldwide",
  flag: "🌐",
  region: "Global",
};

// NOTE: "Worldwide" must always be rendered FIRST by every selector.
// "Pakistan" is the app default for all country-based sections.
export const COUNTRIES: Country[] = [
  WORLDWIDE,
  { code: "PK", name: "Pakistan", flag: "🇵🇰", region: "South Asia" },
  { code: "AF", name: "Afghanistan", flag: "🇦🇫", region: "South Asia" },
  { code: "AL", name: "Albania", flag: "🇦🇱", region: "Europe" },
  { code: "DZ", name: "Algeria", flag: "🇩🇿", region: "Africa" },
  { code: "AU", name: "Australia", flag: "🇦🇺", region: "Oceania" },
  { code: "AT", name: "Austria", flag: "🇦🇹", region: "Europe" },
  { code: "AZ", name: "Azerbaijan", flag: "🇦🇿", region: "Asia" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩", region: "South Asia" },
  { code: "BY", name: "Belarus", flag: "🇧🇾", region: "Europe" },
  { code: "BE", name: "Belgium", flag: "🇧🇪", region: "Europe" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", region: "South America" },
  { code: "CA", name: "Canada", flag: "🇨🇦", region: "North America" },
  { code: "CN", name: "China", flag: "🇨🇳", region: "East Asia" },
  { code: "CY", name: "Cyprus", flag: "🇨🇾", region: "Europe" },
  { code: "DK", name: "Denmark", flag: "🇩🇰", region: "Europe" },
  { code: "EG", name: "Egypt", flag: "🇪🇬", region: "Africa" },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹", region: "Africa" },
  { code: "FI", name: "Finland", flag: "🇫🇮", region: "Europe" },
  { code: "FR", name: "France", flag: "🇫🇷", region: "Europe" },
  { code: "GE", name: "Georgia", flag: "🇬🇪", region: "Asia" },
  { code: "DE", name: "Germany", flag: "🇩🇪", region: "Europe" },
  { code: "GH", name: "Ghana", flag: "🇬🇭", region: "Africa" },
  { code: "GR", name: "Greece", flag: "🇬🇷", region: "Europe" },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰", region: "East Asia" },
  { code: "HU", name: "Hungary", flag: "🇭🇺", region: "Europe" },
  { code: "IN", name: "India", flag: "🇮🇳", region: "South Asia" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", region: "South-East Asia" },
  { code: "IR", name: "Iran", flag: "🇮🇷", region: "Asia" },
  { code: "IQ", name: "Iraq", flag: "🇮🇶", region: "Middle East" },
  { code: "IE", name: "Ireland", flag: "🇮🇪", region: "Europe" },
  { code: "IL", name: "Israel", flag: "🇮🇱", region: "Middle East" },
  { code: "IT", name: "Italy", flag: "🇮🇹", region: "Europe" },
  { code: "JP", name: "Japan", flag: "🇯🇵", region: "East Asia" },
  { code: "JO", name: "Jordan", flag: "🇯🇴", region: "Middle East" },
  { code: "KZ", name: "Kazakhstan", flag: "🇰🇿", region: "Asia" },
  { code: "KE", name: "Kenya", flag: "🇰🇪", region: "Africa" },
  { code: "KR", name: "South Korea", flag: "🇰🇷", region: "East Asia" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼", region: "Middle East" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", region: "South-East Asia" },
  { code: "MV", name: "Maldives", flag: "🇲🇻", region: "South Asia" },
  { code: "MT", name: "Malta", flag: "🇲🇹", region: "Europe" },
  { code: "MX", name: "Mexico", flag: "🇲🇽", region: "North America" },
  { code: "MD", name: "Moldova", flag: "🇲🇩", region: "Europe" },
  { code: "MN", name: "Mongolia", flag: "🇲🇳", region: "East Asia" },
  { code: "MA", name: "Morocco", flag: "🇲🇦", region: "Africa" },
  { code: "MM", name: "Myanmar", flag: "🇲🇲", region: "South-East Asia" },
  { code: "NP", name: "Nepal", flag: "🇳🇵", region: "South Asia" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", region: "Europe" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", region: "Oceania" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", region: "Africa" },
  { code: "NO", name: "Norway", flag: "🇳🇴", region: "Europe" },
  { code: "OM", name: "Oman", flag: "🇴🇲", region: "Middle East" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", region: "South-East Asia" },
  { code: "PL", name: "Poland", flag: "🇵🇱", region: "Europe" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", region: "Europe" },
  { code: "QA", name: "Qatar", flag: "🇶🇦", region: "Middle East" },
  { code: "RO", name: "Romania", flag: "🇷🇴", region: "Europe" },
  { code: "RU", name: "Russia", flag: "🇷🇺", region: "Europe/Asia" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", region: "Middle East" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", region: "South-East Asia" },
  { code: "SK", name: "Slovakia", flag: "🇸🇰", region: "Europe" },
  { code: "SI", name: "Slovenia", flag: "🇸🇮", region: "Europe" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", region: "Africa" },
  { code: "ES", name: "Spain", flag: "🇪🇸", region: "Europe" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰", region: "South Asia" },
  { code: "SD", name: "Sudan", flag: "🇸🇩", region: "Africa" },
  { code: "SE", name: "Sweden", flag: "🇸🇪", region: "Europe" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", region: "Europe" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼", region: "East Asia" },
  { code: "TJ", name: "Tajikistan", flag: "🇹🇯", region: "Asia" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿", region: "Africa" },
  { code: "TH", name: "Thailand", flag: "🇹🇭", region: "South-East Asia" },
  { code: "TR", name: "Türkiye", flag: "🇹🇷", region: "Europe/Asia" },
  { code: "UG", name: "Uganda", flag: "🇺🇬", region: "Africa" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦", region: "Europe" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", region: "Middle East" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", region: "Europe" },
  { code: "US", name: "United States", flag: "🇺🇸", region: "North America" },
  { code: "UZ", name: "Uzbekistan", flag: "🇺🇿", region: "Asia" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", region: "South-East Asia" },
];

export const DEFAULT_COUNTRY = "PK";
export const ALL_REGIONS = [...new Set(COUNTRIES.slice(1).map((c) => c.region))].sort();

export function getCountry(code?: string): Country {
  if (!code) return WORLDWIDE;
  return COUNTRIES.find((c) => c.code === code) ?? WORLDWIDE;
}

export function countryLabel(code?: string): string {
  const c = getCountry(code);
  return `${c.flag} ${c.name}`;
}

export function isRegion(code: string): boolean {
  return ALL_REGIONS.includes(code);
}
