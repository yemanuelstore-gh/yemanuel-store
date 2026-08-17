// Historical customer master dataset generator for Yemanuel Store.
//
// Produces exactly 9,847 realistic Ghanaian customers registered between the
// store's first operating day (Monday 17 January 2022) and the current date,
// on operating days only (Monday–Saturday; Sundays the store is closed).
//
// Outputs (deterministic — fixed RNG seed):
//   - scripts/customer-data/customers.json                  (the dataset)
//   - scripts/customer-data/customer-validation-report.json (validation report)
//
// The dataset is master data ONLY. It deliberately does NOT fabricate
// lifetime spending, order counts or revenue. Each customer carries a
// behavioural `segment` (one_time | occasional | regular | frequent | vip |
// business_buyer | corporate_buyer) that later historical transaction
// generation can use to shape realistic order behaviour.
//
// Schema mapping notes (customers table, stage 3 migration):
//   - customer_type enum is ('individual', 'business'). The generated
//     "corporate" customer type maps to 'business' at insert time.
//   - phone is stored as +233 XX XXX XXXX (matches the seeded owner profile).
//   - locations live in customer_addresses (city_id / region_id); the schema
//     has no country column — all addresses are Ghanaian by construction.
//   - customers.created_by must be an auth.users id; the seed migration
//     resolves it to the Owner staff record (YS-OWNER-0001).
//
// Run: node scripts/generate-customer-history.mjs

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = `${__dirname}/..`;
const dataDir = `${root}/scripts/customer-data`;

const TARGET_TOTAL = 9847;
const BUSINESS_START = new Date(Date.UTC(2022, 0, 17));
const SEED = 20260817;

// ---------------------------------------------------------------------------
// Deterministic RNG (mulberry32)
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function pickWeighted(rng, pairs) {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [value, w] of pairs) {
    r -= w;
    if (r < 0) return value;
  }
  return pairs[pairs.length - 1][0];
}

function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

function isBusinessDay(date) {
  return date.getUTCDay() !== 0;
}

function addDaysUtc(date, days) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function businessDaysInRange(start, end) {
  const days = [];
  let cursor = start;
  while (cursor <= end) {
    if (isBusinessDay(cursor)) days.push(cursor);
    cursor = addDaysUtc(cursor, 1);
  }
  return days;
}

function startOfDayUtc(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

const pad2 = (n) => String(n).padStart(2, "0");

function formatDate(d) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function formatTimestamp(d) {
  return `${formatDate(d)}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:00Z`;
}

// ---------------------------------------------------------------------------
// Ghanaian name pools (by community)
// ---------------------------------------------------------------------------
const WESTERN_FIRST = [
  "Emmanuel", "Michael", "Daniel", "Samuel", "Joseph", "David", "Isaac", "Abraham",
  "Solomon", "Benjamin", "Enoch", "Jonathan", "Peter", "Stephen", "Anthony", "Francis",
  "Charles", "Edward", "William", "George", "Thomas", "Matthew", "Mark", "John", "James",
  "Patrick", "Lawrence", "Richard", "Kenneth", "Eric", "Felix", "Bright", "Prince",
  "Bismark", "Godfred", "Ernest", "Nicholas", "Frederick", "Albert", "Andrew", "Augustine",
];

const WESTERN_FEMALE = [
  "Grace", "Mercy", "Comfort", "Patience", "Esther", "Rebecca", "Sarah", "Mary", "Rose",
  "Georgina", "Joyce", "Lydia", "Deborah", "Ruth", "Dorcas", "Benedicta", "Stella",
  "Gladys", "Victoria", "Elizabeth", "Agnes", "Martha", "Gifty", "Rita", "Diana", "Ivy",
  "Sandra", "Portia", "Matilda", "Abigail", "Hannah", "Naomi", "Eunice", "Emmanuella",
  "Linda", "Cynthia", "Janet", "Gloria", "Beatrice", "Helena", "Florence", "Josephine",
];

const AKAN_MALE = [
  "Kwame", "Kwesi", "Kofi", "Kwabena", "Kwaku", "Yaw", "Kweku", "Akwasi", "Kwadwo",
  "Ebo", "Kobby", "Kojo", "Nana", "Ohene", "Adu", "Kwamena", "Kwamina", "Kweku",
  "Ataa", "Anum", "Kwasi", "Ato",
];

const AKAN_FEMALE = [
  "Ama", "Akosua", "Abena", "Akua", "Yaa", "Afia", "Adwoa", "Esi", "Efua", "Adjoa",
  "Aba", "Ekua", "Araba", "Mansa", "Baaba", "Korkor", "Adwoa", "Akua", "Akosua",
  "Ewurama", "Afia",
];

const EWE_MALE = [
  "Agbeko", "Dela", "Edem", "Elikem", "Kafui", "Kodzo", "Komla", "Kofi", "Kossi",
  "Kwabla", "Kwami", "Kwashie", "Korsi", "Mawuli", "Mawusi", "Sedem", "Senyo", "Yao",
  "Yawovi",
];

const EWE_FEMALE = [
  "Afi", "Ami", "Adzo", "Akorfa", "Aseye", "Dzigbodi", "Dzifa", "Enyonam", "Etse",
  "Fafali", "Kafui", "Kosi", "Mawuena", "Mefa", "Nuku", "Sena", "Yawa", "Adzo",
];

const GA_MALE = [
  "Nii", "Tetteh", "Odai", "Okai", "Adjei", "Amartey", "Ayitey", "Nartey", "Nortey",
  "Lamptey", "Sowah", "Kpakpo", "Ankrah", "Blankson", "Botchway", "Coffie", "Dodoo",
  "Quaye", "Okine", "Adjetey", "Abbey", "Allotey", "Tei", "Tawia", "Kwatei",
];

const GA_FEMALE = [
  "Naa", "Naa-Korkor", "Naa-Adjeley", "Naa-Aba", "Ayorkor", "Korkor", "Adoley",
  "Dedei", "Akuorkor", "Okailey", "Naa-Serwah", "Akuorkor", "Adjeley",
];

const NORTH_MALE = [
  "Abdulai", "Abdul-Rahman", "Abubakari", "Alhassan", "Alidu", "Amin", "Andani",
  "Baba", "Bukari", "Dari", "Dawuda", "Fuseini", "Gariba", "Hamidu", "Ibrahim",
  "Iddrisu", "Imoro", "Issah", "Issifu", "Karim", "Kassim", "Mahama", "Mahamadu",
  "Moro", "Musah", "Nashiru", "Osman", "Rashid", "Saaka", "Salifu", "Seidu",
  "Shaibu", "Sulemana", "Tanko", "Tia", "Yakubu", "Yussif", "Ziblim", "Yahaya",
  "Haruna",
];

const NORTH_FEMALE = [
  "Afishetu", "Amina", "Asana", "Azara", "Faiza", "Fati", "Fuseina", "Habiba",
  "Mariama", "Maryam", "Memunatu", "Ramatu", "Rukayatu", "Sahada", "Salma", "Sanatu",
  "Sawudatu", "Zainabu", "Zenabu", "Adisah",
];

const FANTE_MALE = [
  "Kofi", "Ekow", "Ebo", "Kwame", "Kobina", "Kwesi", "Kweku", "Kwamina", "Kwabena",
  "Ato", "Paa-Kofi", "Paa-Kwesi", "Egya",
];

const FANTE_FEMALE = [
  "Ama", "Aba", "Ekua", "Efua", "Araba", "Mansa", "Esi", "Adwoa", "Eba", "Abena",
  "Awo",
];

const AKAN_SURNAMES = [
  "Mensah", "Owusu", "Osei", "Asante", "Boateng", "Appiah", "Ofori", "Annan", "Opoku",
  "Agyeman", "Asare", "Amoah", "Antwi", "Adjei", "Agyei", "Boakye", "Buabeng", "Danso",
  "Darko", "Frimpong", "Gyasi", "Kwarteng", "Obeng", "Poku", "Sarpong", "Tuffour",
  "Boadu", "Kyei", "Twumasi", "Amoako", "Asamoah", "Yeboah", "Nyarko", "Donkor",
  "Ampofo", "Nkrumah", "Kwakye", "Okyere", "Sarfo", "Acheampong", "Addo", "Afriyie",
  "Agyapong", "Akoto", "Amankwah", "Amponsah", "Anane", "Ansong", "Asiedu", "Awuah",
  "Baffoe", "Bediako", "Bonsu", "Debrah", "Djan", "Doku", "Effah", "Ennin", "Koranteng",
  "Kotei", "Kumi", "Kusi", "Marfo", "Mireku", "Nkansah", "Ntow", "Nyame", "Obiri",
  "Ohene", "Okrah", "Owiredu", "Prempeh", "Sekyi", "Sintim", "Takyi", "Twum", "Wiafe",
  "Yamoah", "Ahenkora", "Annor", "Atta", "Bannerman", "Bekoe", "Boadi", "Boahen",
  "Boamah", "Dadzie", "Appiagyei", "Arhin", "Apraku", "Owusu-Ansah", "Asante-Boateng",
];

const FANTE_SURNAMES = [
  "Aidoo", "Amissah", "Aikins", "Anaman", "Arthur", "Ato", "Biney", "Cann", "Eghan",
  "Eshun", "Essel", "Eyiah", "Forson", "Fynn", "Gyan", "Hayford", "Idun", "Inkoom",
  "Koomson", "Nketsia", "Quansah", "Sam", "Tandoh", "Yorke", "Ackon", "Aggrey",
  "Asmah", "Crentsil", "Edusei", "Yankah",
];

const EWE_SURNAMES = [
  "Adzika", "Agbeko", "Agbozo", "Ahiable", "Akuetteh", "Amegashie", "Amenuvor",
  "Amewuga", "Anani", "Anku", "Ashitey", "Atisu", "Atsu", "Azumah", "Bensah",
  "Degbey", "Dogbe", "Dotse", "Dzokoto", "Fiagbedzi", "Fianko", "Gadzekpo",
  "Gbedemah", "Glover", "Hevi", "Horgli", "Kpodo", "Kudjoe", "Kumahor", "Lawluvi",
  "Letsa", "Mawutor", "Nukunu", "Nyaku", "Ocloo", "Quist", "Segbefia", "Seshie",
  "Siaw", "Tsikata", "Vidzro", "Wogbe", "Yao", "Zodzogah", "Agudey", "Atorkui",
  "Nutakor", "Seddoh", "Torgbor", "Tsagli", "Vorsah", "Ametorwodzie", "Avenorgbo",
];

const GA_SURNAMES = [
  "Adjetey", "Allotey", "Ammah", "Anang", "Ankrah", "Armah", "Aryee", "Ashong",
  "Ayitey", "Blankson", "Bortey", "Botchway", "Codjoe", "Coffie", "Commey",
  "Cudjoe", "Djaba", "Dodoo", "Dowuona", "Gaisie", "Hagan", "Hesse", "Kotey",
  "Laryea", "Nartey", "Nortey", "Ntow", "Ocansey", "Odonkor", "Okantey", "Okpoti",
  "Oto", "Otoo", "Quarshie", "Quashie", "Quaye", "Quayson", "Sakyi", "Sowah",
  "Tagoe", "Tawia", "Tei", "Tetteh", "Thompson", "Vanderpuye", "Abbey", "Ammah",
  "Doodo", "Nartey",
];

const NORTH_SURNAMES = [
  "Abdulai", "Abukari", "Alhassan", "Alidu", "Andani", "Baba", "Bawah", "Bukari",
  "Dari", "Dawuni", "Duut", "Fuseini", "Gariba", "Gandaa", "Imoro", "Issah",
  "Issifu", "Jibreel", "Karim", "Kassim", "Mahama", "Mahamadu", "Moro", "Musah",
  "Naab", "Nantogmah", "Osman", "Saaka", "Salifu", "Seidu", "Shaibu", "Sulemana",
  "Tahiru", "Tampuri", "Tanko", "Tia", "Yahuza", "Yakubu", "Yidana", "Ziblim",
  "Zongo", "Anyass", "Balogu", "Basiru", "Bawa", "Dawuda", "Dokurugu", "Douti",
  "Hamidu", "Iddrisu", "Kologo", "Pwavra",
];

const OTHER_SURNAMES = [
  "Amoaning", "Ansong", "Apim", "Asiedu", "Atiemo", "Ato", "Baako", "Bonsu",
  "Dabo", "Debrah", "Edjah", "Ennin", "Frempong", "Ghansah", "Kabutey", "Kodua",
  "Kwafo", "Mantey", "Nsiah", "Okae", "Opare", "Paley", "Pobee", "Quainoo",
  "Sackey", "Sefah", "Simons", "Taylor", "Wilson", "Ampaw", "Andoh", "Ashun",
  "Asubonteng", "Awotwe", "Borquaye", "Brempong", "Damptey", "Ghartey", "Larbi",
  "Minkah", "Owoo", "Saforo", "Teiko", "Teye", "Tutu", "Yalley", "Baidoo",
  "Djanie", "Ewusi", "Jaiteh", "Kareem", "Kwaw", "Amissah", "Oklah",
];

const EXPAT_MALE_FIRST = [
  "David", "James", "Michael", "Daniel", "Thomas", "Robert", "Christopher", "William",
  "Matthew", "Andrew", "Paul", "Mark", "Adam", "Ryan", "Kevin", "Brian", "Peter",
  "Jack", "Alexander", "Henry", "Oliver", "Lucas", "George", "Max", "Louis", "Hugo",
  "Eric", "Elias", "Samir", "Fadi", "Georges", "Elie", "Karim", "Rajesh", "Amit",
  "Anil", "Sanjay", "Vikram", "Wei", "Jian", "Hong", "Pieter", "Johan", "Thabo",
  "Sipho", "Kgosi", "Chinedu", "Adewale", "Olumide", "Tunde", "Emeka", "Femi",
  "Chukwuma", "Kamau", "Otieno", "Kevin", "John",
];

const EXPAT_FEMALE_FIRST = [
  "Sarah", "Emily", "Rachel", "Victoria", "Jessica", "Amanda", "Lauren", "Charlotte",
  "Hannah", "Emma", "Lucy", "Sophie", "Olivia", "Isabella", "Mia", "Ella", "Zoe",
  "Chloe", "Lily", "Ruby", "Nora", "Alice", "Freya", "Eva", "Maya", "Nina", "Clara",
  "Ava", "Nadia", "Marie", "Rana", "Leila", "Priya", "Sunita", "Meera", "Kavita",
  "Deepa", "Mei", "Li", "Fang", "Annelie", "Naledi", "Zanele", "Lerato", "Chinwe",
  "Ngozi", "Ifeoma", "Nneka", "Chiamaka", "Adaeze", "Wanjiru", "Njeri", "Achieng",
  "Wambui",
];

const EXPAT_SURNAMES = [
  "Whitfield", "Mitchell", "Reynolds", "Carrington", "Hughes", "Davies", "Murphy",
  "O'Connell", "Sullivan", "Barnes", "Palmer", "Walsh", "Doyle", "Fitzgerald",
  "Murray", "Kennedy", "Gallagher", "Quinn", "Stewart", "McAllister", "Adeyemi",
  "Okafor", "Okonkwo", "Adeleke", "Eze", "Obi", "Balogun", "Aliyu", "Khoury",
  "Haddad", "Saab", "Nasser", "Saliba", "Fakhoury", "Mattar", "Chalhoub", "Chamoun",
  "Patel", "Sharma", "Reddy", "Desai", "Mehta", "Nair", "Rao", "Iyer", "Pillai",
  "Chen", "Zhang", "Wang", "Liu", "Zhao", "Huang", "Wu", "Zhou", "Sun",
  "van der Merwe", "Botha", "Naidoo", "Mokoena", "du Plessis", "Pretorius",
  "Nkosi", "van Wyk", "Sithole", "Molefe", "Ochieng", "Odhiambo", "Kamau",
  "Wanjiru", "Mwangi", "Gichuru", "Dubois", "Laurent", "Moreau", "Petit", "Roux",
  "Fontaine", "Girard", "Weber", "Schmidt", "Fischer", "Schneider", "Wagner",
];

// First-name pools by ethnicity (male/female split handled by gender picker).
const ETHNIC_NAME_POOLS = {
  akan: { male: AKAN_MALE, female: AKAN_FEMALE, surnames: AKAN_SURNAMES },
  fante: { male: FANTE_MALE, female: FANTE_FEMALE, surnames: [...FANTE_SURNAMES, ...AKAN_SURNAMES] },
  ewe: { male: EWE_MALE, female: EWE_FEMALE, surnames: EWE_SURNAMES },
  ga: { male: GA_MALE, female: GA_FEMALE, surnames: GA_SURNAMES },
  north: { male: NORTH_MALE, female: NORTH_FEMALE, surnames: NORTH_SURNAMES },
  other: { male: [...WESTERN_FIRST, ...AKAN_MALE], female: [...WESTERN_FEMALE, ...AKAN_FEMALE], surnames: OTHER_SURNAMES },
  expat: { male: EXPAT_MALE_FIRST, female: EXPAT_FEMALE_FIRST, surnames: EXPAT_SURNAMES },
};

// Ethnicity weighting for Ghanaian-born customers.
const ETHNICITY_WEIGHTS = [
  ["akan", 42],
  ["fante", 12],
  ["ewe", 14],
  ["ga", 10],
  ["north", 13],
  ["other", 9],
];

const GENDERS = [
  ["male", 50],
  ["female", 50],
];

// ---------------------------------------------------------------------------
// Company name pools (Ghanaian businesses and corporates)
// ---------------------------------------------------------------------------
const COMPANY_PREFIXES = [
  "Adom", "Sika", "Gold", "Golden", "Akwaaba", "Sankofa", "Adepa", "Barimah",
  "Nkosuo", "Osagyefo", "Asante", "Kwahu", "Denkyira", "Akyem", "Twifo",
  "Agona", "Keta", "Ada", "Winneba", "Elmina", "Obuasi", "Nkawkaw", "Aburi",
  "Akosombo", "Hohoe", "Yendi", "Bolgatanga", "Techiman", "Kintampo", "Bawku",
  "Sefwi", "Berekum", "Dormaa", "Tema", "Accra", "Kumasi", "Cape Coast",
  "Tamale", "Sunyani", "Koforidua", "Osu", "Achimota", "Madina", "Spintex",
  "Airport", "Dansoman", "Kaneshie", "Kasoa", "Teshie", "Nungua", "Labadi",
  "East Legon", "Adenta", "Takoradi", "Sekondi", "Ho", "Wa", "Volta",
  "Greater Accra", "Ghana", "Ghanaian", "National", "Royal", "Premier",
  "First", "Top", "Prime", "Allied", "Unity", "Union", "Sunrise", "Sunset",
  "Ocean", "Atlantic", "Coastal", "High Street", "Market", "Central",
];

const COMPANY_NOUNS = [
  "Trading", "Ventures", "Enterprises", "Investments", "Logistics", "Transport",
  "Shipping", "Haulage", "Courier", "Delivery", "Farms", "Agro", "Foods",
  "Fresh Produce", "Bakery", "Beverages", "Textiles", "Fashion", "Apparel",
  "Footwear", "Boutique", "Beauty", "Cosmetics", "Pharmacy", "Healthcare",
  "Medical", "Construction", "Building Materials", "Hardware", "Electrical",
  "Electronics", "Mobile", "Communication", "IT", "Computing", "Printing",
  "Publishing", "Media", "Realty", "Properties", "Hotels", "Hospitality",
  "Restaurant", "Catering", "Oil", "Gas", "Fuels", "Energy", "Mining",
  "Gold", "Minerals", "Auto", "Motors", "Spare Parts", "Tyres", "Furniture",
  "Home Décor", "Lighting", "Security", "Cleaning", "Jewellery", "Art",
  "Crafts", "Consulting", "Financial", "Insurance", "Microfinance",
  "Savings", "Import", "Export", "Wholesale", "Distribution", "Retail",
  "Supermarket", "Stores", "General Merchandise", "Supplies", "Services",
  "Engineering", "Industrial", "Packaging", "Aluminium", "Plastics",
];

const COMPANY_SUFFIXES_SMALL = [
  "Trading", "Ventures", "Enterprises", "& Sons", "& Daughters", "& Co",
  "General Merchant", "Shop", "Stores",
];

const COMPANY_SUFFIXES_CORPORATE = [
  "Ltd", "Limited", "Ghana Ltd", "Ghana Limited", "Co. Ltd", "PLC",
  "Group Ltd", "Holdings Ltd", "JV Ltd",
];

// ---------------------------------------------------------------------------
// Locations — mirrors the seeded regions/cities (stage 3 migration).
// ---------------------------------------------------------------------------
const REGIONS = {
  ACC: { name: "Greater Accra", weight: 55, cities: [["Accra", 62], ["Tema", 13], ["Madina", 6], ["Adenta", 5], ["Ashaiman", 4], ["Teshie", 4], ["Nungua", 4], ["Dansoman", 2]] },
  ASH: { name: "Ashanti", weight: 11, cities: [["Kumasi", 78], ["Obuasi", 8], ["Ejisu", 4], ["Mampong", 3], ["Bekwai", 3], ["Konongo-Odumase", 2], ["Agogo", 2]] },
  CEN: { name: "Central", weight: 7, cities: [["Cape Coast", 30], ["Kasoa", 30], ["Winneba", 15], ["Elmina", 8], ["Agona Swedru", 7], ["Saltpond", 5], ["Dunkwa-on-Offin", 5]] },
  EAS: { name: "Eastern", weight: 6, cities: [["Koforidua", 35], ["Nkawkaw", 18], ["Suhum", 12], ["Asamankese", 10], ["Aburi", 8], ["Mpraeso", 7], ["Kibi", 5], ["Akim Oda", 5]] },
  WES: { name: "Western", weight: 4.5, cities: [["Sekondi-Takoradi", 70], ["Tarkwa", 15], ["Axim", 5], ["Prestea", 4], ["Bogoso", 3], ["Half Assini", 3]] },
  VOL: { name: "Volta", weight: 4, cities: [["Ho", 40], ["Hohoe", 20], ["Aflao", 15], ["Keta", 10], ["Kpando", 7], ["Anloga", 4], ["Dzodze", 4]] },
  NOR: { name: "Northern", weight: 4, cities: [["Tamale", 70], ["Yendi", 12], ["Savelugu", 8], ["Bimbilla", 6], ["Gushegu", 4]] },
  BON: { name: "Bono", weight: 2, cities: [["Sunyani", 60], ["Berekum", 20], ["Dormaa Ahenkro", 10], ["Wenchi", 10]] },
  UPE: { name: "Upper East", weight: 1.5, cities: [["Bolgatanga", 60], ["Navrongo", 15], ["Bawku", 15], ["Zebilla", 5], ["Bongo", 5]] },
  BOE: { name: "Bono East", weight: 1.5, cities: [["Techiman", 60], ["Nkoranza", 15], ["Kintampo", 15], ["Yeji", 5], ["Atebubu", 5]] },
  UPW: { name: "Upper West", weight: 0.9, cities: [["Wa", 65], ["Nandom", 10], ["Lawra", 10], ["Tumu", 8], ["Jirapa", 7]] },
  OTI: { name: "Oti", weight: 0.7, cities: [["Nkwanta", 40], ["Kete-Krachi", 30], ["Dambai", 20], ["Jasikan", 10]] },
  AHA: { name: "Ahafo", weight: 0.6, cities: [["Goaso", 45], ["Bechem", 20], ["Mim", 20], ["Duayaw-Nkwanta", 15]] },
  WEN: { name: "Western North", weight: 0.5, cities: [["Sefwi Wiawso", 55], ["Sefwi Akontombra", 25], ["Enchi", 20]] },
  SAV: { name: "Savannah", weight: 0.4, cities: [["Damongo", 40], ["Salaga", 30], ["Bole", 20], ["Sawla", 10]] },
  NOE: { name: "North East", weight: 0.4, cities: [["Walewale", 45], ["Nalerigu", 25], ["Gambaga", 15], ["Chereponi", 15]] },
};

const REGION_POSTAL_PREFIX = {
  ACC: "GA", ASH: "AK", CEN: "CR", EAS: "ER", WES: "WR", VOL: "TV", NOR: "NR",
  UPE: "UE", UPW: "UW", BON: "BA", BOE: "BE", AHA: "AH", SAV: "SV", NOE: "NE",
  OTI: "OT", WEN: "WN",
};

// Street pools (address_line_1) by region code; generic fallback for all.
const STREETS = {
  ACC: [
    "Oxford Street", "Spintex Road", "Boundary Road", "Ring Road Central",
    "Awudome Road", "Dadeban Road", "Kojo Thompson Road", "Pig Farm Road",
    "Kanda Highway", "Achimota College Road", "Madina-Zongo Junction Road",
    "Agbogba Road", "Pantang Road", "Adenta-Kwabenya Road", "Community 1 Road",
    "Community 11 Road", "Sakumono Road", "Nungua Barrier Road", "Teshie Road",
    "Dansoman High Street", "Kaneshie-Odorkor Road", "Winneba Road",
    "Nsawam Road", "Accra-Cape Coast Road", "East Legon Ritz Junction Road",
    "Airport Residential Avenue", "Cantonments Road", "Osu Main Road",
    "Labadi Beach Road", "Okponglo Road", "Atomic Junction Road",
  ],
  ASH: [
    "Adum Road", "Bantama Road", "Asafo Market Road", "Kejetia Road",
    "Old Tafo Road", "Suame Magazine Road", "Ahodwo Road", "Asokwa Road",
    "Santasi Road", "Daban Road", "Anloga Junction Road", "Krofrom Road",
  ],
  WES: [
    "Market Circle Road", "Harbour Road", "Airport Ridge Road", "Anaji Road",
    "Effiakuma Road", "Nkotompo Road", "South Fiebu Road", "Tanokrom Road",
    "Sekondi-Takoradi Road",
  ],
  CEN: [
    "High Street", "Abura Road", "Kotokuraba Road", "Pedu Road", "Adisadel Road",
    "Siwdu Road", "Ola Road", "Cape Coast-Takoradi Road", "Kasoa New Town Road",
  ],
  EAS: [
    "Jackson Park Road", "Srodae Road", "Oyoko Road", "Effiduase Road",
    "Nkawkaw-Bolgatanga Road", "Asamankese Junction Road", "Aburi Road",
  ],
  VOL: [
    "Kpodzi Road", "Jireh Road", "SSNIT Flats Road", "Bankoe Road", "Aflao Road",
    "Keta Road", "Hohoe-Borikorpe Road",
  ],
  NOR: [
    "Aboabo Road", "Dabokpa Road", "Gumani Road", "Sagnarigu Road", "Kukuo Road",
    "Yendi Road", "Kaladan Road", "Tamale-Techiman Road",
  ],
  UPE: [
    "Zuarungu Road", "Sherigu Road", "Pungu Road", "Navrongo Road", "Bawku Road",
  ],
  UPW: [
    "Kunfabia Road", "Nakori Road", "Kambali Road", "Sombo Road", "Lawra Road",
  ],
  BON: [
    "Market Road", "Fiapre Road", "Abesim Road", "Chiraa Road", "Berekum Road",
  ],
  BOE: [
    "Techiman Main Market Road", "Kintampo Road", "Nkoranza Road", "Yeji Road",
  ],
  AHA: ["Goaso Market Road", "Bechem Road", "Mim Road", "Duayaw-Nkwanta Road"],
  SAV: ["Damongo Road", "Salaga Road", "Bole Road", "Sawla Road"],
  NOE: ["Nalerigu Road", "Walewale Road", "Gambaga Road", "Chereponi Road"],
  OTI: ["Dambai Road", "Kete-Krachi Road", "Nkwanta Road", "Jasikan Road"],
  WEN: ["Sefwi Wiawso Road", "Enchi Road", "Sefwi Akontombra Road"],
};

const GENERIC_STREETS = [
  "Main Street", "Station Road", "Market Street", "Hospital Road",
  "Central Market Road", "Old Town Road", "Post Office Road", "School Road",
];

// ---------------------------------------------------------------------------
// Phone numbers — Ghanaian mobile prefixes (MTN, Telecel, AT, Glo).
// ---------------------------------------------------------------------------
const PHONE_PREFIXES = [
  ["20", 14], ["23", 1], ["24", 20], ["25", 4], ["26", 5], ["27", 3], ["28", 4],
  ["50", 12], ["54", 10], ["55", 12], ["56", 4], ["57", 6], ["59", 5],
];

function randomGhanaPhone(rng) {
  const prefix = pickWeighted(rng, PHONE_PREFIXES);
  let digits = "";
  for (let i = 0; i < 7; i++) digits += String(randInt(rng, 0, 9));
  return `+233 ${prefix} ${digits.slice(0, 3)} ${digits.slice(3)}`;
}

const EMAIL_DOMAINS = [
  ["gmail.com", 42], ["yahoo.com", 24], ["outlook.com", 11], ["hotmail.com", 6],
  ["icloud.com", 5], ["aol.com", 3], ["proton.me", 2], ["yandex.com", 1],
  ["mail.com", 3], ["mtn.com.gh", 2], ["zoho.com", 1],
];

const COMPANY_EMAIL_DOMAINS = [
  ["com", 42], ["com.gh", 22], ["gh", 14], ["net", 8], ["co.gh", 8], ["org", 6],
];

const COMPANY_EMAIL_LOCALS = ["info", "sales", "accounts", "hello", "admin", "orders", "enquiries"];

const EMAIL_DOMAIN_SUFFIXES = ["", "0", "1", "2", "3", "5", "7", "9", "87", "21", "94", "06", "05"];

// ---------------------------------------------------------------------------
// Customer type, segment and status distributions.
// ---------------------------------------------------------------------------
const CUSTOMER_TYPE_WEIGHTS = [
  ["individual", 88],
  ["business", 9.5],
  ["corporate", 2.5],
];

const SEGMENT_WEIGHTS = {
  individual: [["one_time", 37], ["occasional", 25], ["regular", 17], ["frequent", 12], ["vip", 9]],
};

const STATUS_WEIGHTS = [
  ["active", 94],
  ["inactive", 5],
  ["blocked", 1],
];

const EMAIL_PROBABILITY = { individual: 0.72, business: 0.96, corporate: 1.0 };
const TIN_PROBABILITY = { individual: 0.01, business: 0.35, corporate: 0.85 };

// ---------------------------------------------------------------------------
// Registration date distribution.
// Targets by year (must sum to 9,847). Dates fall on business days only.
// ---------------------------------------------------------------------------
const YEAR_TARGETS = [
  [2022, 1183],
  [2023, 1746],
  [2024, 2013],
  [2025, 2694],
  [2026, 2211],
];

// Monthly seasonality (Jan..Dec) — festive peaks around Christmas, New Year,
// Easter and back-to-school; leaner middle months.
const MONTH_SEASONALITY = [1.08, 0.96, 1.02, 1.06, 0.94, 0.9, 0.84, 0.92, 1.04, 1.08, 1.12, 1.28];

const MAX_SAME_DAY = 30;

// ---------------------------------------------------------------------------
// Dataset assembly
// ---------------------------------------------------------------------------
function buildRegions() {
  return Object.entries(REGIONS).map(([code, info]) => ({
    code,
    name: info.name,
    cities: info.cities.map(([name]) => name),
  }));
}

const EXPAT_AREAS = ["Airport Residential", "East Legon", "Cantonments", "Osu", "Ridge", "Labone", "Roman Ridge", "Dzorwulu", "North Ridge"];

const EXPAT_STREETS = [
  "Boundary Road", "Cantonments Road", "Osu Badu Street", "10th Street",
  "8th Street", "Senchi Street", "Ameda Street", "Opeibea Street",
  "Olive Road", "1st Avenue", "2nd Avenue", "3rd Avenue", "6th Avenue",
  "Ghana Road", "Mango Tree Avenue", "Palace View Road",
];

function pickLocation(rng, isExpat) {
  if (isExpat) {
    return { regionCode: "ACC", city: "Accra", area: pick(rng, EXPAT_AREAS) };
  }
  const regionCode = pickWeighted(
    rng,
    Object.entries(REGIONS).map(([code, info]) => [code, info.weight]),
  );
  const city = pickWeighted(rng, REGIONS[regionCode].cities);
  return { regionCode, city, area: null };
}

function makeAddress(rng, customer, location, recipientName) {
  const regionCode = location.regionCode;
  const isExpat = location.area !== null;
  const streetPool = isExpat ? EXPAT_STREETS : STREETS[regionCode] ?? GENERIC_STREETS;
  const street = pick(rng, streetPool);
  const streetPrefix = rng() < 0.3 ? "Plot " : "";
  const house = streetPrefix !== "" ? randInt(rng, 1, 400) : randInt(rng, 1, 250);
  const line1 = `${streetPrefix}${house} ${street}${isExpat ? `, ${location.area}` : ""}`;
  const postalPrefix = REGION_POSTAL_PREFIX[regionCode];
  const postal = rng() < 0.8 ? `${postalPrefix}-${pad2(randInt(rng, 1, 99))}-${String(randInt(rng, 1, 9999)).padStart(4, "0")}` : null;
  return {
    label: customer.customerType === "individual" ? "Home" : "Business",
    recipientName,
    recipientPhone: customer.phone,
    addressLine1: line1.trim(),
    addressLine2: null,
    city: location.city,
    regionCode,
    postalCode: postal,
    isDefaultBilling: true,
    isDefaultDelivery: true,
  };
}

function makeBusinessName(rng, corporate) {
  const suffix = corporate
    ? pick(rng, COMPANY_SUFFIXES_CORPORATE)
    : rng() < 0.6
      ? pick(rng, COMPANY_SUFFIXES_CORPORATE)
      : pick(rng, COMPANY_SUFFIXES_SMALL);
  const prefix = pick(rng, COMPANY_PREFIXES);
  const noun = pick(rng, COMPANY_NOUNS);
  return {
    name: `${prefix} ${noun} ${suffix}`,
    slug: slugify(`${prefix} ${noun}`),
  };
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 24);
}

function makeEmail(rng, firstName, lastName, business, customerType) {
  const isBusiness = customerType !== "individual";
  if (isBusiness) {
    const domain = pickWeighted(rng, COMPANY_EMAIL_DOMAINS);
    const local = pick(rng, COMPANY_EMAIL_LOCALS);
    return `${local}@${business.slug}.${domain}`;
  }
  const domain = pickWeighted(rng, EMAIL_DOMAINS);
  const first = firstName.toLowerCase().replace(/[^a-z]/g, "");
  const last = lastName.toLowerCase().replace(/[^a-z]/g, "");
  const handlePatterns = [
    `${first}.${last}`,
    `${first}${last}`,
    `${first[0]}.${last}`,
    `${first}.${last}`,
    `${first}${last}`,
    `${first[0]}${last}`,
  ];
  const base = pick(rng, handlePatterns);
  const suffix = rng() < 0.28 ? pick(rng, EMAIL_DOMAIN_SUFFIXES) : "";
  return `${base}${suffix}@${domain}`;
}

function makeTin(rng) {
  let tin = "";
  for (let i = 0; i < 12; i++) tin += String(randInt(rng, 0, 9));
  return tin;
}

function makeFullName(rng) {
  const ethnicity = pickWeighted(rng, ETHNICITY_WEIGHTS);
  const gender = pickWeighted(rng, GENDERS);
  const pool = ETHNIC_NAME_POOLS[ethnicity];
  const firstName = pick(rng, pool[gender]);
  let surname = pick(rng, pool.surnames);
  let guard = 0;
  while (surname === firstName && guard < 20) {
    surname = pick(rng, pool.surnames);
    guard += 1;
  }
  return { firstName, lastName: surname, gender, ethnicity, expat: false };
}

function buildDayPool(year, today) {
  let start = new Date(Date.UTC(year, 0, 1));
  if (year === BUSINESS_START.getUTCFullYear()) start = BUSINESS_START;
  let end = new Date(Date.UTC(year, 11, 31));
  if (year === today.getUTCFullYear()) end = startOfDayUtc(today);
  const days = businessDaysInRange(start, end);
  const weights = days.map((d, i) => {
    const month = d.getUTCMonth();
    const season = MONTH_SEASONALITY[month];
    const growth = 1 + 0.12 * (i / Math.max(1, days.length - 1));
    return season * growth;
  });
  return { days, weights };
}

function pickWeightedDay(rng, dayPool) {
  const total = dayPool.weights.reduce((s, w) => s + w, 0);
  let r = rng() * total;
  for (let i = 0; i < dayPool.days.length; i++) {
    r -= dayPool.weights[i];
    if (r < 0) return dayPool.days[i];
  }
  return dayPool.days[dayPool.days.length - 1];
}

function pickRegistrationTime(rng, day, now) {
  const hour = randInt(rng, 8, 18);
  const minute = hour === 18 ? randInt(rng, 0, 30) : randInt(rng, 0, 59);
  let time = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, minute));
  if (time > now) {
    time = new Date(Date.UTC(
      day.getUTCFullYear(),
      day.getUTCMonth(),
      day.getUTCDate(),
      Math.min(now.getUTCHours(), 18),
      now.getUTCMinutes(),
    ));
  }
  return time;
}

function main() {
  const rng = mulberry32(SEED);
  const now = new Date();
  const today = startOfDayUtc(now);
  const todayStr = formatDate(today);

  if (BUSINESS_START >= today) {
    throw new Error("Business start date must be before today.");
  }

  // Sanity: year targets sum to the target total.
  const targetSum = YEAR_TARGETS.reduce((s, [, n]) => s + n, 0);
  if (targetSum !== TARGET_TOTAL) {
    throw new Error(`Year targets sum to ${targetSum}, expected ${TARGET_TOTAL}.`);
  }

  // Build per-year business-day pools once.
  const dayPools = new Map();
  for (const [year] of YEAR_TARGETS) {
    dayPools.set(year, buildDayPool(year, today));
  }

  // Deterministic shuffled customer codes (CUS-XXXXXXXX, app convention).
  const codes = [];
  while (codes.length < TARGET_TOTAL) {
    let hex = "";
    for (let i = 0; i < 8; i++) hex += "0123456789ABCDEF"[Math.floor(rng() * 16)];
    codes.push(`CUS-${hex}`);
  }
  const codeSet = new Set(codes);
  if (codeSet.size !== TARGET_TOTAL) {
    throw new Error("Collision in generated customer codes.");
  }

  const usedPhones = new Set();
  const usedEmails = new Set();
  const usedTins = new Set();
  const usedFullNames = new Set();
  const usedEmailsLower = new Set();
  const usedSlugs = new Set();
  const sameDayCounts = new Map();

  const customers = [];

  // Map each sequential customer index to its registration year.
  const yearByIndex = new Array(TARGET_TOTAL);
  {
    let idx = 0;
    for (const [year, count] of YEAR_TARGETS) {
      for (let k = 0; k < count; k++) yearByIndex[idx++] = year;
    }
  }

  for (let i = 0; i < TARGET_TOTAL; i++) {
    const customerType = pickWeighted(rng, CUSTOMER_TYPE_WEIGHTS);
    const isExpat = rng() < 0.015 && customerType === "individual";

    // Full name (businesses get a contact name too).
    let name;
    let attempts = 0;
    do {
      name = makeFullName(rng);
      if (isExpat) {
        const gender = pickWeighted(rng, GENDERS);
        const pool = ETHNIC_NAME_POOLS.expat;
        name = { firstName: pick(rng, pool[gender]), lastName: pick(rng, pool.surnames), gender, ethnicity: "expat", expat: true };
      }
      attempts += 1;
    } while (usedFullNames.has(`${name.firstName} ${name.lastName}`) && attempts < 50);
    usedFullNames.add(`${name.firstName} ${name.lastName}`);

    // Unique Ghanaian phone.
    let phone;
    do {
      phone = randomGhanaPhone(rng);
    } while (usedPhones.has(phone));
    usedPhones.add(phone);

    // Business details (unique company slug → unique company email domain).
    let businessName = null;
    let tin = null;
    if (customerType !== "individual") {
      let guard = 0;
      do {
        businessName = makeBusinessName(rng, customerType === "corporate");
        guard += 1;
      } while (usedSlugs.has(businessName.slug) && guard < 60);
      usedSlugs.add(businessName.slug);
      if (rng() < TIN_PROBABILITY[customerType]) {
        do {
          tin = makeTin(rng);
        } while (usedTins.has(tin));
        usedTins.add(tin);
      }
    } else if (rng() < TIN_PROBABILITY.individual) {
      do {
        tin = makeTin(rng);
      } while (usedTins.has(tin));
      usedTins.add(tin);
    }

    // Email (unique; some customers legitimately have none).
    let email = null;
    if (rng() < EMAIL_PROBABILITY[customerType]) {
      let candidate;
      let guard = 0;
      do {
        candidate = makeEmail(rng, name.firstName, name.lastName, businessName, customerType);
        guard += 1;
      } while (usedEmailsLower.has(candidate.toLowerCase()) && guard < 200);
      usedEmails.add(candidate);
      usedEmailsLower.add(candidate.toLowerCase());
      email = candidate;
    }

    // Segment + notes.
    let segment;
    let notes = null;
    if (customerType === "corporate") {
      segment = "corporate_buyer";
      notes = "Corporate account";
    } else if (customerType === "business") {
      segment = "business_buyer";
    } else {
      segment = pickWeighted(rng, SEGMENT_WEIGHTS.individual);
      if (segment === "vip") notes = "VIP customer";
    }
    if (isExpat) notes = notes ? `${notes}; Expatriate customer` : "Expatriate customer";

    // Status.
    const status = pickWeighted(rng, STATUS_WEIGHTS);

    // Registration date on an operating day.
    const year = yearByIndex[i];
    const yearPool = dayPools.get(year);
    let day;
    let dayGuard = 0;
    do {
      day = pickWeightedDay(rng, yearPool);
      dayGuard += 1;
    } while ((sameDayCounts.get(formatDate(day)) ?? 0) >= MAX_SAME_DAY && dayGuard < 200);
    sameDayCounts.set(formatDate(day), (sameDayCounts.get(formatDate(day)) ?? 0) + 1);
    const createdAt = pickRegistrationTime(rng, day, new Date());

    // Address.
    const location = pickLocation(rng, isExpat);
    const businessDisplayName = businessName ? businessName.name : null;
    const recipient = customerType === "individual" ? `${name.firstName} ${name.lastName}` : businessDisplayName;
    const address = makeAddress(rng, { customerType, phone }, location, recipient);

    customers.push({
      customerCode: codes[i],
      customerType,
      segment,
      status,
      firstName: name.firstName,
      lastName: name.lastName,
      businessName: businessDisplayName,
      phone,
      email,
      tinNumber: tin,
      notes,
      createdAt: formatTimestamp(createdAt),
      address,
    });
  }

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------
  const phoneSet = new Set();
  const emailSet = new Set();
  const codeSet2 = new Set();
  const tinSet = new Set();
  let dupPhones = 0;
  let dupEmails = 0;
  let dupCodes = 0;
  let dupTins = 0;
  let invalidPhones = 0;
  let sundayCount = 0;
  let outOfRange = 0;
  let invalidRegionCity = 0;
  let futureDates = 0;
  const missingEmail = [];
  const byYear = {};
  const byRegion = {};
  const byType = {};
  const bySegment = {};
  const byStatus = {};
  const cityRegion = new Map(
    Object.entries(REGIONS).map(([code, info]) => [code, new Set(info.cities.map(([c]) => c))]),
  );
  const phoneRegex = /^\+233 (20|23|24|25|26|27|28|50|54|55|56|57|59) \d{3} \d{4}$/;

  for (const c of customers) {
    const code = c.customerCode;
    const phone = c.phone;
    const email = c.email ? c.email.toLowerCase() : null;
    const created = new Date(c.createdAt);
    const year = created.getUTCFullYear();
    const region = c.address.regionCode;

    if (codeSet2.has(code)) dupCodes += 1;
    else codeSet2.add(code);
    if (phoneSet.has(phone)) dupPhones += 1;
    else phoneSet.add(phone);
    if (email) {
      if (emailSet.has(email)) dupEmails += 1;
      else emailSet.add(email);
    }
    if (c.tinNumber) {
      if (tinSet.has(c.tinNumber)) dupTins += 1;
      else tinSet.add(c.tinNumber);
    }
    if (!phoneRegex.test(phone)) invalidPhones += 1;
    if (created.getUTCDay() === 0) sundayCount += 1;
    if (created < BUSINESS_START || created > now) {
      outOfRange += 1;
      if (created > now) futureDates += 1;
    }
    if (!cityRegion.has(region) || !cityRegion.get(region).has(c.address.city)) {
      invalidRegionCity += 1;
    }
    if (!c.email) missingEmail.push(c.customerCode);
    byYear[year] = (byYear[year] ?? 0) + 1;
    byRegion[region] = (byRegion[region] ?? 0) + 1;
    byType[c.customerType] = (byType[c.customerType] ?? 0) + 1;
    bySegment[c.segment] = (bySegment[c.segment] ?? 0) + 1;
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
  }

  const dates = customers.map((c) => new Date(c.createdAt).getTime());
  const report = {
    generated_at: `${formatTimestamp(new Date())}`,
    as_of: todayStr,
    seed: SEED,
    target_total: TARGET_TOTAL,
    total_customers: customers.length,
    customers_by_year: byYear,
    customers_by_region: byRegion,
    customers_by_type: byType,
    customers_by_segment: bySegment,
    customers_by_status: byStatus,
    missing_email_count: missingEmail.length,
    duplicate_phone_count: dupPhones,
    duplicate_email_count: dupEmails,
    duplicate_customer_code_count: dupCodes,
    duplicate_tin_count: dupTins,
    invalid_phone_count: invalidPhones,
    sunday_dated_records: sundayCount,
    out_of_range_records: outOfRange,
    future_dated_records: futureDates,
    invalid_region_city_records: invalidRegionCity,
    date_range: {
      min: formatTimestamp(new Date(Math.min(...dates))),
      max: formatTimestamp(new Date(Math.max(...dates))),
    },
    valid:
      customers.length === TARGET_TOTAL &&
      dupCodes === 0 &&
      dupPhones === 0 &&
      dupEmails === 0 &&
      dupTins === 0 &&
      invalidPhones === 0 &&
      sundayCount === 0 &&
      outOfRange === 0 &&
      futureDates === 0 &&
      invalidRegionCity === 0,
  };

  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  writeFileSync(`${dataDir}/customers.json`, JSON.stringify({ as_of: todayStr, seed: SEED, customers }, null, 2));
  writeFileSync(`${dataDir}/customer-validation-report.json`, JSON.stringify(report, null, 2));

  // -------------------------------------------------------------------------
  // Console report
  // -------------------------------------------------------------------------
  console.log("=== Yemanuel Store — Historical Customer Dataset ===");
  console.log(`Generated at:   ${report.generated_at}`);
  console.log(`As of date:     ${report.as_of}`);
  console.log(`Seed:           ${report.seed}`);
  console.log(`Total customers: ${report.total_customers} (target ${report.target_total})`);
  console.log("");
  console.log("Customers by year:");
  for (const [y, n] of Object.entries(byYear)) console.log(`  ${y}: ${n}`);
  console.log("");
  console.log("Customers by region:");
  for (const [code, n] of Object.entries(byRegion)) {
    console.log(`  ${code} (${REGIONS[code].name}): ${n}`);
  }
  console.log("");
  console.log("Customers by type:");
  for (const [t, n] of Object.entries(byType)) console.log(`  ${t}: ${n}`);
  console.log("");
  console.log("Customers by segment:");
  for (const [s, n] of Object.entries(bySegment)) console.log(`  ${s}: ${n}`);
  console.log("");
  console.log("Customers by status:");
  for (const [s, n] of Object.entries(byStatus)) console.log(`  ${s}: ${n}`);
  console.log("");
  console.log(`Missing email:             ${report.missing_email_count}`);
  console.log(`Duplicate phone:           ${report.duplicate_phone_count}`);
  console.log(`Duplicate email:           ${report.duplicate_email_count}`);
  console.log(`Duplicate customer code:   ${report.duplicate_customer_code_count}`);
  console.log(`Duplicate TIN:             ${report.duplicate_tin_count}`);
  console.log(`Invalid phone:             ${report.invalid_phone_count}`);
  console.log(`Sunday-dated records:      ${report.sunday_dated_records}`);
  console.log(`Out-of-range records:      ${report.out_of_range_records}`);
  console.log(`Future-dated records:      ${report.future_dated_records}`);
  console.log(`Invalid region/city:       ${report.invalid_region_city_records}`);
  console.log(`Date range:                ${report.date_range.min} → ${report.date_range.max}`);
  console.log("");
  console.log(`VALID: ${report.valid ? "YES — 9,847 unique customers, ready for approval." : "NO — fix issues before insertion."}`);
  console.log("");
  console.log(`Output: ${dataDir}/customers.json`);
  console.log(`Report: ${dataDir}/customer-validation-report.json`);
}

main();
