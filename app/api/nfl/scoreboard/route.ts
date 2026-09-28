import { NextResponse } from "next/server";

const ESPN_SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
const ODDS_ENDPOINT =
  "https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const season = url.searchParams.get("season");
  const week = url.searchParams.get("week");

  const espnParams = new URLSearchParams();
  if (season) espnParams.set("dates", season);
  if (week) {
    espnParams.set("seasontype", "2");
    espnParams.set("week", week);
  }

  const espnUrl = espnParams.size
    ? `${ESPN_SCOREBOARD}?${espnParams.toString()}`
    : ESPN_SCOREBOARD;

  const oddsApiKey = process.env.ODDS_API_KEY;
  const oddsUrl = oddsApiKey
    ? `${ODDS_ENDPOINT}?apiKey=${encodeURIComponent(
        oddsApiKey,
      )}&regions=us&markets=h2h,spreads,totals&oddsFormat=american&dateFormat=iso`
    : null;

  try {
    const [scoreboardResponse, oddsResponse] = await Promise.all([
      fetch(espnUrl, { cache: "no-store" }),
      oddsUrl ? fetch(oddsUrl, { cache: "no-store" }) : Promise.resolve(null),
    ]);

    if (!scoreboardResponse.ok) {
      throw new Error(
        `ESPN respondió ${scoreboardResponse.status} al cargar la NFL`,
      );
    }

    const scoreboard = await scoreboardResponse.json();

    let odds: unknown[] = [];
    let oddsError: string | null = null;
    let quota: Record<string, string | null> | null = null;

    if (oddsResponse) {
      quota = {
        remaining: oddsResponse.headers.get("x-requests-remaining"),
        used: oddsResponse.headers.get("x-requests-used"),
        last: oddsResponse.headers.get("x-requests-last"),
      };

      if (oddsResponse.ok) {
        odds = await oddsResponse.json();
      } else {
        oddsError = `The Odds API respondió ${oddsResponse.status}`;
      }
    }

    return NextResponse.json({
      league: scoreboard.leagues?.[0] ?? null,
      season: scoreboard.season ?? null,
      week: scoreboard.week ?? null,
      events: scoreboard.events ?? [],
      odds,
      oddsConfigured: Boolean(oddsApiKey),
      oddsError,
      quota,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error cargando NFL:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No fue posible cargar la información NFL",
      },
      { status: 500 },
    );
  }
}
