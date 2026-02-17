
import { GoogleGenAI, Type } from "@google/genai";
import { AppState } from "../types";

export async function getMaintenanceAdvice(state: AppState) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const componentSummary = state.components.map(c => 
    `${c.name}: ${c.currentKm.toFixed(1)}km / seuil de ${c.thresholdKm}km`
  ).join('\n');

  const prompt = `
    Tu es un mécanicien VTT professionnel et un analyste de performance. 
    Analyse l'état d'entretien suivant pour un vélo :
    
    Utilisation totale : ${state.totalDistance.toFixed(1)} km
    Dénivelé total (D+) : ${state.totalElevation.toFixed(0)} m
    
    Statut des composants :
    ${componentSummary}
    
    Fournis 3 à 4 "Conseils de Pro" concis pour le pilote basés sur ces données. 
    Si certains composants approchent des seuils d'usure, donne-leur la priorité. 
    Si le dénivelé par km est élevé, mentionne que cela accélère l'usure de la transmission et des freins.
    Réponds EXCLUSIVEMENT en français au format JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Liste de conseils d'entretien actionnables."
            },
            summary: {
              type: Type.STRING,
              description: "Un bref résumé de la santé globale du vélo."
            }
          },
          required: ["tips", "summary"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Erreur lors de la récupération des conseils Gemini :", error);
    return {
      tips: ["Lubrifiez votre chaîne après chaque sortie.", "Vérifiez la pression des pneus avant de partir."],
      summary: "Roulez en toute sécurité !"
    };
  }
}
