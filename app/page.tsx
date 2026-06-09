"use client";

import { useState } from "react";

// Códigos oficiales de The Odds API - ¡Mundial Agregado!
const LEAGUES = [
  { id: "soccer_fifa_world_cup", name: "Copa Mundial FIFA 🏆🌍" },
  { id: "soccer_mexico_ligamx", name: "Liga MX 🇲🇽" },
  { id: "soccer_epl", name: "Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: "soccer_spain_la_liga", name: "La Liga 🇪🇸" },
  { id: "soccer_italy_serie_a", name: "Serie A 🇮🇹" },
  { id: "soccer_france_ligue_one", name: "Ligue 1 🇫🇷" },
  { id: "soccer_germany_bundesliga", name: "Bundesliga 🇩🇪" },
  { id: "soccer_conmebol_copa_libertadores", name: "Copa Libertadores 🌎" },
  { id: "soccer_uefa_champs_league", name: "Champions League 🏆" },
];

export default function Home() {
  const [selectedLeague, setSelectedLeague] = useState(LEAGUES[0].id);
  const [matches, setMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [predictions, setPredictions] = useState<{ [key: string]: string }>({});
  const [analyzing, setAnalyzing] = useState<{ [key: string]: boolean }>({});

  const fetchMatches = async () => {
    setLoadingMatches(true);
    setMatches([]);
    setPredictions({});
    
    try {
      const res = await fetch(`/api/matches?league=${selectedLeague}`);
      const data = await res.json();
      // Mostramos los primeros 10 partidos
      setMatches(data.matches?.slice(0, 10) || []);
    } catch (error) {
      console.error("Error descargando partidos");
    } finally {
      setLoadingMatches(false);
    }
  };

  const analyzeMatch = async (match: any) => {
    setAnalyzing({ ...analyzing, [match.id]: true });

    const bookmaker = match.bookmakers?.[0];
    const oddsInfo = bookmaker ? `Cuotas (${bookmaker.title}): ${JSON.stringify(bookmaker.markets[0].outcomes)}` : "Cuotas no disponibles aún.";

    const matchDataForAI = {
      home: match.home_team,
      away: match.away_team,
      league: LEAGUES.find(l => l.id === selectedLeague)?.name || "Liga",
      date: new Date(match.commence_time).toLocaleString(),
      stats: oddsInfo,
    };

    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchData: matchDataForAI }),
      });
      const data = await res.json();
      setPredictions({ ...predictions, [match.id]: data.prediction });
    } catch (error) {
      setPredictions({ ...predictions, [match.id]: "Error al analizar con IA." });
    } finally {
      setAnalyzing({ ...analyzing, [match.id]: false });
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 font-sans pb-20">
      <div className="max-w-4xl mx-auto mt-6">
        
        {/* Cabecera con temática Mundialista (detalles dorados) */}
        <div className="bg-gradient-to-r from-yellow-600/20 to-yellow-900/20 border border-yellow-500/30 p-6 rounded-2xl mb-8">
          <h1 className="text-4xl font-bold mb-2 text-yellow-500">Bot de Apuestas PRO 🌍🏆</h1>
          <p className="text-gray-300">Edición Especial: Copa Mundial y Ligas Mayores. Sin límites de análisis.</p>
        </div>

        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 mb-8 flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-400 mb-2">Selecciona la Competición</label>
            <select 
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-yellow-500 transition"
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value)}
            >
              {LEAGUES.map((league) => (
                <option key={league.id} value={league.id}>{league.name}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={fetchMatches}
            disabled={loadingMatches}
            className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-500 text-black px-8 py-3 rounded-lg font-bold transition disabled:bg-gray-700 disabled:text-gray-400"
          >
            {loadingMatches ? "Buscando..." : "Cargar Cartelera"}
          </button>
        </div>

        <div className="space-y-6">
          {matches.map((match) => (
            <div key={match.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="p-5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-800/30">
                <div className="text-center sm:text-left">
                  <p className="text-sm text-yellow-500 font-semibold mb-1">
                    {new Date(match.commence_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                  <h3 className="text-xl font-bold">
                    {match.home_team} <span className="text-gray-500 mx-2">vs</span> {match.away_team}
                  </h3>
                </div>
                
                <button 
                  onClick={() => analyzeMatch(match)}
                  disabled={analyzing[match.id]}
                  className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap disabled:bg-gray-700 w-full sm:w-auto"
                >
                  {analyzing[match.id] ? "Analizando..." : "Analizar con IA"}
                </button>
              </div>

              {predictions[match.id] && (
                <div className="p-6 border-t border-gray-800 bg-gray-900/50">
                  <div className="text-gray-200 whitespace-pre-wrap leading-relaxed text-sm">
                    {predictions[match.id]}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {matches.length === 0 && !loadingMatches && (
            <p className="text-center text-gray-500 py-10 border border-dashed border-gray-800 rounded-xl">
              Selecciona una liga y carga la cartelera.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}