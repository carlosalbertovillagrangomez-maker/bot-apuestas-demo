"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Team = {
  id?: string;
  displayName?: string;
  abbreviation?: string;
  logo?: string;
};

type RecordItem = { name?: string; summary?: string };

type Competitor = {
  id?: string;
  homeAway?: "home" | "away";
  score?: string;
  winner?: boolean;
  team?: Team;
  records?: RecordItem[];
};

type Competition = {
  venue?: {
    fullName?: string;
    address?: { city?: string; state?: string };
  };
  competitors?: Competitor[];
  status?: {
    type?: {
      state?: string;
      completed?: boolean;
      detail?: string;
      shortDetail?: string;
    };
  };
};

type NflEvent = {
  id: string;
  date?: string;
  name?: string;
  week?: { number?: number };
  competitions?: Competition[];
};

type OddsOutcome = {
  name: string;
  price: number;
  point?: number;
};

type OddsMarket = {
  key: string;
  outcomes: OddsOutcome[];
};

type Bookmaker = {
  key: string;
  title: string;
  markets: OddsMarket[];
};

type OddsGame = {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: Bookmaker[];
};

type TeamStat = {
  team: Team;
  statistics: Array<{
    name?: string;
    label?: string;
    displayValue?: string | number | null;
  }>;
};

type PlayerGroup = {
  name?: string;
  displayName?: string;
  labels?: string[];
  athletes?: Array<{
    name?: string;
    jersey?: string;
    position?: string;
    stats?: Array<string | number>;
  }>;
};

type PlayerTeamStats = {
  team: Team;
  groups: PlayerGroup[];
};

type GameDetail = {
  gameInfo?: {
    venue?: {
      fullName?: string;
      address?: { city?: string; state?: string };
      indoor?: boolean;
    };
    attendance?: number;
    weather?: {
      temperature?: number;
      displayValue?: string;
    };
  };
  teamStats?: TeamStat[];
  playerStats?: PlayerTeamStats[];
  injuries?: unknown[];
  winprobability?: Array<{ homeWinPercentage?: number }>;
  error?: string;
};

type ScoreboardResponse = {
  league?: { name?: string; season?: { year?: number } };
  season?: { year?: number; type?: number };
  week?: { number?: number };
  events?: NflEvent[];
  odds?: OddsGame[];
  oddsConfigured?: boolean;
  oddsError?: string | null;
  quota?: {
    remaining?: string | null;
    used?: string | null;
    last?: string | null;
  } | null;
  error?: string;
};

type JsonRecord = Record<string, unknown>;

function competitionOf(event: NflEvent) {
  return event.competitions?.[0];
}

function competitorOf(event: NflEvent, side: "home" | "away") {
  return competitionOf(event)?.competitors?.find(
    (competitor) => competitor.homeAway === side,
  );
}

function recordOf(competitor?: Competitor) {
  return (
    competitor?.records?.find((record) => record.name === "overall")?.summary ??
    competitor?.records?.[0]?.summary ??
    "—"
  );
}

function normalizeTeamName(value?: string) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function oddsForEvent(event: NflEvent, odds: OddsGame[]) {
  const home = competitorOf(event, "home")?.team?.displayName;
  const away = competitorOf(event, "away")?.team?.displayName;

  return odds.find(
    (game) =>
      normalizeTeamName(game.home_team) === normalizeTeamName(home) &&
      normalizeTeamName(game.away_team) === normalizeTeamName(away),
  );
}

function formatKickoff(date?: string) {
  if (!date) return "Horario por confirmar";

  return new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function signed(value?: number) {
  if (typeof value !== "number") return "—";
  return value > 0 ? "+" + value : String(value);
}

function american(value?: number) {
  if (typeof value !== "number") return "—";
  return value > 0 ? "+" + value : String(value);
}

function firstMarket(bookmaker: Bookmaker | undefined, key: string) {
  return bookmaker?.markets?.find((market) => market.key === key);
}

function outcomeFor(market: OddsMarket | undefined, name: string) {
  return market?.outcomes?.find(
    (outcome) =>
      normalizeTeamName(outcome.name) === normalizeTeamName(name),
  );
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function injuryRows(injuries: unknown[]) {
  const rows: Array<{
    team: string;
    player: string;
    status: string;
    detail: string;
  }> = [];

  injuries.forEach((teamEntry) => {
    const teamObject = asRecord(teamEntry);
    if (!teamObject) return;

    const team = asRecord(teamObject.team);
    const teamName =
      (team?.displayName as string | undefined) ??
      (team?.abbreviation as string | undefined) ??
      "Equipo";
    const list = Array.isArray(teamObject.injuries)
      ? teamObject.injuries
      : Array.isArray(teamObject.items)
        ? teamObject.items
        : [];

    list.forEach((injury) => {
      const item = asRecord(injury);
      if (!item) return;

      const athlete = asRecord(item.athlete);
      const details = asRecord(item.details);

      rows.push({
        team: teamName,
        player:
          (athlete?.displayName as string | undefined) ??
          (athlete?.fullName as string | undefined) ??
          "Jugador",
        status:
          (item.status as string | undefined) ??
          (details?.status as string | undefined) ??
          "Sin estatus",
        detail:
          (details?.type as string | undefined) ??
          (details?.detail as string | undefined) ??
          "",
      });
    });
  });

  return rows;
}

function TeamLogo({ team }: { team?: Team }) {
  if (!team?.logo) {
    return (
      <div className="grid h-12 w-12 place-items-center rounded-full bg-white/5 text-xs font-black text-slate-400">
        {team?.abbreviation ?? "NFL"}
      </div>
    );
  }

  return (
    <Image
      src={team.logo}
      alt={team.displayName ?? "Equipo NFL"}
      width={48}
      height={48}
      className="h-12 w-12 object-contain"
    />
  );
}

function OddsStrip({
  event,
  odds,
}: {
  event: NflEvent;
  odds?: OddsGame;
}) {
  const home = competitorOf(event, "home")?.team?.displayName ?? "";
  const away = competitorOf(event, "away")?.team?.displayName ?? "";
  const book = odds?.bookmakers?.[0];
  const moneyline = firstMarket(book, "h2h");
  const spread = firstMarket(book, "spreads");
  const total = firstMarket(book, "totals");
  const homeMl = outcomeFor(moneyline, home);
  const awayMl = outcomeFor(moneyline, away);
  const homeSpread = outcomeFor(spread, home);
  const awaySpread = outcomeFor(spread, away);
  const over = total?.outcomes?.find((outcome) => outcome.name === "Over");
  const under = total?.outcomes?.find((outcome) => outcome.name === "Under");
  const awayShort = away.split(" ").at(-1);
  const homeShort = home.split(" ").at(-1);

  if (!book) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-black/10 px-4 py-3 text-sm text-slate-500">
        Cuotas no disponibles para este juego.
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <div className="metric-box">
        <span>Moneyline · {book.title}</span>
        <strong>
          {awayShort} {american(awayMl?.price)} · {homeShort}{" "}
          {american(homeMl?.price)}
        </strong>
      </div>
      <div className="metric-box">
        <span>Spread</span>
        <strong>
          {awayShort} {signed(awaySpread?.point)}{" "}
          {american(awaySpread?.price)} · {homeShort}{" "}
          {signed(homeSpread?.point)} {american(homeSpread?.price)}
        </strong>
      </div>
      <div className="metric-box">
        <span>Total</span>
        <strong>
          O {over?.point ?? "—"} {american(over?.price)} · U{" "}
          {under?.point ?? "—"} {american(under?.price)}
        </strong>
      </div>
    </div>
  );
}

function TeamStatsTable({ stats }: { stats: TeamStat[] }) {
  if (stats.length < 2) {
    return (
      <p className="text-sm text-slate-500">
        El box score aún no publica estadísticas de equipo para este partido.
      </p>
    );
  }

  const left = stats[0];
  const right = stats[1];
  const rightMap = new Map(
    right.statistics.map((stat) => [stat.name ?? stat.label, stat.displayValue]),
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className="grid grid-cols-[1fr_1.4fr_1fr] bg-white/5 px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
        <span>{left.team.abbreviation ?? "A"}</span>
        <span>Estadística</span>
        <span>{right.team.abbreviation ?? "B"}</span>
      </div>
      <div className="divide-y divide-white/5">
        {left.statistics.map((stat) => {
          const key = stat.name ?? stat.label;
          return (
            <div
              key={String(key)}
              className="grid grid-cols-[1fr_1.4fr_1fr] items-center px-4 py-2.5 text-center text-sm"
            >
              <strong>{String(stat.displayValue ?? "—")}</strong>
              <span className="text-xs text-slate-400">
                {stat.label ?? stat.name ?? "Dato"}
              </span>
              <strong>{String(rightMap.get(key) ?? "—")}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlayerStats({ teams }: { teams: PlayerTeamStats[] }) {
  if (!teams.length) {
    return (
      <p className="text-sm text-slate-500">
        Las estadísticas individuales aparecerán cuando ESPN publique el box
        score del partido.
      </p>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {teams.map((team) => (
        <div
          key={team.team.id ?? team.team.abbreviation}
          className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
        >
          <h4 className="mb-4 font-black">
            {team.team.displayName ?? team.team.abbreviation}
          </h4>
          <div className="space-y-5">
            {team.groups.map((group) => (
              <div key={group.name ?? group.displayName}>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
                  {group.displayName ?? group.name}
                </p>
                <div className="space-y-2">
                  {group.athletes?.slice(0, 6).map((athlete) => (
                    <div
                      key={(group.name ?? "") + "-" + (athlete.name ?? "")}
                      className="rounded-xl bg-black/20 px-3 py-2 text-sm"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <strong>{athlete.name}</strong>
                        <span className="text-xs text-slate-500">
                          {athlete.position}
                          {athlete.jersey ? " #" + athlete.jersey : ""}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        {(athlete.stats ?? [])
                          .map((stat, index) => {
                            const label = group.labels?.[index];
                            return label
                              ? label + ": " + String(stat)
                              : String(stat);
                          })
                          .join(" · ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [board, setBoard] = useState<ScoreboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<NflEvent | null>(null);
  const [details, setDetails] = useState<Record<string, GameDetail>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});
  const [analyses, setAnalyses] = useState<Record<string, string>>({});
  const [analysisLoading, setAnalysisLoading] = useState<Record<string, boolean>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);

  const events = board?.events ?? [];
  const odds = board?.odds ?? [];
  const currentWeek = board?.week?.number;
  const season = board?.season?.year ?? board?.league?.season?.year;

  const summary = useMemo(() => {
    let finalGames = 0;
    let liveGames = 0;
    let scheduledGames = 0;

    events.forEach((event) => {
      const eventState = competitionOf(event)?.status?.type?.state;
      if (eventState === "post") finalGames += 1;
      else if (eventState === "in") liveGames += 1;
      else scheduledGames += 1;
    });

    return { finalGames, liveGames, scheduledGames };
  }, [events]);

  async function loadScoreboard(targetWeek?: number) {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (targetWeek && season) {
        params.set("season", String(season));
        params.set("week", String(targetWeek));
      }

      const suffix = params.size ? "?" + params.toString() : "";
      const response = await fetch("/api/nfl/scoreboard" + suffix, {
        cache: "no-store",
      });
      const data = (await response.json()) as ScoreboardResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "No fue posible cargar la NFL");
      }

      setBoard(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No fue posible cargar la NFL",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadScoreboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDetail(event: NflEvent) {
    if (details[event.id]) {
      setSelectedEvent(event);
      return details[event.id];
    }

    setSelectedEvent(event);
    setDetailLoading((current) => ({ ...current, [event.id]: true }));

    try {
      const response = await fetch(
        "/api/nfl/game?id=" + encodeURIComponent(event.id),
        { cache: "no-store" },
      );
      const data = (await response.json()) as GameDetail;

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el box score");
      }

      setDetails((current) => ({ ...current, [event.id]: data }));
      return data;
    } finally {
      setDetailLoading((current) => ({ ...current, [event.id]: false }));
    }
  }

  async function analyze(event: NflEvent) {
    setAnalysisLoading((current) => ({ ...current, [event.id]: true }));
    setSelectedEvent(event);

    try {
      const detail = details[event.id] ?? (await loadDetail(event));
      const competition = competitionOf(event);
      const matchedOdds = oddsForEvent(event, odds);

      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchData: {
            event: {
              id: event.id,
              name: event.name,
              date: event.date,
              week: event.week?.number,
              status: competition?.status?.type,
              venue: competition?.venue,
              competitors: competition?.competitors?.map((competitor) => ({
                homeAway: competitor.homeAway,
                team: competitor.team,
                score: competitor.score,
                records: competitor.records,
              })),
            },
            gameDetail: detail,
            odds: matchedOdds ?? null,
          },
        }),
      });

      const data = (await response.json()) as {
        prediction?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo generar el análisis");
      }

      setAnalyses((current) => ({
        ...current,
        [event.id]: data.prediction ?? "Sin respuesta del modelo.",
      }));
    } catch (analysisError) {
      setAnalyses((current) => ({
        ...current,
        [event.id]:
          analysisError instanceof Error
            ? analysisError.message
            : "Error al analizar el partido.",
      }));
    } finally {
      setAnalysisLoading((current) => ({ ...current, [event.id]: false }));
    }
  }

  const selectedDetail = selectedEvent ? details[selectedEvent.id] : undefined;
  const selectedInjuries = injuryRows(selectedDetail?.injuries ?? []);
  const latestWinProbability =
    selectedDetail?.winprobability?.at(-1)?.homeWinPercentage;

  return (
    <main className="min-h-screen bg-[#060a0d] text-slate-100">
      <div className="hero-grid">
        <div className="mx-auto max-w-7xl px-5 pb-10 pt-10 sm:px-8 lg:pt-14">
          <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                NFL Data Center
              </div>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                Football americano,
                <span className="block text-emerald-400">
                  estadísticas antes que corazonadas.
                </span>
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
                Cartelera NFL, resultados, récords, box score, jugadores,
                lesiones, moneyline, spread, total y análisis con IA alimentado
                por los datos del partido.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm backdrop-blur">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Temporada / semana
              </p>
              <p className="mt-1 text-xl font-black">
                {season ?? "NFL"} · Semana {currentWeek ?? "—"}
              </p>
              {board?.quota?.remaining && (
                <p className="mt-1 text-xs text-slate-500">
                  Créditos Odds API restantes: {board.quota.remaining}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="summary-card">
              <span>Partidos</span>
              <strong>{events.length}</strong>
            </div>
            <div className="summary-card">
              <span>En vivo</span>
              <strong>{summary.liveGames}</strong>
            </div>
            <div className="summary-card">
              <span>Finalizados</span>
              <strong>{summary.finalGames}</strong>
            </div>
            <div className="summary-card">
              <span>Por jugar</span>
              <strong>{summary.scheduledGames}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <section className="-mt-2 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0d1419]/90 p-3 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              className="nav-button"
              disabled={!currentWeek || currentWeek <= 1 || loading}
              onClick={() =>
                currentWeek && void loadScoreboard(currentWeek - 1)
              }
            >
              ← Semana anterior
            </button>
            <button
              className="nav-button"
              disabled={!currentWeek || currentWeek >= 18 || loading}
              onClick={() =>
                currentWeek && void loadScoreboard(currentWeek + 1)
              }
            >
              Semana siguiente →
            </button>
          </div>
          <button
            className="nav-button"
            disabled={loading}
            onClick={() => void loadScoreboard(currentWeek)}
          >
            {loading ? "Actualizando…" : "Actualizar datos"}
          </button>
        </section>

        {!board?.oddsConfigured && !loading && (
          <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
            ESPN está funcionando, pero falta <strong>ODDS_API_KEY</strong> para
            mostrar moneyline, spread y total.
          </div>
        )}

        {board?.oddsError && (
          <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
            {board.oddsError}. La cartelera y estadísticas NFL siguen
            disponibles.
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm text-red-100">
            {error}
          </div>
        )}

        {loading && !board ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-72 animate-pulse rounded-3xl bg-white/5"
              />
            ))}
          </div>
        ) : (
          <section className="grid gap-4 lg:grid-cols-2">
            {events.map((event) => {
              const home = competitorOf(event, "home");
              const away = competitorOf(event, "away");
              const competition = competitionOf(event);
              const eventState = competition?.status?.type?.state;
              const matchedOdds = oddsForEvent(event, odds);
              const selectedClass =
                selectedEvent?.id === event.id
                  ? " ring-1 ring-emerald-400/60"
                  : "";

              return (
                <article key={event.id} className={"game-card" + selectedClass}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">
                        Semana {event.week?.number ?? currentWeek ?? "—"}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {formatKickoff(event.date)}
                      </p>
                    </div>
                    <span
                      className={
                        "status-pill " +
                        (eventState === "in"
                          ? "status-live"
                          : eventState === "post"
                            ? "status-final"
                            : "")
                      }
                    >
                      {competition?.status?.type?.shortDetail ??
                        competition?.status?.type?.detail ??
                        "Programado"}
                    </span>
                  </div>

                  <div className="my-5 space-y-3">
                    {[away, home].map((competitor) => (
                      <div
                        key={competitor?.id}
                        className="flex items-center gap-3 rounded-2xl bg-white/[0.035] p-3"
                      >
                        <TeamLogo team={competitor?.team} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-black">
                            {competitor?.team?.displayName}
                          </p>
                          <p className="text-xs text-slate-500">
                            Récord {recordOf(competitor)}
                          </p>
                        </div>
                        {(eventState === "post" || eventState === "in") && (
                          <strong className="text-3xl font-black">
                            {competitor?.score ?? "0"}
                          </strong>
                        )}
                      </div>
                    ))}
                  </div>

                  <OddsStrip event={event} odds={matchedOdds} />

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <button
                      className="secondary-button"
                      onClick={() => void loadDetail(event)}
                      disabled={detailLoading[event.id]}
                    >
                      {detailLoading[event.id]
                        ? "Cargando estadísticas…"
                        : "Ver estadísticas"}
                    </button>
                    <button
                      className="primary-button"
                      onClick={() => void analyze(event)}
                      disabled={analysisLoading[event.id]}
                    >
                      {analysisLoading[event.id]
                        ? "Analizando NFL…"
                        : "Analizar con IA"}
                    </button>
                  </div>

                  {analyses[event.id] && (
                    <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.055] p-4 text-sm leading-6 text-slate-300">
                      {analyses[event.id]}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}

        {selectedEvent && (
          <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-[#0c1318]">
            <div className="border-b border-white/10 bg-white/[0.025] p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
                    Matchup Center
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    {selectedEvent.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {competitionOf(selectedEvent)?.venue?.fullName ??
                      selectedDetail?.gameInfo?.venue?.fullName ??
                      "Sede por confirmar"}
                  </p>
                </div>
                <button
                  className="nav-button"
                  onClick={() => setSelectedEvent(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="space-y-8 p-5 sm:p-6">
              {detailLoading[selectedEvent.id] && !selectedDetail ? (
                <div className="h-52 animate-pulse rounded-2xl bg-white/5" />
              ) : selectedDetail ? (
                <>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="detail-kpi">
                      <span>Sede</span>
                      <strong>
                        {selectedDetail.gameInfo?.venue?.fullName ??
                          competitionOf(selectedEvent)?.venue?.fullName ??
                          "—"}
                      </strong>
                    </div>
                    <div className="detail-kpi">
                      <span>Asistencia</span>
                      <strong>
                        {selectedDetail.gameInfo?.attendance?.toLocaleString(
                          "es-MX",
                        ) ?? "—"}
                      </strong>
                    </div>
                    <div className="detail-kpi">
                      <span>Prob. local en vivo</span>
                      <strong>
                        {typeof latestWinProbability === "number"
                          ? (latestWinProbability * 100).toFixed(1) + "%"
                          : "—"}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <h3 className="section-title">Estadísticas de equipo</h3>
                    <TeamStatsTable stats={selectedDetail.teamStats ?? []} />
                  </div>

                  <div>
                    <h3 className="section-title">Estadísticas de jugadores</h3>
                    <PlayerStats teams={selectedDetail.playerStats ?? []} />
                  </div>

                  <div>
                    <h3 className="section-title">Reporte de lesiones</h3>
                    {selectedInjuries.length ? (
                      <div className="grid gap-2 md:grid-cols-2">
                        {selectedInjuries.map((injury, index) => (
                          <div
                            key={injury.player + "-" + index}
                            className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <strong className="text-sm">
                                  {injury.player}
                                </strong>
                                <p className="text-xs text-slate-500">
                                  {injury.team}
                                </p>
                              </div>
                              <span className="rounded-full bg-amber-400/10 px-2 py-1 text-[11px] font-bold text-amber-300">
                                {injury.status}
                              </span>
                            </div>
                            {injury.detail && (
                              <p className="mt-2 text-xs text-slate-400">
                                {injury.detail}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        No hay lesiones publicadas en el feed del partido.
                      </p>
                    )}
                  </div>

                  <div>
                    <h3 className="section-title">Mercado actual</h3>
                    <OddsStrip
                      event={selectedEvent}
                      odds={oddsForEvent(selectedEvent, odds)}
                    />
                  </div>

                  <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-5 text-slate-500">
                    Las probabilidades generadas por IA son estimaciones y no
                    garantizan resultados. Las líneas pueden cambiar entre
                    casas y con el tiempo.
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  Selecciona “Ver estadísticas” para cargar el detalle.
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
