import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Por defecto cargamos la Premier League
  const sportKey = searchParams.get("league") || "soccer_epl";

  try {
    // Pedimos los próximos partidos con sus cuotas de victoria (h2h) en formato decimal
    const response = await axios.get(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${process.env.ODDS_API_KEY}&regions=eu,us&markets=h2h&oddsFormat=decimal`);

    return NextResponse.json({ matches: response.data || [] });
  } catch (error) {
    console.error("Error al conectar con The Odds API:", error);
    return NextResponse.json({ error: "Error al conectar con la API" }, { status: 500 });
  }
}