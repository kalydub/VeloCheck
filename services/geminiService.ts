
import { GoogleGenAI, Type } from "@google/genai";
import { BikeProfile } from "../types";

// Obtain maintenance advice from Gemini based on the specific bike profile data
export async function getMaintenanceAdvice(bike: BikeProfile) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Accessing bike properties instead of app state
  const componentSummary = bike.components.map(c => 
    `${c.name}: ${c.currentKm.toFixed(1)}km / seuil de ${c.thresholdKm}km`
  ).join('\n');

  const prompt = `
    Analyse l'état d'entretien suivant pour le vélo "${bike.name}" :
    
    Utilisation totale : ${bike.totalDistance.toFixed(1)} km
    Dénivelé total (D+) : ${bike.totalElevation.toFixed(0)} m
    
    Statut des composants :
    ${componentSummary}
    
    Fournis 3 à 4 "Conseils de Pro" concis pour le pilote basés sur ces données. 
    Si certains composants approchent des seuils d'usure, donne-leur la priorité. 
    Si le dénivelé par km est élevé, mentionne que cela accélère l'usure de la transmission et des freins.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        // Move professional persona and output constraints to systemInstruction
        systemInstruction: "Tu es un mécanicien VTT professionnel et un analyste de performance. Réponds EXCLUSIVEMENT en français au format JSON.",
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

    // Access the .text property directly
    const text = response.text;
    return text ? JSON.parse(text) : { tips: [], summary: "" };
  } catch (error) {
    console.error("Erreur lors de la récupération des conseils Gemini :", error);
    return {
      tips: ["Lubrifiez votre chaîne après chaque sortie.", "Vérifiez la pression des pneus avant de partir."],
      summary: "Roulez en toute sécurité !"
    };
  }
}
