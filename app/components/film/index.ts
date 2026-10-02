import { argus } from "./argus";
import { conduit } from "./conduit";
import type { FilmId } from "@/lib/content";
import type { FilmDef } from "./kit";
import { quant } from "./quant";
import { saga } from "./saga";
import { spicerack } from "./spicerack";
import { truenorth } from "./truenorth";
import { truxpert } from "./truxpert";
import { vantage } from "./vantage";

export type { FilmId };
export const FILMS: Record<FilmId, FilmDef> = { vantage, argus, truenorth, spicerack, truxpert, saga, quant, conduit };
