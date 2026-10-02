// Per-project case-study copy. One file per project under lib/copy, owned by
// whoever writes that project's story; content.ts merges them in.
// This file imports nothing, so the copy files stay free of import cycles.

export type CopyLink = { label: string; href: string };

export type CopySection = {
  /** Unique kebab-case id; not "introduction", "stack" or "links". */
  id: string;
  /** Sidebar nav + section tag, 1–2 words. */
  label: string;
  /** One-line headline, ≤ 70 chars. */
  heading?: string;
  /** Plain-text paragraphs, unique within the section. */
  body: string[];
  /** Optional, public URLs only. */
  links?: CopyLink[];
  /** Film chapter index this section follows; omit → after the last tile. */
  after?: number;
};

export type ProjectCopy = {
  title: string;
  sector: string;
  year: string;
  description: string;
  stack: string[];
  intro: { heading: string; body: string[] };
  sections: CopySection[];
};
