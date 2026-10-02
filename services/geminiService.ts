
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateReminderMessage = async (clientName: string, brandName: string, amount: number, dueDate: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere uma mensagem curta, gentil e profissional para enviar via WhatsApp para a cliente ${clientName}. 
      Ela comprou produtos da marca ${brandName}. O valor é R$ ${amount.toFixed(2)} e o vencimento é dia ${dueDate}. 
      Use um tom amigável, evite ser agressivo. Mencione que você é revendedor(a). Use emojis sutilmente.
      Retorne APENAS o texto da mensagem.`,
    });
    return response.text?.trim() || `Olá ${clientName}! Passando para lembrar que seu pedido da ${brandName} vence em ${dueDate}. Valor: R$ ${amount.toFixed(2)}. Como prefere pagar?`;
  } catch (error) {
    console.error("Gemini Error:", error);
    return `Olá ${clientName}! Passando para lembrar que seu pedido da ${brandName} vence em ${dueDate}. Valor: R$ ${amount.toFixed(2)}. Como prefere pagar?`;
  }
};
