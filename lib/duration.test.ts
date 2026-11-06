import assert from "node:assert/strict";
import { test } from "node:test";
import { parseDurationMinutes } from "./duration.ts";

test("détecte les durées d'une instruction", () => {
  const cases: [string, number | null][] = [
    ["Enfourner 15 min à 180°C", 15],
    ["Laisser reposer 10 à 15 minutes", 15],
    ["Cuire 1h30", 90],
    ["Cuire 1 h 30 à feu doux", 90],
    ["Mijoter 2 heures", 120],
    ["Mijoter 1 heure et demie", 90],
    ["Laisser lever 1,5 h", 90],
    ["Ajouter 3 mini carottes", null],
    ["Battre 2 œufs et 100 g de sucre", null],
  ];
  for (const [text, expected] of cases) assert.equal(parseDurationMinutes(text), expected, text);
});
