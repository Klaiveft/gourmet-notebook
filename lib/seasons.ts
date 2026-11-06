import { normalize } from "./utils.ts";

const WINTER = ["poireau", "chou", "endive", "mache", "navet", "panais", "topinambour", "carotte", "orange", "clementine", "kiwi"];
const AUTUMN = ["courge", "potimarron", "butternut", "potiron", "champignon", "cepe", "chataigne", "noix", "coing", "raisin", "figue"];
const SPRING = ["asperge", "radis", "petit pois", "epinard", "artichaut", "rhubarbe", "fraise", "feve", "oseille"];
const SUMMER = ["tomate", "courgette", "aubergine", "poivron", "concombre", "haricot vert", "melon", "pasteque", "peche", "abricot", "cerise", "framboise", "basilic"];

// Saisons de France métropolitaine, de janvier à décembre
const BY_MONTH: string[][] = [
  [...WINTER, "pomme", "poire", "courge", "potimarron"],
  [...WINTER, "pomme", "poire"],
  [...WINTER, "epinard", "radis", "pomme"],
  [...SPRING, "carotte", "navet"],
  [...SPRING, "laitue", "cerise"],
  [...SPRING, "cerise", "abricot", "courgette", "tomate", "melon"],
  SUMMER,
  [...SUMMER, "mure", "prune", "mirabelle"],
  [...SUMMER, ...AUTUMN, "prune", "pomme", "poire"],
  [...AUTUMN, "pomme", "poire", "poireau", "chou"],
  [...AUTUMN, ...WINTER, "pomme", "poire"],
  [...WINTER, "courge", "potimarron", "chataigne", "noix", "pomme", "poire"],
];

/** Mots entiers : « poire » ne doit pas trouver « poireau ». */
export function isInSeason(texts: string[], month: number) {
  const pattern = new RegExp(`\\b(?:${BY_MONTH[month].join("|")})(?:s|x)?\\b`);
  return texts.some((text) => pattern.test(normalize(text)));
}
