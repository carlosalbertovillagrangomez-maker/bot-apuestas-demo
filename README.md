# NFL Analytics Bot

Aplicación Next.js enfocada exclusivamente en football americano NFL.

## Qué incluye

- Cartelera de la semana NFL.
- Marcadores y estado de los partidos.
- Récord general de cada equipo.
- Estadísticas acumuladas de temporada por equipo, organizadas por categorías.
- Navegación entre semanas de temporada regular.
- Logos, sede y contexto del encuentro.
- Moneyline, spread y total desde The Odds API.
- Cuota disponible y consumo de créditos de The Odds API.
- Box score de equipo.
- Estadísticas individuales de jugadores cuando ESPN las publica.
- Reporte de lesiones disponible en el feed del partido.
- Probabilidad en vivo cuando existe en el detalle de ESPN.
- Análisis con Gemini basado en los datos reales que recibe la app.
- Interfaz responsive para computadora, tablet y teléfono.

## Fuentes de datos

### ESPN

La aplicación consume endpoints JSON públicos utilizados por el sitio de ESPN para:

- scoreboard NFL;
- detalle/summary del partido;
- box score;
- estadísticas de equipo;
- estadísticas de jugadores;
- lesiones;
- win probability cuando está disponible.

Estos endpoints web no constituyen un contrato de API comercial. Para una operación de producción crítica conviene sustituirlos por un proveedor NFL licenciado con SLA.

### The Odds API

Se usa el sport key oficial:

```
americanfootball_nfl
```

Mercados principales:

- `h2h` = moneyline;
- `spreads` = point spread;
- `totals` = over/under.

La consulta principal usa la región `us` y formato de cuota americano.

## Variables de entorno

Copia el ejemplo:

```powershell
Copy-Item .env.example .env.local
```

Después edita `.env.local`:

```env
ODDS_API_KEY=tu_clave_the_odds_api
GEMINI_API_KEY=tu_clave_gemini
GEMINI_MODEL=gemini-2.5-pro
```

La app todavía reconoce `NEXT_PUBLIC_GEMINI_KEY` como compatibilidad con la versión anterior, pero se recomienda usar `GEMINI_API_KEY` para mantener la llave del lado del servidor.

## Desarrollo local

Requisitos:

- Node.js 20 o superior.
- npm.

Instalación:

```powershell
npm install
npm run dev
```

Abre:

```
http://localhost:3000
```

Validación:

```powershell
npm run lint
npm run build
```

## Endpoints internos

### GET /api/nfl/scoreboard

Devuelve:

- temporada;
- semana;
- eventos NFL;
- resultados;
- récords;
- cuotas NFL;
- estado de cuota de The Odds API.

Acepta opcionalmente:

```
?season=2026&week=3
```

### GET /api/nfl/game?id=EVENT_ID

Devuelve el detalle del partido:

- información de sede;
- box score;
- team stats;
- player stats;
- lesiones;
- win probability;
- datos complementarios disponibles.

### POST /api/predict

Genera el análisis NFL usando Gemini. La instrucción del modelo exige utilizar solamente los datos que recibe y declarar la información faltante en vez de inventarla.

## Nota sobre estadísticas pregame

Los box scores y algunas estadísticas individuales aparecen cuando el proveedor las publica para cada partido. Para un modelo predictivo avanzado pregame con métricas históricas como EPA/play, success rate, CPOE, DVOA-like metrics, strength of schedule y rolling splits, la siguiente fase debe incorporar una base histórica NFL dedicada, por ejemplo nflverse/nflfastR o un proveedor comercial.

## Rama de transformación

La reconstrucción NFL se desarrolló en:

```
feature/nfl-overhaul
```
