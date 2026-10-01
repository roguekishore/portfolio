// Site content, ported from the original portfolio (roguekishore.github.io).
// Images and videos live in /public/media. Abstract `variant`s remain as the
// fallback for slots the original has no imagery for.

export type MediaVariant = "rings" | "rays" | "glow" | "dots" | "wave" | "curve" | "tiles" | "dusk";

export type Link = { label: string; href: string };

export const person = {
  name: "Kishore N E",
  role: "Software Engineer",
  location: "Coimbatore, India",
  email: "contactforkishore@gmail.com",
};

export const studio = {
  name: person.name,
  headline: ["I’m Kishore", person.role],
  intro: {
    lead: "I am Kishore N E, a Computer Science and Engineering student, competitive programmer, cloud architect, and full-stack developer.",
    tail: "Driven by unconventional thinking, not afraid to break established norms to engineer solutions that push beyond the ordinary.",
  },
  pageLabel: "Index",
};

export const site = {
  title: "Kishore - Software Engineer",
  description: "Software Engineer From India.",
};

export const nav = [
  { label: "Work", hint: "Selected projects", href: "/work" },
  { label: "About", hint: "Who I am", href: "/#about" },
  { label: "Contact", hint: "Let’s connect", href: "/#contact" },
];

export const channels: Link[] = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/m4verick/" },
  { label: "GitHub", href: "https://github.com/roguekishore" },
  { label: "LeetCode", href: "https://leetcode.com/u/the-maverick/" },
];

// Animated project films (components/film). A film takes precedence over `src`.
export type FilmId = "vantage" | "argus" | "truenorth" | "spicerack" | "truxpert" | "saga";

// Shared media shape for cards, heroes, thumbnails and case-study modules.
// `chapter` loops one chapter of a film; `still` draws a single frame;
// `label` is a small corner tag on case-study tiles.
export type Visual = {
  variant: MediaVariant;
  tint?: string;
  mark?: string;
  markColor?: string;
  video?: boolean;
  src?: string;
  film?: FilmId;
  chapter?: number;
  still?: boolean;
  label?: string;
};

export type Project = {
  slug: string;
  client: string;
  title: string;
  year: string;
  sector: string;
  description: string;
  media: MediaVariant;
  tint: string;
  mark?: string;
  markColor?: string;
  src: string;
  film?: FilmId;
  liveUrl: string;
  githubUrl: string;
  stack: string[];
};

// The visual a project shows wherever it appears as a card or thumbnail.
export const visualOf = (p: Project, extra: Partial<Visual> = {}): Visual => ({ variant: p.media, src: p.src, film: p.film, ...extra });

const M = "/media";

// Index order (and therefore "next project" order), as in the original.
export const allProjects: Project[] = [
  {
    slug: "vantage",
    client: "Vantage",
    title: "Gamified DSA Visualization Engine",
    year: "2025",
    sector: "EdTech",
    description: "A visualization-first gamified approach to learning Data Structures and Algorithms.",
    media: "dots",
    tint: "#141414",
    src: `${M}/vantage.png`,
    film: "vantage",
    liveUrl: "https://vantagecode.tech/",
    githubUrl: "https://github.com/roguekishore/Vantage",
    stack: ["React", "Spring Boot", "MySQL", "AWS", "Docker", "Java", "JavaScript", "Tailwind", "Claude"],
  },
  {
    slug: "argus",
    client: "Argus",
    title: "AI-Powered Governance",
    year: "2025",
    sector: "Civic tech",
    description:
      "AI prioritizes, leadership escalates, and citizens verify closure. No delays — just transparent, accountable governance through an intelligent grievance redressal system.",
    media: "rings",
    tint: "#141414",
    src: `${M}/argus.png`,
    film: "argus",
    liveUrl: "https://argusweb.tech/",
    githubUrl: "https://github.com/roguekishore/Argus",
    stack: ["React", "Spring Boot", "MySQL", "AWS", "Docker", "Java", "JavaScript", "CSS", "Gemini"],
  },
  {
    slug: "true-north",
    client: "True North",
    title: "Productivity & Wellbeing",
    year: "2024",
    sector: "Wellness",
    description:
      "A personal companion for emotional wellness and disciplined habit building. Track moods, journal your thoughts, and build lasting positive routines.",
    media: "glow",
    tint: "#141414",
    src: `${M}/truenorth.jpeg`,
    film: "truenorth",
    liveUrl: "https://thetruenorth.app/",
    githubUrl: "https://github.com/roguekishore/True-North",
    stack: ["React", "Firebase", "JavaScript", "CSS"],
  },
  {
    slug: "spicerack",
    client: "SpiceRack",
    title: "Full-Stack Grocery Platform",
    year: "2024",
    sector: "E-commerce",
    description:
      "A full-stack grocery application that lets users shop, manage inventory, create and discover recipes, plan meals, and get nutritional insights — all in one place.",
    media: "tiles",
    tint: "#141414",
    src: `${M}/spicerack.jpeg`,
    film: "spicerack",
    liveUrl: "https://spicerack.netlify.app/",
    githubUrl: "https://github.com/roguekishore/SpiceRack",
    stack: ["React", "Spring Boot", "MySQL", "AWS", "Docker", "Java", "JavaScript", "CSS"],
  },
  {
    slug: "truxpert",
    client: "Truxpert",
    title: "Food Truck Management",
    year: "2024",
    sector: "SaaS",
    description:
      "A vendor application and management system for food truck registration, review, and inspector assignment in one unified platform.",
    media: "rays",
    tint: "#141414",
    src: `${M}/truxpert.jpeg`,
    film: "truxpert",
    liveUrl: "https://truxpert.app/",
    githubUrl: "https://github.com/roguekishore/Truxpert",
    stack: ["React", "Spring Boot", "MySQL", "AWS", "Docker", "Java", "JavaScript", "CSS"],
  },
  {
    slug: "readify",
    client: "Readify",
    title: "eBook Store",
    year: "2024",
    sector: "E-commerce",
    description:
      "An e-book store with a clean, responsive interface for users to effortlessly browse, search by title, author, or category, and manage their cart.",
    media: "dusk",
    tint: "#141414",
    src: `${M}/readify.mp4`,
    liveUrl: "https://readifystore.netlify.app/",
    githubUrl: "https://github.com/roguekishore/eBook-Store",
    stack: ["React", "JavaScript", "CSS"],
  },
  {
    slug: "ups",
    client: "UPS",
    title: "B2B Lead Generation",
    year: "2024",
    sector: "Industrial",
    description:
      "A professional B2B Product Catalog for an Authorized Honda Dealer with custom Request-for-Quote workflow and sleek industrial design.",
    media: "curve",
    tint: "#141414",
    src: `${M}/ups.jpeg`,
    liveUrl: "https://universalpowersystems.in/",
    githubUrl: "https://github.com/roguekishore/UPS-Lead-Generation-Website",
    stack: ["React", "JavaScript", "CSS"],
  },
  {
    slug: "st-josephs",
    client: "St. Josephs",
    title: "School Landing Page",
    year: "2023",
    sector: "Education",
    description:
      "A modern, responsive landing page redesign for my alma mater — an institution known for excellence in both academics and sports.",
    media: "wave",
    tint: "#141414",
    src: `${M}/stjosephs.png`,
    liveUrl: "https://www.stjosephsondipudur.com/",
    githubUrl: "https://github.com/aswinlegarcon/School-Website-St.Josephs",
    stack: ["HTML", "CSS", "PHP", "JavaScript"],
  },
  {
    slug: "fuel",
    client: "FUEL",
    title: "Scholarship Platform",
    year: "2023",
    sector: "Non-profit",
    description:
      "Fuel is a merit-based scholarship program offering students financial aid, expert mentoring, skill training, and internship opportunities.",
    media: "glow",
    tint: "#141414",
    src: `${M}/fuel.png`,
    liveUrl: "https://fuelmyfuture.org/",
    githubUrl: "https://github.com/aswinlegarcon/project_fuel.git",
    stack: ["PHP", "CSS", "JavaScript"],
  },
  {
    slug: "portfolio",
    client: "My Portfolio",
    title: "Page Design",
    year: "2025",
    sector: "Personal",
    description: "My portfolio is one of my favourite works, encompassing all my coding and UI/UX skills.",
    media: "tiles",
    tint: "#141414",
    src: `${M}/portfolio.png`,
    liveUrl: "https://roguekishore.github.io",
    githubUrl: "https://github.com/roguekishore/Portfolio",
    stack: ["React", "JavaScript", "Tailwind", "CSS"],
  },
  {
    slug: "saga",
    client: "SAGA",
    title: "AI Traffic Observability",
    year: "2026",
    sector: "Developer tools",
    description:
      "A local-first reverse proxy that sits in front of any AI gateway, tees every request into SQLite with secrets scrubbed, and replays it live in a React dashboard.",
    media: "dots",
    tint: "#141414",
    src: "",
    film: "saga",
    liveUrl: "",
    githubUrl: "https://github.com/roguekishore/Saga",
    stack: ["React", "TypeScript", "Bun", "SQLite", "Tailwind"],
  },
];

// Homepage "Our work" shows the first five.
export const projects: Project[] = allProjects.slice(0, 5);

// Repurposed "Studio news" → About: background, education and stack.
export type NewsItem = {
  title: string;
  excerpt?: string;
  tag: string;
  date: string;
  media: MediaVariant;
  src?: string;
  href?: string;
};

export const newsCopy = {
  heading: "About",
  subheading: "Background, education & stack",
  drawerHeading: "About",
};

export const news: NewsItem[] = [
  {
    title: "“Jack of all trades, master of none, but oftentimes better than a master of one.”",
    excerpt: "C++, Java, JavaScript, React, Spring Boot, AWS, Firebase, MySQL, HTML, CSS, Tailwind, Docker and GitHub.",
    tag: "Stack",
    date: person.location,
    media: "dusk",
    src: `${M}/brand-wide.png`,
  },
  {
    title: "Sri Krishna College of Technology",
    excerpt: "B.E. Computer Science and Engineering",
    tag: "Education",
    date: "2023 — 2027",
    media: "tiles",
  },
  {
    title: "St. Joseph’s MHSS",
    excerpt: "Schooling",
    tag: "Education",
    date: "2008 — 2023",
    media: "curve",
    src: `${M}/stjosephs.png`,
  },
];

export const contactCopy = {
  heading: "Let’s connect",
  subheading: "Projects, collaborations and careers",
};

export const contact: { label: string; lines: string[]; links: Link[] }[] = [
  { label: "Email", lines: ["For projects and collaborations."], links: [{ label: person.email, href: `mailto:${person.email}` }] },
  { label: "Recruitment", lines: ["Open to opportunities."], links: [{ label: "LinkedIn", href: channels[0].href }] },
  { label: "Channels", lines: [], links: channels },
];

export const offices = [
  { code: "CBE", city: "Coimbatore", email: person.email, tz: "Asia/Kolkata" },
];

// Image used on the "Say hello" cards (footer and widgets drawer).
export const helloVisual: Visual = { variant: "tiles", src: `${M}/brand.png` };

// Photo stack in the widgets drawer.
export const drawerPhotos: Visual[] = allProjects.slice(0, 4).map((p) => visualOf(p));

export const legal: string[] = [];
export const copyright = `© 2024—2026 ${person.name}`;

// ---------------------------------------------------------------------------
// Work index and case studies.

export type CaseModule =
  | { type: "chapter"; id: string; label: string; heading?: string; body: string[]; links?: Link[] }
  | { type: "media"; visual: Visual; caption?: string }
  | { type: "pair"; left: Visual; right: Visual; wide?: boolean }
  | { type: "quote"; text: string; name: string; role: string };

export type CaseStudy = {
  intro: { heading: string; body: string[] };
  hero: Visual;
  modules: CaseModule[];
  credits?: string;
};

export const workCopy = {
  heading: "Selected work",
  subheading: "Projects from 2023 to 2025",
  views: [{ label: "Projects", description: "Everything I have built and shipped.", href: "/work" }],
  filterPrompt: "Show me work in…",
  featured: "vantage",
  count: "Projects",
};

export const nextCopy = {
  prompt: "Have an idea?",
  promptSub: "Let’s talk.",
  cta: { label: "Get in touch", href: `mailto:${person.email}` },
};

// Filter categories are technologies; counts come from each project's stack.
const techCategories = [
  { slug: "react", name: "React", tech: "React", thumb: "vantage" },
  { slug: "spring-boot", name: "Spring Boot", tech: "Spring Boot", thumb: "argus" },
  { slug: "aws", name: "AWS", tech: "AWS", thumb: "spicerack" },
  { slug: "firebase", name: "Firebase", tech: "Firebase", thumb: "true-north" },
  { slug: "php", name: "PHP", tech: "PHP", thumb: "fuel" },
  { slug: "tailwind", name: "Tailwind", tech: "Tailwind", thumb: "portfolio" },
];

export const categories: { slug: string; name: string; thumb: Visual }[] = techCategories.map((c) => {
  const p = allProjects.find((x) => x.slug === c.thumb)!;
  return { slug: c.slug, name: c.name, thumb: visualOf(p, { still: true }) };
});

export const projectCategories: Record<string, string[]> = Object.fromEntries(
  allProjects.map((p) => [p.slug, techCategories.filter((c) => p.stack.includes(c.tech)).map((c) => c.slug)]),
);

const img = (src: string, variant: MediaVariant = "tiles"): Visual => ({ variant, src });

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Film projects show their film as the hero and one looping tile per chapter:
// one wide frame, then two pairs.
function filmModules(p: Project, labels: string[]): CaseModule[] {
  const tile = (i: number): Visual => ({ variant: p.media, film: p.film, chapter: i, label: `${String(i + 1).padStart(2, "0")} ${labels[i]}` });
  return [
    { type: "media", visual: tile(0) },
    { type: "pair", wide: true, left: tile(1), right: tile(2) },
    { type: "pair", wide: true, left: tile(3), right: tile(4) },
  ];
}

// Chapter names of each film, in order (kept in sync with components/film).
const FILM_CHAPTERS: Record<FilmId, string[]> = {
  vantage: ["Visualize", "Structure", "Battle", "Rank", "Conquer"],
  argus: ["Report", "Classify", "Resolve", "Escalate", "Verify"],
  truenorth: ["Journal", "Track", "Analyze", "Habits", "True north"],
  spicerack: ["Shop", "Pantry", "Recipes", "Plan", "Order"],
  truxpert: ["Register", "Apply", "Review", "Inspect", "Serve"],
  saga: ["Forward", "Redact", "Classify", "Replay", "Retain"],
};

// Every case study: overview from the original description, then the stack and
// links. Film projects lead with their chapters; others keep their screenshots.
function caseFor(p: Project, extra: CaseModule[] = []): CaseStudy {
  const video = !p.film && /\.(mp4|webm)$/i.test(p.src);
  return {
    intro: { heading: p.title, body: [p.description] },
    hero: p.film ? { variant: p.media, film: p.film } : { variant: p.media, src: p.src, video },
    modules: [
      ...(p.film ? filmModules(p, FILM_CHAPTERS[p.film]) : extra),
      { type: "chapter", id: "stack", label: "Stack", body: [p.stack.join(", ") + "."] },
      {
        type: "chapter",
        id: "links",
        label: "Links",
        body: [],
        links: [
          // Local-only tools (no deployment) leave liveUrl empty and show just the source.
          ...(p.liveUrl ? [{ label: `Live — ${hostname(p.liveUrl)}`, href: p.liveUrl }] : []),
          { label: "Source on GitHub", href: p.githubUrl },
        ],
      },
    ],
  };
}

export const caseStudies: Record<string, CaseStudy> = Object.fromEntries(
  allProjects.map((p) => {
    // Screenshot galleries for projects without a film.
    const extra: Record<string, CaseModule[]> = {
      "st-josephs": [{ type: "media", visual: img(`${M}/stjosephs-site.png`) }],
    };
    return [p.slug, caseFor(p, extra[p.slug])];
  }),
);

export function projectBySlug(slug: string) {
  return allProjects.find((p) => p.slug === slug);
}

export function nextProject(slug: string) {
  const i = allProjects.findIndex((p) => p.slug === slug);
  return allProjects[(i + 1) % allProjects.length];
}

// Labels shown in the transition loader and the header breadcrumb.
export function routeLabel(pathname: string): { label: string; descriptor: string } {
  if (pathname === "/" || pathname.startsWith("/#")) return { label: "Index", descriptor: person.role };
  if (pathname.startsWith("/work")) return { label: "Work", descriptor: "Explore projects" };
  const p = pathname.startsWith("/projects/") ? projectBySlug(pathname.split("/")[2]) : undefined;
  if (p) return { label: p.client, descriptor: p.title };
  return { label: person.name, descriptor: "" };
}
