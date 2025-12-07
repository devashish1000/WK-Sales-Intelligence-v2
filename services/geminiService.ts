import { GoogleGenAI } from "@google/genai";
import { PIPELINE_FUNNEL, RISK_SCORES, REPS, FORECAST_DATA } from '../constants';

const API_KEY = process.env.API_KEY || '';

// Initialize client safely
const getClient = () => {
  if (!API_KEY) {
    console.error("Gemini API Key is missing.");
    return null;
  }
  return new GoogleGenAI({ apiKey: API_KEY });
};

export const generateExecutiveSummary = async (): Promise<string> => {
  const client = getClient();
  if (!client) {
    return "Error: API Key is missing. Please configure the environment.";
  }

  const dataContext = JSON.stringify({
    pipeline: PIPELINE_FUNNEL,
    forecast: FORECAST_DATA,
    risk_entities: RISK_SCORES,
    rep_performance: REPS
  });

  const prompt = `
    You are a Senior Sales Operations Analyst at Wolters Kluwer. 
    Analyze the following JSON data representing our current Sales Pipeline, Forecast, Compliance Risks, and Rep Performance.
    
    Data Context: ${dataContext}

    Please provide a professional, concise Executive Summary (approx 150-200 words).
    Structure the response with HTML formatting (use <h3>, <ul>, <li>, <strong> tags).
    
    Focus on:
    1. Pipeline Health & Forecast Trends.
    2. Critical Compliance Risks (High risk scores).
    3. Performance gaps or highlights.
    4. One strategic recommendation.

    Do not include markdown code blocks, just return the HTML string.
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "No summary generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate insights at this time. Please try again later.";
  }
};

// Search Grounding: Regulatory News
export const getRegulatoryNews = async (): Promise<{text: string, chunks: any[]}> => {
  const client = getClient();
  if (!client) return { text: "API Key missing", chunks: [] };

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "What are the latest significant changes in US corporate transparency act and beneficial ownership reporting requirements for 2024/2025? focusing on compliance deadlines.",
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    return {
      text: response.text || "No regulatory updates found.",
      chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error("Search Grounding Error:", error);
    return { text: "Error retrieving regulatory news.", chunks: [] };
  }
};

// Thinking Mode: Strategic Deep Dive
export const generateStrategicAnalysis = async (query: string): Promise<string> => {
  const client = getClient();
  if (!client) return "API Key missing";

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Context: You are a Sales Operations Director. Analyze this strategic query: "${query}". Provide a detailed, reasoning-based strategy.`,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, // Max thinking for deep analysis
      }
    });
    
    return response.text || "Analysis complete but no output returned.";
  } catch (error) {
    console.error("Thinking Mode Error:", error);
    return "Unable to complete strategic analysis.";
  }
};

// Chatbot: Streaming Response
export const getChatResponseStream = async (history: {role: string, parts: {text: string}[]}[], message: string) => {
  const client = getClient();
  if (!client) throw new Error("API Key missing");

  const chat = client.chats.create({
    model: 'gemini-3-pro-preview',
    history: history,
    config: {
      systemInstruction: "You are 'WK Ops Copilot', a helpful assistant for Wolters Kluwer Sales Operations. You are concise, professional, and knowledgeable about sales pipelines, compliance, and Salesforce CRM.",
    }
  });

  return await chat.sendMessageStream({ message });
};