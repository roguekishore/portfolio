import { argus } from "./argus";
import { conduit } from "./conduit";
import type { FilmId } from "@/lib/content";
import type { FilmDef } from "./kit";
import { prospector } from "./prospector";
import { quant } from "./quant";
import { readify } from "./readify";
import { repohive } from "./repohive";
import { saga } from "./saga";
import { spicerack } from "./spicerack";
import { truenorth } from "./truenorth";
import { truxpert } from "./truxpert";
import { vantage } from "./vantage";

export type { FilmId };
export const FILMS: Record<FilmId, FilmDef> = { repohive, vantage, argus, truenorth, spicerack, truxpert, readify, saga, quant, conduit, prospector };
