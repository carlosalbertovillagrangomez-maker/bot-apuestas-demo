"use client";

import { useState, useEffect } from "react";

const LEAGUES = [
  { id: "soccer_mexico_ligamx", name: "Liga MX 🇲🇽" },
  { id: "soccer_epl", name: "Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: "soccer_spain_la_liga", name: "La Liga 🇪🇸" },
  { id: "soccer_italy_serie_a", name: "Serie A 🇮🇹" },
  { id: "soccer_france_ligue_one", name: "Ligue 1 🇫🇷" },
  { id: "soccer_germany_bundesliga", name: "Bundesliga 🇩🇪" },
  { id: "soccer_conmebol_copa_libertadores", name: "Copa Libertadores 🌎" },
  { id: "soccer_uefa_champs_league", name: "Champions League 🏆" },
];

// --- CONFIGURACIÓN DEL CANDADO ---
const FECHA_EXPIRACION = new Date('2026-05-13T21:30:00'); // Expira mañana a esta hora
const LIMITE_CONSULTAS = 8;

export default function Home() {
  const [selectedLeague, setSelectedLeague] = useState(LEAGUES[0].id);
  const [matches, setMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [predictions, setPredictions] = useState<{ [key: string]: string }>({});
  const [analyzing, setAnalyzing] = useState<{ [key: string]: boolean }>({});
  
  // Estados para el control de la demo
  const [count, setCount] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  // Verificar estado al cargar la página
  useEffect(() => {
    const savedCount = localStorage.getItem("demo_queries_count");
    if (savedCount) setCount(parseInt(savedCount));

    const checkTime = () => {
      if (new Date() > FECHA_EXPIRACION) setIsExpired(true);
    };
    
    checkTime();
    const interval = setInterval(checkTime, 60000); // Revisar cada minuto
    return () => clearInterval(interval);
  }, []);

  const fetchMatches = async () => {
    if (isExpired || count >= LIMITE_CONSULTAS) return;
    setLoadingMatches(true);
    try {
      const res = await fetch(`/api/matches?league=${selectedLeague}`);
      const data = await res.json();
      setMatches(data.matches?.slice(0, 10) || []);
    } catch (error) {
      console.error("Error");
    } finally {
      setLoadingMatches(false);
    }
  };

  const analyzeMatch = async (match: any) => {
    // Bloqueo si ya llegó al límite
    if (count >= LIMITE_CONSULTAS) {
      alert("Has alcanzado el límite de 8 consultas de esta demostración.");
      return;
    }

    setAnalyzing({ ...analyzing, [match.id]: true });

    const bookmaker = match.bookmakers?.[0];
    const oddsInfo = bookmaker ? `Cuotas (${bookmaker.title}): ${JSON.stringify(bookmaker.markets[0].outcomes)}` : "Cuotas no disponibles.";

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
      
      // Incrementar y guardar contador
      const newCount = count + 1;
      setCount(newCount);
      localStorage.setItem("demo_queries_count", newCount.toString());

    } catch (error) {
      setPredictions({ ...predictions, [match.id]: "Error al analizar." });
    } finally {
      setAnalyzing({ ...analyzing, [match.id]: false });
    }
  };

  // Pantalla de Expiración por Tiempo
  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-gray-900 p-8 rounded-2xl border border-red-500/50">
          <h1 className="text-3xl font-bold mb-4">Demo Finalizada 🔒</h1>
          <p className="text-gray-400">El tiempo de acceso de 24 horas ha expirado. Contacta al desarrollador para obtener una licencia completa.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 font-sans pb-20">
      <div className="max-w-4xl mx-auto mt-6">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Bot de Apuestas PRO ⚽</h1>
            <p className="text-gray-400">Demostración Temporal Activa</p>
          </div>
          <div className="bg-emerald-900/30 border border-emerald-500/50 p-3 rounded-lg text-right">
            <p className="text-xs text-emerald-400 font-mono uppercase tracking-widest">Consultas Demo</p>
            <p className="text-2xl font-bold">{count} / {LIMITE_CONSULTAS}</p>
          </div>
        </div>

        {/* Panel de Control */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 mb-8 flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-400 mb-2">Selecciona la Competición</label>
            <select 
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-emerald-500 transition"
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value)}
              disabled={count >= LIMITE_CONSULTAS}
            >
              {LEAGUES.map((league) => (
                <option key={league.id} value={league.id}>{league.name}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={fetchMatches}
            disabled={loadingMatches || count >= LIMITE_CONSULTAS}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 px-8 py-3 rounded-lg font-bold transition disabled:bg-gray-700"
          >
            {loadingMatches ? "Buscando..." : "Cargar Cartelera"}
          </button>
        </div>

        {/* Mensaje de límite alcanzado */}
        {count >= LIMITE_CONSULTAS && (
          <div className="bg-amber-900/20 border border-amber-600/50 p-4 rounded-xl mb-8 text-center text-amber-200">
            ⚠️ Has alcanzado el límite de 8 consultas de prueba.
          </div>
        )}

        <div className="space-y-6">
          {matches.map((match) => (
            <div key={match.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="p-5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-800/30">
                <div className="text-center sm:text-left">
                  <p className="text-sm text-emerald-400 font-semibold mb-1">
                    {new Date(match.commence_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                  <h3 className="text-xl font-bold">
                    {match.home_team} <span className="text-gray-500 mx-2">vs</span> {match.away_team}
                  </h3>
                </div>
                
                <button 
                  onClick={() => analyzeMatch(match)}
                  disabled={analyzing[match.id] || count >= LIMITE_CONSULTAS}
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
        </div>
      </div>
    </main>
  );
}