import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Falta GEMINI_API_KEY. Agrégala a tu archivo .env.local antes de usar el análisis con IA.",
        },
        { status: 500 },
      );
    }

    const { matchData } = await req.json();

    if (!matchData) {
      return NextResponse.json(
        { error: "No se recibieron datos del partido" },
        { status: 400 },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-pro",
    });

    const prompt = `
Eres un analista cuantitativo especializado EXCLUSIVAMENTE en NFL.

Analiza el partido usando solamente los datos entregados abajo. No inventes
lesiones, estadísticas, récords, líneas, jugadores ni noticias. Si un dato no
está disponible, dilo explícitamente. No presentes ninguna apuesta como segura
o garantizada.

DATOS DEL PARTIDO:
${JSON.stringify(matchData, null, 2)}

Devuelve el análisis en español con esta estructura:

1. RESUMEN DEL MATCHUP
   - situación de ambos equipos
   - récord y contexto del partido
   - localía, sede y estado del juego cuando estén disponibles

2. OFENSIVA VS DEFENSIVA
   - pase
   - carrera
   - yardas totales
   - primeros downs
   - terceros y cuartos downs
   - pérdidas de balón
   - sacks y presión si aparecen en los datos
   - posesión y eficiencia de zona roja si aparecen

3. JUGADORES CLAVE
   - QB
   - corredores
   - receptores
   - defensivos relevantes
   Usa únicamente jugadores presentes en los datos.

4. LESIONES Y AUSENCIAS
   Resume únicamente las que estén incluidas en el dataset.

5. MERCADO
   - moneyline
   - spread
   - total
   - diferencias entre casas si existen
   Señala cuando las cuotas no estén disponibles.

6. PROBABILIDAD ESTIMADA
   Da una estimación razonada para cada equipo en porcentaje.
   La suma debe ser aproximadamente 100%.
   Aclara que es una estimación del modelo, no una certeza.

7. LECTURA DE VALOR
   Identifica como máximo tres ángulos que los datos justifiquen.
   No recomiendes perseguir pérdidas ni aumentar riesgo.

8. RIESGOS DEL ANÁLISIS
   Enumera los datos faltantes, muestras pequeñas o factores que reduzcan
   confianza.

9. CONCLUSIÓN
   Resume en pocas líneas qué indican los datos y qué información faltaría para
   aumentar la confianza del análisis.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return NextResponse.json({
      prediction: response.text(),
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-pro",
    });
  } catch (error) {
    console.error("Error analizando partido NFL:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Hubo un error al procesar el análisis NFL",
      },
      { status: 500 },
    );
  }
}
