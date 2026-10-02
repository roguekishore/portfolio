// QUANT: case-study copy. Stub reproducing the original entry until the rewrite lands.
import type { ProjectCopy } from "./types";

export default {
  title: "MT5 Trading Analytics",
  sector: "Fintech",
  year: "2026",
  description: "A self-hosted, read-only analytics service for a MetaTrader 5 account. It rebuilds round-turn trades from raw broker deals, buckets them by calendar day, and serves them to a calendar-first dashboard.",
  stack: ["Python", "FastAPI", "SQLite", "Next.js", "React", "TypeScript", "Tailwind", "Docker", "Terraform"],
  intro: { heading: "MT5 Trading Analytics", body: ["A self-hosted, read-only analytics service for a MetaTrader 5 account. It rebuilds round-turn trades from raw broker deals, buckets them by calendar day, and serves them to a calendar-first dashboard."] },
  sections: [],
} satisfies ProjectCopy;
