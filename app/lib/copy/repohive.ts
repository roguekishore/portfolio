// RepoHIVE: case-study copy. Every claim traces to a file in local/repos/RepoHIVE or
// local/repos/RepoHIVE-Context; the sources are listed in local/boards/repohive.md.
import type { ProjectCopy } from "./types";

const REPO = "https://github.com/roguekishore/RepoHIVE/blob/main";

export default {
  title: "Adaptive Code Hierarchy Engine",
  sector: "Developer tools",
  year: "2026",
  description:
    "Turns a flat Java dependency graph into a navigable hierarchy by scoring each package on cohesion and coupling, keeping or rebuilding it per region, and recording every decision.",
  stack: ["Next.js", "React", "Tailwind", "TypeScript", "Node.js", "Tree-sitter", "graphology", "Vitest"],
  intro: {
    heading: "A hierarchy that keeps good package boundaries and rebuilds the rest",
    body: [
      "A large codebase arrives as a flat dependency graph: thousands of files and the edges between them, with no level above the file. Developers and AI agents alike have to read far more than they need to find where something lives. Tools that do group the graph impose one strategy everywhere, so a well-designed package gets scrambled by the same clustering that rescues a sprawling one.",
      "RepoHIVE is a three-stage pipeline I built in TypeScript: parse a Java tree into graph.json with Tree-Sitter, group it into a five-file index, and view it one level at a time. The grouping stage treats every declared package as a region, scores it on cohesion and coupling against a single boundary, and decides per region whether to preserve the authored boundary or reconstruct it with seeded community detection.",
      "Every decision is recorded with the measurements behind it, so a run is reproducible and auditable: identical input produces a byte-identical index, and the viewer reads decisions from the record instead of recomputing them. The engine passes 153 core and 181 parser tests, indexes a 2,985-file open-source e-commerce codebase into 502 scored regions, and is exposed through a Next.js viewer, with a read-only MCP server and a packaged CLI built on the same engine on branches not yet merged.",
    ],
  },
  sections: [
    {
      id: "problem",
      label: "Problem",
      heading: "Flat graphs do not navigate, and one grouping rule fits no one",
      after: 0,
      body: [
        "The parser's own output states the problem. graph.json holds files, classes and functions as nodes, and their resolved import, call and shared-type references as edges, nothing more. On a mature multi-module repository that is 29,190 nodes and 14,325 edges, far too many to render at once or to hand an agent as context. Something has to sit above the file: a repository, groups and sub-groups that can be opened one level at a time.",
        "The obvious fix, clustering the whole graph, destroys information. Package boundaries are decisions a developer already made; some are excellent and some are historical accidents. Running Louvain everywhere scrambles the good ones, while trusting packages everywhere leaves the sprawl untouched. RepoHIVE's central claim is that the choice should be made per region, from structure alone, with the measurement that drove it written down.",
      ],
    },
    {
      id: "architecture",
      label: "Architecture",
      heading: "Three stateless stages that hand off through files on disk",
      after: 2,
      body: [
        "parse reads a Java source tree with the WASM build of Tree-Sitter, holding one file's syntax tree at a time and discarding it. A stitcher resolves cross-file references through a symbol table, drops anything that resolves outside the project, and collapses repeated references between the same two entities into one edge carrying three counts: imports, method calls and shared types. Syntax trees are never persisted; graph.json is the artifact.",
        "group reads graph.json and runs ingest, weights, regions, assessment, construction, hierarchy assembly and metadata, then writes index/ as exactly five files: repository, hierarchy, nodes, edges and metadata. view is a Next.js 15 server over that index, with route handlers for blast radius, the per-region decision record and the zoom map that feeds the semantic-zoom canvas; it never computes a score itself.",
        "The JSON contract in packages/shared is the stable seam: the parser writes it and everything else reads it, so adding a field is safe and changing one is a breaking change. Engine packages (shared, parser, core) may never import from ecosystem packages (web, ui, api-client, cli), and that rule currently holds with zero violations.",
      ],
      links: [{ label: "Architecture notes", href: `${REPO}/docs/engineering/architecture.md` }],
    },
    {
      id: "scoring",
      label: "Scoring",
      heading: "One score per region, one boundary, two possible actions",
      after: 4,
      body: [
        "Every file gets exactly one primary region: its declared package, or its most specific directory when no package is declared, namespaced as pkg: or dir: so the two can never collide. Edge strength is imports plus method calls plus shared types, each with coefficient 1. Cohesion is the summed strength of a region's internal edges divided by its file count; coupling is the strength crossing its boundary divided by everything incident to it, a native ratio between 0 and 1.",
        "Cohesion is squashed to c / (c + 1), coupling enters as 1 minus coupling, and the two combine with weights 0.4 and 0.4, renormalized to sum to 1 because the optional Newman modularity term is off by default. A region with fewer than two files, no internal edges or zero internal strength is degenerate and scores exactly 0.0, never NaN. The boundary is 0.5: at or above it the authored boundary is preserved as one group; below it a seeded Louvain run rebuilds the region's groups.",
        "The detector sits behind a CommunityDetector interface with a mulberry32 generator seeded at 42, nodes and edges sorted canonically, and communities relabeled by their smallest member id so the output never depends on the library's numbering. Each decision records cohesion, coupling, score, the automatic action, any user override, a confidence of |score minus boundary| and the ids of the groups it produced.",
      ],
      links: [{ label: "Structural quality assessor", href: `${REPO}/packages/core/src/assessor.ts` }],
    },
    {
      id: "determinism",
      label: "Determinism",
      heading: "Identical input, byte-identical index, and nothing half-written",
      after: 6,
      body: [
        "Determinism was built before any algorithm stage: canonical id ordering, a stable stringifier and content-addressed identifiers. A group's id is g_ followed by the SHA-1 of its sorted membership, so the same files always yield the same id whatever the input order, and the recorded group and parse digests reproduce byte for byte across repeated and shuffled runs.",
        "Configuration is validated before any work starts. A NaN boundary once made every comparison false, silently reconstructed every region and wrote null into metadata that the engine's own index parser then rejected; a single gate now closes that whole class of failure. Every stage returns errors as values, with a backstop that turns a stray throw into a structured error instead of a stack trace.",
        "The index is written all or nothing. The five payloads are rendered in memory, staged into a sibling directory and only then promoted, because a sequential write that failed partway once left a directory of mixed old and new files that still parsed. The parser applies the same rule: if any file fails to parse, nothing is written and the previous graph.json stays intact.",
      ],
      links: [{ label: "Verification gates", href: `${REPO}/docs/engineering/verification.md` }],
    },
    {
      id: "decisions",
      label: "Engineering",
      heading: "Choices that keep the central claim honest",
      after: 7,
      body: [
        "Group membership comes from structure only. Embeddings are allowed for search and naming but never for grouping, because embedding-based grouping is irreproducible and would make the adaptive claim circular. The same reasoning chose Java first, since explicit imports make static resolution tractable, TypeScript and Node because the targets are npx, a CLI, MCP and editors, and plain JSON files over a database.",
        "A graph with two edges over one ordered pair is rejected rather than folded, because double-counted strength can inflate cohesion enough to flip a decision. Group nodes carry a regionId and an ordinal so the audit record joins to the boxes on screen through recorded fields, replacing a package-prefix heuristic that once existed and was removed.",
        "Measurement changed the design twice. On the large fixture, 216 of 502 regions were degenerate and all carried the maximum confidence of 0.5, so every surface now reports an assessed-only split and never a raw preserve-versus-reconstruct count. A cold pipeline run took about 57 seconds against 14 warm, traced to a per-file first-access penalty; the remedy is concurrent prefetching, constrained so that read-completion order can never reach the graph.",
      ],
    },
    {
      id: "outcome",
      label: "Outcome",
      heading: "Reproducible on a 2,985-file codebase, exposed to humans and agents",
      body: [
        "The core suite passes 153 of 153 tests and the parser 181 of 181 on Linux, with fast-check property tests across the grouping invariants. On the BroadleafCommerce fixture the pipeline indexes 2,985 files into 502 regions at hierarchy depth 6, preserving 38 of the 286 regions it could assess; on the project's own sample fixture, all eight group nodes join to exactly one recorded decision.",
        "Around the engine sit a Next.js viewer with seven reachable surfaces, built from components such as a decision scatter, a boundary strip, an adaptivity comparison and a determinism panel; a read-only MCP server with six tools over an index fixed at launch; and a packaged CLI whose index command runs the whole pipeline, the last two built on local branches that were not yet merged at the time of writing. It is a single-author project still under active development, published under AGPL-3.0, with parts of the UI derived from repowise.",
      ],
    },
  ],
} satisfies ProjectCopy;
