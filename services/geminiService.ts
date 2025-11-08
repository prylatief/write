
import { GoogleGenAI } from "@google/genai";
import { Message, CitationStyle, Language } from '../types';
import { SYSTEM_PROMPT } from '../constants';

// FIX: Adhere to API key guidelines by removing placeholder, conditional check, and warning.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateContent(
  message: string,
  chatHistory: Message[],
  citationStyle: CitationStyle,
  language: Language
): Promise<string> {
  try {
    const contextualMessage = `
[Citation Style: ${citationStyle}]
[Language: ${language}]

${message}
    `;

    const history = chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [...history, { role: 'user', parts: [{ text: contextualMessage }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Error generating content:", error);
    if (error instanceof Error) {
        return `An error occurred: ${error.message}. Please check your API key and network connection.`;
    }
    return "An unexpected error occurred.";
  }
}
