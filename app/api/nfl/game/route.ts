import { NextResponse } from "next/server";

const ESPN_SUMMARY =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary";

export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

function compactTeam(teamEntry: JsonRecord) {
  const team = (teamEntry.team ?? {}) as JsonRecord;
  const statistics = Array.isArray(teamEntry.statistics)
    ? teamEntry.statistics
    : [];

  return {
    team: {
      id: team.id ?? null,
      displayName: team.displayName ?? null,
      abbreviation: team.abbreviation ?? null,
      logo: team.logo ?? null,
      color: team.color ?? null,
    },
    statistics: statistics.map((stat) => {
      const item = stat as JsonRecord;
      return {
        name: item.name ?? null,
        label: item.label ?? item.displayName ?? item.name ?? null,
        displayValue: item.displayValue ?? item.value ?? null,
      };
    }),
  };
}

function compactPlayers(teamEntry: JsonRecord) {
  const team = (teamEntry.team ?? {}) as JsonRecord;
  const groups = Array.isArray(teamEntry.statistics)
    ? teamEntry.statistics
    : [];

  return {
    team: {
      id: team.id ?? null,
      displayName: team.displayName ?? null,
      abbreviation: team.abbreviation ?? null,
    },
    groups: groups.map((group) => {
      const item = group as JsonRecord;
      const athletes = Array.isArray(item.athletes) ? item.athletes : [];

      return {
        name: item.name ?? null,
        displayName: item.displayName ?? item.name ?? null,
        labels: Array.isArray(item.labels) ? item.labels : [],
        athletes: athletes.slice(0, 12).map((athlete) => {
          const player = athlete as JsonRecord;
          const athleteInfo = (player.athlete ?? {}) as JsonRecord;
          const position = (athleteInfo.position ?? {}) as JsonRecord;

          return {
            name:
              athleteInfo.displayName ??
              athleteInfo.fullName ??
              athleteInfo.shortName ??
              null,
            jersey: athleteInfo.jersey ?? null,
            position: position.abbreviation ?? null,
            stats: Array.isArray(player.stats) ? player.stats : [],
          };
        }),
      };
    }),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("id");

  if (!eventId || !/^\d+$/.test(eventId)) {
    return NextResponse.json(
      { error: "Se requiere un id de partido NFL válido" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      `${ESPN_SUMMARY}?event=${encodeURIComponent(eventId)}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      throw new Error(`ESPN respondió ${response.status}`);
    }

    const data = await response.json();
    const boxscore = (data.boxscore ?? {}) as JsonRecord;
    const teamStats = Array.isArray(boxscore.teams) ? boxscore.teams : [];
    const playerStats = Array.isArray(boxscore.players) ? boxscore.players : [];

    return NextResponse.json({
      header: data.header ?? null,
      gameInfo: data.gameInfo ?? null,
      leaders: data.leaders ?? [],
      teamStats: teamStats.map((entry) =>
        compactTeam(entry as JsonRecord),
      ),
      playerStats: playerStats.map((entry) =>
        compactPlayers(entry as JsonRecord),
      ),
      injuries: data.injuries ?? [],
      drives: data.drives ?? null,
      winprobability: data.winprobability ?? [],
      predictor: data.predictor ?? null,
      pickcenter: data.pickcenter ?? [],
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error cargando detalle NFL:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No fue posible cargar el detalle del partido",
      },
      { status: 500 },
    );
  }
}
