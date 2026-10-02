// CONDUIT: case-study copy. Stub reproducing the original entry until the rewrite lands.
import type { ProjectCopy } from "./types";

export default {
  title: "Translating AI Gateway",
  sector: "Developer tools",
  year: "2026",
  description: "A gateway that lets Claude Code and Codex CLI run on the Kiro backend. It dispatches the AWS event stream by header to capture real tokens, credits and reasoning, and tees every rewrite to SAGA.",
  stack: ["Python", "FastAPI", "AWS"],
  intro: { heading: "Translating AI Gateway", body: ["A gateway that lets Claude Code and Codex CLI run on the Kiro backend. It dispatches the AWS event stream by header to capture real tokens, credits and reasoning, and tees every rewrite to SAGA."] },
  sections: [],
} satisfies ProjectCopy;
