# 28-0 · Golf match play (Europa vs EE. UU.)

Juego web de golf en el que eliges un equipo de leyendas, las emparejas como capitán y simulas un enfrentamiento por equipos a *match play*. El objetivo es el **partido perfecto**: ganar todos los puntos en juego (14-0 en el modo rápido, 28-0 en el completo).

> MVP · **Fase 1**: SPA estática (React + Vite + TypeScript + MUI), sin servidor ni cuentas. Todo (catálogo, motor y tarjeta para compartir) corre en el navegador.

---

## Reglas del juego

Una partida dura unos 5 minutos y tiene tres fases.

### 1. Draft con ruleta
1. Eliges bando: **Europa** o **EE. UU.**
2. En cada turno la ruleta marca una combinación aleatoria de **década + país** («España · años 80») o **década + major** («Masters · años 2000»).
3. Eliges un jugador de la lista filtrada. **Cada jugador solo puede elegirse una vez por partida.**
4. Se repite hasta completar el equipo: **6 jugadores** (modo rápido) o 12 (modo completo, Fase 2).
5. La máquina genera un **rival all-time del otro bando** según la dificultad:
   - **Fácil / Normal**: equipo aleatorio cuya media de rating ≈ la tuya − 6 / − 1.
   - **Leyenda**: los mejores jugadores de la historia del otro bando.

### 2. Alineación del capitán
Repartes a tus jugadores en las sesiones. Cada partido vale **1 punto** (½ si acaba empatado).

| Sesión | Formato | Rápido (6) | Completo (12) | Qué premia |
|---|---|---|---|---|
| Viernes mañana | Foursomes (golpe alterno) | 2 | 4 | Complementariedad y precisión |
| Viernes tarde | Fourballs (mejor bola) | 2 | 4 | Birdies y agresividad |
| Sábado mañana | Foursomes | 2 | 4 | Complementariedad y precisión |
| Sábado tarde | Fourballs | 2 | 4 | Birdies y agresividad |
| Domingo | Individuales | 6 | 12 | Nivel individual y presión |
| **Total** | | **14** | **28** | |

En las sesiones de parejas descansan 2 de 6 (o 4 de 12) jugadores. El botón **«Auto-alinear»** propone la alineación óptima y tú solo ajustas: toca un hueco para abrir el selector; si eliges a alguien que ya juega en esa sesión, se intercambian.

### 3. Simulación y resultado
- Se simulan todos los partidos y se muestran **sesión a sesión** con el marcador acumulado.
- Pantalla final: marcador, **MVP** de tu equipo y **mejor pareja**.
- **Tarjeta compartible** (PNG 1080×1350) generada en el navegador con `html-to-image`: se comparte con la Web Share API en móvil o se descarga.
- Cada partida tiene una **semilla**: el mismo draft y la misma alineación con esa semilla reproducen exactamente el resultado.

### Modos
| Modo | Estado |
|---|---|
| Rápido · 6 jugadores · 14 pts · Clásico (con estadísticas) | ✅ Fase 1 |
| Completo · 12 jugadores · 28 pts | 🧩 Estructura lista, desactivado por *feature flag* (`GAME_MODES.full.enabled`) |
| GolfIQ (solo nombre y década) | 🧩 Implementado en la UI, desactivado por *feature flag* (`GOLFIQ_ENABLED`) |
| Reto diario (semilla por fecha), ranking | Fase 2 (el RNG con semilla ya lo soporta) |

---

## Instalación y desarrollo

Requisitos: **Node.js ≥ 24** y npm. Recomendado: **Node 26 LTS** (el que usa CI, fijado en [`.nvmrc`](.nvmrc)).

```bash
npm install
```

```bash
npm run dev
```

Abre `http://localhost:5173/28-0-golf-game/` (el sub-path coincide con el de GitHub Pages).

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm test` | Tests del motor (Vitest) |
| `npm run build` | Type-check (`tsc -b`) + build de producción en `dist/` |
| `npm run preview` | Sirve el build de `dist/` |

Para servir en la raíz (dominio propio, otro hosting):

```bash
VITE_BASE=/ npm run build
```

## Despliegue en GitHub Pages

El workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) se ejecuta en cada *push* a `main`: instala, pasa los tests, construye con `VITE_BASE=/<nombre-del-repo>/`, copia `index.html` a `404.html` (fallback SPA) y publica `dist/` con `actions/deploy-pages`.

Configuración única en GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**. La web queda en `https://<usuario>.github.io/28-0-golf-game/`.

## Ajustar el juego sin tocar el motor

- **Pesos, `k`, empate, bonus, dificultad**: [`src/config/gameConfig.ts`](src/config/gameConfig.ts). Explicación en [`docs/SIMULATION_MATH.md`](docs/SIMULATION_MATH.md).
- **Jugadores**: [`src/data/players.json`](src/data/players.json). Una ficha por jugador y década de pico:

```json
{
  "id": "seve-1980s",
  "nombre": "Seve Ballesteros",
  "bando": "EU",
  "pais": "España",
  "decada": 1980,
  "majors": 5,
  "majorsGanados": ["Masters", "The Open"],
  "victorias": 90,
  "mejorRankingMundial": 1,
  "recordEquipos": "20-12-5",
  "driver": 80, "hierros": 88, "juegoCorto": 99, "putt": 90,
  "parejasHistoricas": ["olazabal-1990s"]
}
```

Los campos siguen el modelo de datos del documento de especificación (en camelCase ASCII). `majorsGanados` es una extensión necesaria para resolver las tiradas «década + major». `mejorRankingMundial` es `null` para jugadores cuyo pico es anterior a 1986. Las parejas históricas son simétricas a efectos del bonus (basta con declararlas en uno de los dos).

> ⚠️ El catálogo inicial (65 leyendas) es **aproximado**: victorias, récords por equipos y atributos son una estimación editorial para el MVP y deben revisarse con fuentes oficiales antes del lanzamiento.

## Restricciones legales
- No se usa la marca de la competición real ni sus logos o trofeo: el formato se describe como «Europa vs EE. UU. a match play».
- Sin fotografías de jugadores: avatares con iniciales en el color de cada bando.

## Documentación
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): flujo de datos, estructura de carpetas y diagrama de estados.
- [`docs/SIMULATION_MATH.md`](docs/SIMULATION_MATH.md): fórmulas, pesos y calibración.

## Convenciones
Commits según [Conventional Commits](https://www.conventionalcommits.org/) (`feat(engine): …`, `fix(ui): …`, `docs: …`).
