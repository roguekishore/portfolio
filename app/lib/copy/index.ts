// Case-study copy, keyed by project slug. content.ts applies the card fields
// (title, sector, year, description, stack) and builds each case study from the
// intro and sections. Projects without a file keep the text in content.ts.
import type { ProjectCopy } from "./types";
import repohive from "./repohive";
import vantage from "./vantage";
import argus from "./argus";
import trueNorth from "./true-north";
import spicerack from "./spicerack";
import truxpert from "./truxpert";
import readify from "./readify";
import saga from "./saga";
import quant from "./quant";
import conduit from "./conduit";
import prospector from "./prospector";

export type { CopyLink, CopySection, ProjectCopy } from "./types";

export const COPY: Record<string, ProjectCopy> = {
  repohive: repohive,
  vantage: vantage,
  argus: argus,
  "true-north": trueNorth,
  spicerack: spicerack,
  truxpert: truxpert,
  readify: readify,
  saga: saga,
  quant: quant,
  conduit: conduit,
  prospector: prospector,
};
