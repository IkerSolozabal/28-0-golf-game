# Matemáticas de la simulación

Todas las constantes viven en [`src/config/gameConfig.ts`](../src/config/gameConfig.ts) (`ENGINE_CONFIG`). El código está en [`src/engine/rating.ts`](../src/engine/rating.ts) y [`src/engine/simulator.ts`](../src/engine/simulator.ts).

## 1. Rating individual

$$R = 0.35\,L + 0.45\,P + 0.20\,T + E_{\text{década}}$$

Resultado limitado a [0, 100].

### L · logros (0-100)

Majors y victorias se normalizan con una **raíz cuadrada** respecto a un tope, para que los primeros títulos pesen más y los extremos (Nicklaus, Woods) no aplasten al resto:

$$M = 100\sqrt{\min\!\left(\tfrac{\text{majors}}{18}, 1\right)} \qquad V = 100\sqrt{\min\!\left(\tfrac{\text{victorias}}{100}, 1\right)}$$

El ranking mundial solo existe desde 1986. Si el jugador lo tiene:

$$K = 100\left(1 - \frac{\text{ranking} - 1}{50}\right) \quad\Rightarrow\quad L = 0.45M + 0.35V + 0.20K$$

Si no (pico anterior a 1986): $L = 0.55M + 0.45V$.

| Config | Valor |
|---|---|
| `achievements.majorsCap` | 18 |
| `achievements.winsCap` | 100 |
| `achievements.rankingFloor` | 50 (nº 51 → 0) |
| `withRanking` | 0.45 / 0.35 / 0.20 |
| `withoutRanking` | 0.55 / 0.45 |

### P · perfil (0-100)

Media de los cuatro atributos: $P = (\text{driver} + \text{hierros} + \text{juegoCorto} + \text{putt}) / 4$.

### T · factor por equipos (0-100)

Porcentaje de puntos en la competición por equipos (`"G-P-E"`), con un **prior bayesiano** de 6 partidos al 50 % para que un 2-0-0 no supere a un 20-12-5:

$$T = 100 \cdot \frac{G + 0.5E + 0.5\cdot 6}{G + P + E + 6}$$

### E · ajuste de época

`rating.eraAdjustment[década]`, aditivo. Por defecto 0 en todas las décadas; sirve para compensar, por ejemplo, si los jugadores modernos salen sistemáticamente infravalorados por tener menos victorias acumuladas.

Ejemplos con los valores por defecto: Nicklaus 88,8 · Woods 85,1 · Seve 78,9 · McIlroy 73,8 · Rahm 69,5 · Montgomerie 66,6 · Fleetwood 62,5.

## 2. Rating por formato

| Formato | Fórmula |
|---|---|
| Individuales | $R$ |
| Fourballs (mejor bola) | $0.65\max(R_1,R_2) + 0.35\min(R_1,R_2) + B_{\text{putt}}$ |
| Foursomes (golpe alterno) | $\tfrac{R_1+R_2}{2} + B_{\text{comp}} + B_{\text{química}}$ |

- **$B_{\text{putt}}$** = +2 si **ambos** tienen `putt ≥ 85` (`fourballs.puttThreshold`, `puttBonus`).
- **$B_{\text{comp}}$** (complementariedad): premia que uno sea mejor con el driver y el otro con los hierros.

  $$\Delta_D = D_1 - D_2,\quad \Delta_H = H_2 - H_1,\qquad B_{\text{comp}} = \begin{cases}\min\!\left(3,\ 0.3\sqrt{\Delta_D\,\Delta_H}\right) & \Delta_D\Delta_H > 0\\ 0 & \text{si no}\end{cases}$$

  Ejemplo: driver 92 vs 84 (Δ=8) y hierros 86 vs 94 (Δ=8) → $0.3\sqrt{64} = 2.4$.
- **$B_{\text{química}}$** = +3 si son pareja histórica (`foursomes.chemistryBonus`). En fourballs es `fourballsChemistryBonus` (0 por defecto).

## 3. Probabilidad de ganar un partido

Curva logística tipo Elo:

$$p = \frac{1}{1 + 10^{-(R_A - R_B)/k}}, \qquad k = 25$$

| $R_A - R_B$ | 0 | 5 | 10 | 15 | 20 | 30 |
|---|---|---|---|---|---|---|
| $p$ | 50 % | 61 % | 72 % | 80 % | 86 % | 94 % |

Resolución del partido (pseudocódigo de la especificación):

```
x = rng()
if x < EMPATE (0.10): return 0.5
return rng() < p ? 1 : 0
```

El margen (`3&2`, `1 up`…) es cosmético: se elige con el mismo RNG, con márgenes más amplios cuanto más favorito era el ganador.

## 4. Copa, MVP y mejor pareja

- **Copa**: el partido *i* de cada sesión enfrenta el hueco *i* del usuario contra el hueco *i* del rival. Total de puntos = suma de partidos (14 o 28).
- **MVP**: más puntos aportados; desempate por menos partidos jugados y después por rating.
- **Mejor pareja**: más puntos en sesiones de parejas; desempate por porcentaje y rating combinado.

## 5. Auto-alinear

Para cada sesión de parejas se hace una **búsqueda exhaustiva** de los emparejamientos que maximizan la suma de ratings por formato (con todos los bonus). Para 12 jugadores y 4 parejas son ~52.000 combinaciones (<0,5 s). Se resta `autoLineup.fatiguePenalty` (0,75) por cada sesión de parejas que el jugador ya haya disputado, para rotar descansos cuando las opciones están igualadas. Las parejas se ordenan de más fuerte a más débil; los individuales, por rating.

## 6. Rival y dificultad

| Dificultad | Estrategia | Efecto |
|---|---|---|
| Fácil | `relative`, offset −6 | Media del rival ≈ media del usuario − 6 |
| Normal | `relative`, offset −1 | Partido igualado; la ventaja la da el capitán |
| Leyenda | `top` | Los mejores del otro bando |

`relative` parte de un equipo aleatorio y hace intercambios aleatorios que acerquen la media al objetivo (búsqueda local, 400 iteraciones). Así el juego está equilibrado aunque un bando del catálogo sea más fuerte (EE. UU. tiene a Nicklaus, Woods, Palmer…).

## 7. Calibración

Referencia medida con el catálogo actual (modo rápido, 400 partidas simuladas por dificultad, usuario con un equipo europeo medio y auto-alinear):

| Rival | Puntos medios del usuario (sobre 14) | 14-0 |
|---|---|---|
| Fácil | 9,0 | muy raro (<0,1 %) |
| Normal | 7,4 | ~0 |
| Leyenda | 3,9 | ~0 |

Palancas, de mayor a menor impacto:

1. **`match.k`**: menor *k* ⇒ más determinista (los favoritos ganan más; el 14-0 es más alcanzable contra rivales débiles). Mayor *k* ⇒ más azar.
2. **`match.drawProbability`**: cada empate rompe el pleno. Probabilidad de pleno con *n* partidos y probabilidad de victoria *p*: $\big((1-e)\,p\big)^n$. Con $e=0.1$, $p=0.8$, $n=14$: ≈ 1 %. Con $n=28$: ≈ 0,01 %.
3. **`rival.*.offset`**: mueve la dificultad sin tocar las fórmulas.
4. **Pesos `rating.weights`**: más peso a `profile` premia los atributos (y el debate sobre ellos); más a `achievements` premia palmarés.
5. **Bonus por formato**: definen cuánto importa la decisión del capitán frente a «elegir a los mejores».

Para recalibrar, ejecuta simulaciones masivas en Node con el propio motor (ver `simulator.test.ts`, el test *makes a perfect score possible but rare* es un buen punto de partida) y compara la distribución de puntos antes y después del cambio.
