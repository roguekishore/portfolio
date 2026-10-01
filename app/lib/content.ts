// All copy is original placeholder text for a fictional studio ("Orbe").
// Clients, people and addresses are invented; domains use the reserved
// .example TLD.

export type MediaVariant = "rings" | "rays" | "glow" | "dots" | "wave" | "curve" | "tiles" | "dusk";

export const studio = {
  name: "Orbe",
  headline: ["We’re Orbe", "An independent studio"],
  intro: {
    lead: "We build brands for the people making what comes next. Three studios, one team, steered by curiosity, candour, and care.",
    tail: "Visit us in Lisbon, Oslo, and Melbourne.",
  },
  pageLabel: "Index",
};

// Only "Work" has a page; the rest stay "#" until those routes are built.
export const nav = [
  { label: "Work", hint: "Selected projects", href: "/work" },
  { label: "About", hint: "Who we are", href: "#" },
  { label: "Services", hint: "How we help", href: "#" },
  { label: "Latest", hint: "Notes and news", href: "#" },
  { label: "Careers", hint: "Open roles", href: "#" },
  { label: "Contact", hint: "Start a project", href: "#" },
];

export const channels = ["Instagram", "Journal", "Podcast", "Newsletter"];

export type Project = {
  slug: string;
  client: string;
  title: string;
  year: string;
  sector: string;
  description: string;
  media: MediaVariant;
  tint: string;
  mark: string;
  markColor: string;
};

export const projects: Project[] = [
  {
    slug: "halden-rail",
    client: "Halden Rail",
    title: "A timetable you can feel",
    year: "2026",
    sector: "Transport",
    description:
      "Halden Rail moves forty million people a year, yet riders described it as invisible until something went wrong. We rebuilt the identity around rhythm: a typeface drawn from departure boards, a signal palette tuned for low light, and motion that keeps pace with the trains themselves. The result is a network that finally announces itself with confidence.",
    media: "rings",
    tint: "#3b0d36",
    mark: "halden",
    markColor: "#f6e9f2",
  },
  {
    slug: "lumen-credit",
    client: "Lumen Credit",
    title: "Banking without the fog",
    year: "2025",
    sector: "Finance",
    description:
      "A challenger bank with a clear product and a cluttered voice. Over nine months we stripped the brand back to a single idea, light as clarity, and carried it through an adaptive logo, a calm interface kit, and a tone of voice that explains money the way a good friend would. Sign-ups doubled in the first quarter after launch.",
    media: "glow",
    tint: "#f1ece4",
    mark: "lumen",
    markColor: "#ff6a1a",
  },
  {
    slug: "parallax-os",
    client: "Parallax OS",
    title: "An interface for the next decade",
    year: "2025",
    sector: "Technology",
    description:
      "Parallax asked for an identity that could live on a boot screen, a billboard and a wristwatch at once. We designed a modular mark built from layered planes, a motion language based on depth rather than speed, and a system of gradients that shift with the time of day on every device it touches.",
    media: "rays",
    tint: "#c97a5a",
    mark: "parallax",
    markColor: "#fff4ea",
  },
  {
    slug: "pebble-kids",
    client: "Pebble Kids",
    title: "Wearables that ask kids to play",
    year: "2024",
    sector: "Wearables",
    description:
      "A first watch for children needs to win over two audiences: kids who want fun and parents who want peace of mind. We built a bright, tactile world of characters and sounds for one, and a reassuring, plain-spoken layer for the other, so the product feels like a toy on the wrist and a promise in the box.",
    media: "dots",
    tint: "#1d3b2a",
    mark: "pebble",
    markColor: "#d8ff5a",
  },
  {
    slug: "wayfare",
    client: "Wayfare",
    title: "Every road, every reason",
    year: "2025",
    sector: "Travel",
    description:
      "Wayfare had two decades of honest traveller reviews and a brand that looked like every booking site. We refocused it on the people writing those reviews, with an identity built from route lines and handwritten notes, a bolder green, and a campaign platform that puts real journeys ahead of discount codes.",
    media: "wave",
    tint: "#14e05a",
    mark: "wayfare",
    markColor: "#062b14",
  },
];

export type NewsItem = {
  title: string;
  excerpt?: string;
  tag: string;
  date: string;
  media: MediaVariant;
};

export const news: NewsItem[] = [
  {
    title: "Why regional studios are setting the pace for global brands",
    excerpt:
      "Our Melbourne lead on building identities far from the usual capitals, and why distance has turned out to be a creative advantage rather than a handicap.",
    tag: "Press",
    date: "Mon 14 Sep",
    media: "dusk",
  },
  {
    title: "Orbe opens a third studio in Oslo",
    tag: "Studio",
    date: "Thu 27 Aug",
    media: "tiles",
  },
  {
    title: "Inside the new identity for Halden Rail",
    tag: "Press",
    date: "Tue 04 Aug",
    media: "curve",
  },
];

export const contact = [
  { label: "Press + Media", lines: ["For interviews, assets, and press kits."], links: ["press@orbe.example"] },
  { label: "Recruitment", lines: ["One team across three cities."], links: ["See open roles"] },
  { label: "Channels", lines: [], links: ["Journal", "Podcast", "Instagram", "LinkedIn", "Bluesky"] },
];

export const offices = [
  { code: "LIS", city: "Lisbon", email: "lisbon@orbe.example", tz: "Europe/Lisbon" },
  { code: "OSL", city: "Oslo", email: "oslo@orbe.example", tz: "Europe/Oslo" },
  { code: "MEL", city: "Melbourne", email: "melbourne@orbe.example", tz: "Australia/Melbourne" },
];

export const legal = ["Privacy Policy", "Terms of Use", "Cookies"];
export const copyright = "© 2019—2026";

// ---------------------------------------------------------------------------
// Work index and case studies (original placeholder copy).

export type Visual = { variant: MediaVariant; tint?: string; mark?: string; markColor?: string; video?: boolean };

export type CaseModule =
  | { type: "chapter"; id: string; label: string; heading?: string; body: string[] }
  | { type: "media"; visual: Visual; caption?: string }
  | { type: "pair"; left: Visual; right: Visual }
  | { type: "quote"; text: string; name: string; role: string };

export type CaseStudy = {
  intro: { heading: string; body: string[] };
  hero: Visual;
  modules: CaseModule[];
  credits: string;
};

export const workCopy = {
  heading: "Our work",
  subheading: "Brands that perform in the real world",
  views: [
    { label: "Projects", description: "Identities, products and campaigns from the last few years.", href: "/work" },
    { label: "Partnerships", description: "Long-running relationships and what they built over time.", href: "#" },
  ],
  filterPrompt: "Show me work in…",
  featured: "northline",
  count: "Featured projects",
};

export const categories = [
  { slug: "identity-systems", name: "Identity and brand systems", thumb: { variant: "rings", tint: "#3b0d36" } },
  { slug: "product-brands", name: "Brands for products", thumb: { variant: "glow", tint: "#f1ece4" } },
  { slug: "digital", name: "Digital experiences", thumb: { variant: "dots", tint: "#1d3b2a" } },
  { slug: "motion", name: "Motion and sound", thumb: { variant: "wave", tint: "#14e05a" } },
  { slug: "campaigns", name: "Campaigns", thumb: { variant: "rays", tint: "#c97a5a" } },
  { slug: "early-stage", name: "Early-stage brands", thumb: { variant: "tiles", tint: "#e9e4da" } },
] satisfies { slug: string; name: string; thumb: Visual }[];

const v = (variant: MediaVariant, tint?: string, mark?: string, markColor?: string, video = false): Visual => ({ variant, tint, mark, markColor, video });

// Five more fictional clients so the index has enough cards to read as a grid.
export const moreProjects: Project[] = [
  {
    slug: "kiln-gallery",
    client: "Kiln Gallery",
    title: "A museum that opens outward",
    year: "2025",
    sector: "Culture",
    description: "A regional gallery repositioned as a civic living room, with a flexible identity built from its brick façade.",
    media: "tiles",
    tint: "#e7dccb",
    mark: "kiln",
    markColor: "#7a2e12",
  },
  {
    slug: "tern-air",
    client: "Tern Air",
    title: "Short hops, long memory",
    year: "2024",
    sector: "Aviation",
    description: "An island airline rebuilt around the feeling of arriving, from boarding passes to cabin sound.",
    media: "curve",
    tint: "#0f2a3d",
    mark: "tern",
    markColor: "#d9f1ff",
  },
  {
    slug: "northline",
    client: "Northline",
    title: "Coffee with a compass",
    year: "2026",
    sector: "Food & drink",
    description: "A roaster's packaging system that maps every bean to the hillside it came from.",
    media: "glow",
    tint: "#2b1a12",
    mark: "northline",
    markColor: "#ffcf8a",
  },
  {
    slug: "quarry-health",
    client: "Quarry Health",
    title: "Care that speaks plainly",
    year: "2025",
    sector: "Health",
    description: "A clinic network's voice and wayfinding rewritten for people who are tired, worried, or in a hurry.",
    media: "dusk",
    tint: "#6d7f86",
    mark: "quarry",
    markColor: "#f4f7f8",
  },
  {
    slug: "signal-fm",
    client: "Signal FM",
    title: "A station for every mood",
    year: "2024",
    sector: "Media",
    description: "A community radio station with a sonic logo that changes key through the day.",
    media: "rays",
    tint: "#2d1458",
    mark: "signal",
    markColor: "#ffd1f3",
  },
];

// Index order (and therefore "next project" order).
export const allProjects: Project[] = (() => {
  const bySlug = Object.fromEntries([...projects, ...moreProjects].map((p) => [p.slug, p]));
  return ["halden-rail", "kiln-gallery", "lumen-credit", "tern-air", "parallax-os", "northline", "pebble-kids", "quarry-health", "wayfare", "signal-fm"].map((s) => bySlug[s]);
})();

export const projectCategories: Record<string, string[]> = {
  "halden-rail": ["identity-systems", "motion"],
  "kiln-gallery": ["identity-systems", "digital"],
  "lumen-credit": ["digital", "product-brands"],
  "tern-air": ["campaigns", "motion"],
  "parallax-os": ["product-brands", "digital"],
  northline: ["product-brands", "early-stage"],
  "pebble-kids": ["product-brands", "campaigns"],
  "quarry-health": ["identity-systems"],
  wayfare: ["campaigns", "digital"],
  "signal-fm": ["motion", "early-stage"],
};

export const caseStudies: Record<string, CaseStudy> = {
  // Chapters with headings, interleaved with media; ends on a quote.
  "halden-rail": {
    intro: {
      heading: "Making a network visible again",
      body: [
        "Halden Rail had become part of the scenery. Riders trusted the trains but could not picture the company behind them, and every service change arrived as a surprise.",
        "The brief was to give the network a face without adding noise: something calm enough for a platform at 6am and bold enough for a national campaign.",
      ],
    },
    hero: v("rings", "#3b0d36", "halden", "#f6e9f2", true),
    modules: [
      { type: "media", visual: v("curve", "#2b1030", undefined, undefined, true) },
      { type: "chapter", id: "the-rhythm", label: "The rhythm", heading: "Designing to the timetable", body: ["We spent a month riding every line at different hours and logged how information was actually read: in glances, while walking, over shoulders.", "That rhythm became the system. Type sizes step with viewing distance, colour marks direction, and motion matches the cadence of an arrival board."] },
      { type: "pair", left: v("tiles", "#e9e4da"), right: v("rings", "#4a1043") },
      { type: "media", visual: v("dots", "#1d1030") },
      { type: "chapter", id: "the-typeface", label: "The typeface", heading: "Letters built for departure boards", body: ["Halden Sans grew out of the old flap displays. Its numerals share one width so times never jitter, and its capitals hold their shape at forty metres."] },
      { type: "pair", left: v("wave", "#f6e9f2"), right: v("curve", "#3b0d36") },
      { type: "media", visual: v("rays", "#5a1550", "halden", "#fff", true) },
      { type: "chapter", id: "on-the-line", label: "On the line", heading: "From timetable to train wrap", body: ["The system now runs across 380 stations, the app, staff uniforms and the trains themselves.", "Each touchpoint uses the same three-part grid, so a poster, a phone screen and a carriage all feel like pages of one book."] },
      { type: "pair", left: v("glow", "#f1ece4"), right: v("tiles", "#d8cbe0") },
      { type: "media", visual: v("rings", "#2b0a28") },
      { type: "quote", text: "For the first time in years, people describe us by name instead of by the line they ride. That is what we hoped a brand could do.", name: "Ines Varga", role: "Director of Customer Experience, Halden Rail" },
    ],
    credits: "With thanks to the Halden Rail operations team, the drivers who let us ride up front, and the station staff who tested every sign.",
  },
  // Short chapters, long runs of media; ends on a captioned video.
  "lumen-credit": {
    intro: {
      heading: "Clarity as a product feature",
      body: ["Lumen's product was simple; its brand was not. Five years of growth had left four logos, two tones of voice and a homepage nobody could summarise.", "We stripped it back to a single idea, light as clarity, and let that idea decide everything else."],
    },
    hero: v("glow", "#f1ece4", "lumen", "#ff6a1a", true),
    modules: [
      { type: "chapter", id: "strategy", label: "Strategy", body: ["Interviews with two hundred customers showed one pattern: trust came from understanding, not reassurance. The brand would explain before it promised."] },
      { type: "media", visual: v("glow", "#ffe2c8", undefined, undefined, true) },
      { type: "chapter", id: "identity", label: "Identity", body: ["The new mark is a single aperture that widens as an account grows. It animates open on login and narrows to a point on statements."] },
      { type: "media", visual: v("rings", "#fff1e4") },
      { type: "pair", left: v("glow", "#ff8a3d"), right: v("tiles", "#f4e9dd") },
      { type: "media", visual: v("dusk", "#cfc3b6") },
      { type: "media", visual: v("rays", "#e46a3f", "lumen", "#fff4ea", true) },
      { type: "pair", left: v("dots", "#2b1a12"), right: v("glow", "#ffd0a8") },
      { type: "chapter", id: "application", label: "Application", body: ["Across the app, cards, and branches, interface and identity share one palette and a single typeface, so a balance screen and a billboard read as the same voice."] },
      { type: "media", visual: v("tiles", "#f1ece4") },
      { type: "pair", left: v("curve", "#3a2318"), right: v("glow", "#ff6a1a") },
      { type: "chapter", id: "outcome", label: "Outcome", body: ["Sign-ups doubled in the quarter after launch and support calls about fees fell by a third."] },
      { type: "media", visual: v("glow", "#1c120c", undefined, undefined, true), caption: "The launch film below was shot entirely in Lumen branches after hours." },
    ],
    credits: "Thanks to the Lumen product and support teams, and to every customer who sat through an hour of questions about money.",
  },
  // Pairs and media alternating.
  "parallax-os": {
    intro: {
      heading: "One identity, every screen size",
      body: ["Parallax needed an identity that could live on a boot screen, a billboard and a watch face without losing itself.", "We designed in layers: a mark made of planes, a motion language based on depth, and gradients that follow the time of day."],
    },
    hero: v("rays", "#c97a5a", "parallax", "#fff4ea", true),
    modules: [
      { type: "chapter", id: "strategy", label: "Strategy", body: ["Rather than a logo that scales, we built a set of rules that rebuild the mark for each surface, from 16 pixels to 16 metres."] },
      { type: "pair", left: v("rays", "#b5603f"), right: v("glow", "#f6d7c4") },
      { type: "media", visual: v("curve", "#2a1712", undefined, undefined, true) },
      { type: "chapter", id: "identity", label: "Identity", body: ["The mark is three offset planes. Their spacing encodes context: tight on hardware, open on marketing, animated in the interface."] },
      { type: "pair", left: v("tiles", "#efe2d6"), right: v("dots", "#3a1f16") },
      { type: "media", visual: v("glow", "#f4c9a8", "parallax", "#3a1f16") },
      { type: "pair", left: v("rings", "#4a2a1e"), right: v("rays", "#d88a66") },
      { type: "chapter", id: "application", label: "Application", body: ["Boot sequence, wallpapers, packaging and keynote stage all draw from the same depth system."] },
      { type: "media", visual: v("rays", "#c97a5a", undefined, undefined, true) },
      { type: "pair", left: v("dusk", "#8a6a5c"), right: v("curve", "#c97a5a") },
      { type: "chapter", id: "outcome", label: "Outcome", body: ["The identity shipped on launch day across forty devices and has not needed a single exception since."] },
      { type: "pair", left: v("glow", "#fff1e6"), right: v("tiles", "#c97a5a") },
    ],
    credits: "Thanks to the Parallax design and hardware teams for letting us take apart a prototype or two.",
  },
  "pebble-kids": {
    intro: {
      heading: "A toy on the wrist, a promise in the box",
      body: ["Pebble's first watch had to win over two audiences at once: children who wanted fun, and parents who wanted peace of mind."],
    },
    hero: v("dots", "#1d3b2a", "pebble", "#d8ff5a", true),
    modules: [
      { type: "media", visual: v("dots", "#16301f", undefined, undefined, true) },
      { type: "pair", left: v("tiles", "#d8ff5a"), right: v("rings", "#1d3b2a") },
      { type: "chapter", id: "characters", label: "Characters", heading: "A cast that grows up with you", body: ["Twelve characters live on the watch face. Each one learns a new trick as a child reaches an activity goal, so the reward is a story rather than a badge."] },
      { type: "media", visual: v("wave", "#d8ff5a") },
      { type: "quote", text: "My daughter asks to go for walks now, just to see what the fox will do next.", name: "Early tester", role: "Parent, pilot programme" },
      { type: "chapter", id: "for-parents", label: "For parents", heading: "The quiet layer", body: ["Packaging, the companion app and the safety settings use a calmer tone and fewer colours, so the serious parts never feel like a game."] },
      { type: "pair", left: v("glow", "#eef7d9"), right: v("dots", "#d8ff5a") },
      { type: "media", visual: v("tiles", "#1d3b2a", "pebble", "#d8ff5a", true) },
    ],
    credits: "Thanks to the Pebble team and the forty families who wore prototypes for a month.",
  },
  wayfare: {
    intro: {
      heading: "Putting travellers back in the picture",
      body: ["Wayfare had two decades of honest reviews and a brand that looked like every booking site. We refocused it on the people writing those reviews."],
    },
    hero: v("wave", "#14e05a", "wayfare", "#062b14", true),
    modules: [
      { type: "chapter", id: "strategy", label: "Strategy", body: ["Every Wayfare review is a small story. The brand would collect them, credit them and let them lead."] },
      { type: "media", visual: v("wave", "#0fbf4c", undefined, undefined, true) },
      { type: "media", visual: v("tiles", "#e9f7ee") },
      { type: "chapter", id: "identity", label: "Identity", body: ["Route lines drawn from real itineraries form the graphic language; handwriting from reviewers becomes the display type."] },
      { type: "pair", left: v("curve", "#062b14"), right: v("wave", "#d4f5df") },
      { type: "media", visual: v("rays", "#14e05a", "wayfare", "#062b14") },
      { type: "media", visual: v("dots", "#062b14") },
      { type: "chapter", id: "outcome", label: "Outcome", body: ["The campaign ran in eleven markets and every headline in it was written by a traveller."] },
      { type: "media", visual: v("wave", "#062b14", undefined, undefined, true), caption: "Every clip in the film below was filmed by Wayfare reviewers on their own trips." },
    ],
    credits: "Thanks to the Wayfare community, whose words did most of the work.",
  },
  "kiln-gallery": {
    intro: {
      heading: "A museum that opens outward",
      body: ["Kiln had a world-class collection and a front door most locals had never walked through.", "We built an identity from the gallery's own brick façade, a module that stacks into posters, signage and a website that changes with the season."],
    },
    hero: v("tiles", "#e7dccb", "kiln", "#7a2e12", true),
    modules: [
      { type: "pair", left: v("tiles", "#d9c7ae"), right: v("dusk", "#a08870") },
      { type: "chapter", id: "the-brick", label: "The brick", heading: "One module, every format", body: ["Every layout is built from the proportions of a single brick. Posters stack them, the website lays them flat, and the shop wraps them around tote bags."] },
      { type: "media", visual: v("tiles", "#7a2e12", "kiln", "#f3e7d6", true) },
      { type: "chapter", id: "the-doors", label: "The doors", heading: "Programming the threshold", body: ["We moved free events to the entrance hall and gave them their own colour so passers-by could see something happening from the street."] },
      { type: "pair", left: v("glow", "#efe1cc"), right: v("tiles", "#c9a77f") },
      { type: "media", visual: v("dusk", "#b9a58d") },
    ],
    credits: "Thanks to the Kiln curators and front-of-house team.",
  },
  "tern-air": {
    intro: {
      heading: "Short hops, long memory",
      body: ["Tern flies forty-minute routes between islands. Nobody remembers the flight, but everybody remembers the arrival."],
    },
    hero: v("curve", "#0f2a3d", "tern", "#d9f1ff", true),
    modules: [
      { type: "chapter", id: "arrival", label: "Arrival", body: ["The identity is built around the moment the coast appears: a horizon line that runs through every layout and slowly brightens."] },
      { type: "media", visual: v("wave", "#123a55", undefined, undefined, true) },
      { type: "pair", left: v("curve", "#d9f1ff"), right: v("rings", "#0f2a3d") },
      { type: "media", visual: v("glow", "#cfe9f7") },
      { type: "chapter", id: "sound", label: "Sound", body: ["A four-note chime plays on boarding and landing, recorded on instruments from each island Tern serves."] },
      { type: "pair", left: v("dots", "#0f2a3d"), right: v("wave", "#9fd3ef") },
      { type: "media", visual: v("rays", "#0f2a3d", "tern", "#d9f1ff", true) },
    ],
    credits: "Thanks to the Tern crews who hummed the chime back to us on every flight.",
  },
  northline: {
    intro: {
      heading: "Coffee with a compass",
      body: ["Northline buys from twelve farms and wanted customers to know exactly which hillside each bag came from."],
    },
    hero: v("glow", "#2b1a12", "northline", "#ffcf8a", true),
    modules: [
      { type: "media", visual: v("curve", "#3a2418") },
      { type: "chapter", id: "the-map", label: "The map", heading: "Every bag is a coordinate", body: ["Each pack carries a contour drawing of its farm, generated from survey data, so no two origins share a label."] },
      { type: "pair", left: v("glow", "#ffcf8a"), right: v("dusk", "#5a4030") },
      { type: "quote", text: "Customers now ask for a farm by name. That never happened before.", name: "Tomás Reid", role: "Founder, Northline" },
      { type: "media", visual: v("tiles", "#2b1a12", "northline", "#ffcf8a", true) },
    ],
    credits: "Thanks to the Northline roastery and the twelve farms behind it.",
  },
  "quarry-health": {
    intro: {
      heading: "Care that speaks plainly",
      body: ["Quarry runs thirty clinics. Patients arrive tired, worried or in a hurry, and the old signage assumed none of that."],
    },
    hero: v("dusk", "#6d7f86", "quarry", "#f4f7f8", true),
    modules: [
      { type: "chapter", id: "voice", label: "Voice", body: ["We rewrote four hundred forms and signs so each one answers a single question in under ten words."] },
      { type: "media", visual: v("dusk", "#8a9aa0") },
      { type: "chapter", id: "wayfinding", label: "Wayfinding", body: ["Rooms are named after colours instead of numbers, and the colour follows you from the reception desk to the door."] },
      { type: "pair", left: v("tiles", "#dfe7ea"), right: v("rings", "#6d7f86") },
      { type: "media", visual: v("glow", "#e9f0f2", undefined, undefined, true) },
      { type: "chapter", id: "outcome", label: "Outcome", body: ["Missed appointments fell by eighteen percent in the first six months."] },
      { type: "pair", left: v("dusk", "#4f5f66"), right: v("tiles", "#6d7f86") },
    ],
    credits: "Thanks to the Quarry nursing staff who tested every sentence.",
  },
  "signal-fm": {
    intro: {
      heading: "A station for every mood",
      body: ["Signal is a community station that changes genre every three hours. Its identity needed to change with it."],
    },
    hero: v("rays", "#2d1458", "signal", "#ffd1f3", true),
    modules: [
      { type: "pair", left: v("wave", "#ffd1f3"), right: v("rays", "#2d1458") },
      { type: "chapter", id: "the-key", label: "The key", heading: "A logo that changes key", body: ["The sonic logo is a five-note phrase transposed through the day, so the morning ident is bright and the late show is low and slow."] },
      { type: "media", visual: v("wave", "#2d1458", undefined, undefined, true) },
      { type: "pair", left: v("dots", "#3d1a74"), right: v("glow", "#ffd1f3") },
      { type: "media", visual: v("rings", "#2d1458", "signal", "#ffd1f3", true) },
    ],
    credits: "Thanks to the Signal volunteers who host every show.",
  },
};

export function projectBySlug(slug: string) {
  return allProjects.find((p) => p.slug === slug);
}

export function nextProject(slug: string) {
  const i = allProjects.findIndex((p) => p.slug === slug);
  return allProjects[(i + 1) % allProjects.length];
}

// Labels shown in the transition loader and the header breadcrumb.
export function routeLabel(pathname: string): { label: string; descriptor: string } {
  if (pathname === "/") return { label: "Index", descriptor: "An independent studio" };
  if (pathname.startsWith("/work")) return { label: "Work", descriptor: "Explore case studies" };
  const p = pathname.startsWith("/projects/") ? projectBySlug(pathname.split("/")[2]) : undefined;
  if (p) return { label: p.client, descriptor: p.title };
  return { label: "Orbe", descriptor: "" };
}
