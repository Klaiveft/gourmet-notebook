import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { ExtractedRecipeSchema, type ExtractedRecipe } from "./schemas.ts";

// gemini-1.5-flash est coupé depuis septembre 2025 ; c'est le Flash stable actuel.
const MODEL = "gemini-3.6-flash";

const SYSTEM_PROMPT = `Tu transformes une source culinaire (vidéo, légende, page web ou texte) en fiche recette structurée pour une cuisinière française.

Règles impératives :
- Traduis tout en français courant, y compris le titre et les noms d'ingrédients.
- Convertis systématiquement en métrique, dans les quantités comme dans le texte des étapes :
  1 cup de beurre = 225 g ; 1 cup de farine = 125 g ; 1 cup de sucre = 200 g ; 1 cup de liquide = 240 ml ;
  1 stick of butter = 115 g ; 1 oz = 28 g ; 1 fl oz = 30 ml.
  Pour un autre ingrédient mesuré en cup, utilise sa densité réelle.
- Convertis les °F en °C arrondis à la dizaine la plus proche (350°F = 180°C).
- Unités autorisées : g, kg, ml, cl, l, c. à soupe, c. à café, pièce, pincée. Écris les fractions en décimales (0.5, pas 1/2).
- "quantity" et "unit" valent null si la source n'en donne pas (« sel, poivre »). Les précisions (« coupé en dés ») vont dans "notes".
- Découpe la préparation en étapes claires et atomiques : une action principale par étape, numérotées à partir de 1.
- "duration_minutes" : durée d'attente ou de cuisson citée par l'étape, sinon null.
- "tip" : astuce de cuisson liée à l'étape si la source en donne une, sinon null.
- N'invente jamais d'ingrédient, de quantité ni d'étape. Si la source ne contient pas de recette exploitable, renvoie "ingredients" et "steps" vides.`;

const responseJsonSchema = z.toJSONSchema(ExtractedRecipeSchema, { io: "input" });

export async function extractRecipe(text: string, videoUrl?: string | null): Promise<ExtractedRecipe> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          ...(videoUrl ? [{ fileData: { fileUri: videoUrl } }] : []),
          { text: text || "Extrais la recette de cette vidéo." },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseJsonSchema,
    },
  });
  return ExtractedRecipeSchema.parse(JSON.parse(response.text ?? ""));
}
