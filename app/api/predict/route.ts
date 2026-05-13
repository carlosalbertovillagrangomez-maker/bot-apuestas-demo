import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_KEY as string);

export async function POST(req: Request) {
  try {
    const { matchData } = await req.json();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const prompt = `
      Actúa como un tipster profesional de apuestas deportivas y analista de datos. 
      Analiza este encuentro: ${matchData.home} vs ${matchData.away}.
      Competición: ${matchData.league}. Fecha: ${matchData.date}.
      Cuotas de apuestas actuales: ${matchData.stats}.
      
      INSTRUCCIONES DE ANÁLISIS: 
      - Utiliza tu conocimiento más reciente para evaluar el estado de forma de ambos equipos en los últimos 2 meses.
      - Considera lesiones prolongadas graves o suspensiones clave que afecten las alineaciones titulares, según tu base de datos.
      - Si un dato específico es demasiado reciente (ej. lesión de ayer) y no tienes certeza, omítelo. NO inventes estadísticas.
      - Realiza un análisis de probabilidad realista considerando que en el fútbol siempre existe la varianza.
      
      Proporciona tu respuesta en este formato:
      1. PRONÓSTICO PRINCIPAL: (Quién gana o empate y su probabilidad calculada realista en %).
      2. CONTEXTO RECIENTE: (Breve resumen del estado de forma y bajas importantes que recuerdes).
      3. OPORTUNIDADES DE VALOR (VALUE BETS): (Sugiere 2 mercados viables basados en las cuotas proporcionadas y el contexto).
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return NextResponse.json({ prediction: response.text() });
  } catch (error) {
    console.error("Error analizando el partido:", error);
    return NextResponse.json({ error: "Hubo un error al procesar el pronóstico" }, { status: 500 });
  }
}