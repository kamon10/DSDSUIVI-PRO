
import { GoogleGenAI } from "@google/genai";
import { DashboardData } from "../types";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (error?.message?.includes('429') || error?.status === 429) {
        const waitTime = Math.pow(2, i) * 1000 + Math.random() * 1000;
        await delay(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

export const getGeminiInsights = async (data: DashboardData): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Analyse les données suivantes de prélèvement de sang pour le mois de ${data.month} ${data.year}.
      Données Journalières (${data.date}): ${data.daily.realized}/${data.daily.objective} (${data.daily.percentage}%)
      Données Mensuelles: ${data.monthly.realized}/${data.monthly.objective} (${data.monthly.percentage}%)
      Données Annuelles: Objectif total de ${data.annual.objective} avec ${data.annual.realized} déjà collectés.
      Répartition Mensuelle: Fixe (${data.monthly.fixed}), Mobile (${data.monthly.mobile}).
      
      Génère une analyse courte (3-4 phrases) en français, professionnelle et motivante pour l'équipe du CNTS CI, identifiant les points d'amélioration stratégiques.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          temperature: 0.7,
        }
      });
      return response.text || "Analyse indisponible.";
    } catch (error: any) {
      if (error?.message?.includes('429')) {
        throw new Error("QUOTA_EXHAUSTED");
      }
      throw error;
    }
  });
};
