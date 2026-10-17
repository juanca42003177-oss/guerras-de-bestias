# ⚔️ Guerras de Bestias — Diseño (v1)

Juego de cartas original estilo ninja de Dragon Trade Labs. NADA de Naruto/Shueisha:
personajes, nombres y arte 100% propios.

## App separada
Este juego vive SOLO aquí. No se toca Dragon Trade ni Intercambio X SwapX
(ambas en revisión de World). Contrato propio nuevo cuando llegue la fase PvP.

## Tablero
- 4 carriles verticales (Territorio). Cada jugador defiende su lado.
- Cada carril propio tiene 1 ranura de Bestia, 1 ranura de Defensor (ninja/kage).
- Vida de cada jugador: 25 puntos. Se pierde al llegar a 0.
- Mano de 4 cartas, robas 1 por turno (mazo de 20, sin cementerio-reciclaje en v1).

## Turnos (resumen)
1. Robas 1 carta y ganas 1 punto de Chakra (energía, máx 10, acumulable).
2. Jueas cartas pagando su costo de Chakra: convocar bestia en carril vacío,
   poner ninja/kage como defensor, o lanzar técnica (hechizo).
3. Fase de Batalla: cada bestia ataca de frente a su carril rival;
   si el carril rival está vacío, golpea la vida del rival directo.
4. Fin del turno.

## Cartas (24 en v1): rarezas
- DIAMANTE = Bestias con Colas (9 cartas, 1 a 9 colas). Las más poderosas.
- ORO = Maestros Kage (6 cartas). Defensores con aura que ayuda a su carril.
- PLATA = Ninjas del Clan (6 cartas). Baratas y versátiles.
- TÉCNICA = hechizos (3 cartas). Efectos de una sola vez.

## Habilidades clave (las que pidió Juan)
- ATAQUE CRUZADO: la bestia ataca también a los carriles vecinos (daño reducido).
- PERÍMETRO: cuando una carta rival entra en un carril adyacente al de esta carta,
  esta se activa: buenfa daño inmediato o escudo. (Se dispara sola, sin turno.)
- AURA KAGE: el defensor da +ataque o +vida a la bestia de su carril.
- ALIENTO DE COLAS: las bestias ganan +1 de daño por cada cola al entrar.

### DIAMANTE — Bestias con Colas
| # | Nombre | Colas | Coste | Atq | Vit | Habilidad |
|---|--------|-------|-------|-----|-----|-----------|
| 1 | Colmillo Ámbar | 1 | 2 | 2 | 3 | ninguno (rápida) |
| 2 | Zorro de Ceniza | 2 | 3 | 3 | 4 | Perímetro: 1 daño al que se acerque |
| 3 | Serpiente del Risco | 3 | 4 | 3 | 5 | Ataque cruzado a ambos vecinos |
| 4 | Rey Mono de Jade | 4 | 5 | 4 | 6 | Perímetro: escudo 2 a su carril |
| 5 | Caballo de Tormenta | 5 | 5 | 5 | 5 | Ataque cruzado (daño completo) |
| 6 | Tejón de la Niebla | 6 | 6 | 4 | 8 | Perímetro: 2 de daño en su carril |
| 7 | Escarabajo del Cráter | 7 | 7 | 6 | 7 | Ataque cruzado + Perímetro |
| 8 | Lobo Ártico | 8 | 8 | 7 | 9 | Ataque cruzado doble |
| 9 | Kuragami, la Devoradora | 9 | 10 | 9 | 10 | Ataque cruzado + Perímetro + gana +1/+1 por turno |

### ORO — Maestros Kage
| Nombre | Coste | Atq | Vit | Aura |
|--------|-------|-----|-----|------|
| Kage del Viento | 3 | 2 | 5 | +1 ataque a la bestia de su carril |
| Kage de la Roca | 4 | 3 | 7 | +2 vida a la bestia de su carril |
| Kage de la Marea | 4 | 2 | 6 | tu bestia ignora Perímetros rivales |
| Kage del Trueno | 5 | 4 | 6 | la bestia de su carril ataca dos carriles ese turno |
| Kage de la Sombra | 5 | 3 | 8 | al entrar, roba 1 carta |
| Gran Kage Dorado | 6 | 5 | 8 | +1/+1 a TODAS tus bestias al entrar |

### PLATA — Ninjas del Clan
| Nombre | Coste | Atq | Vit | Efecto |
|--------|-------|-----|-----|--------|
| Genin Explorador | 1 | 1 | 2 | al entrar, robas 1 carta |
| Genin Ballesta | 2 | 2 | 3 | ataca directo a la vida (ignora defensores) |
| Chunin Muralla | 2 | 1 | 5 | taunt: recibe los golpes de su carril |
| Chunin Sombra | 3 | 3 | 3 | al entrar, 1 daño a una carta rival |
| Jonin Hoja Veloz | 4 | 4 | 4 | +1 ataque si hay bestia en carril adyacente |
| Jonin Sellador | 4 | 3 | 5 | sella: anula la habilidad de una bestia rival |

### TÉCNICA
| Nombre | Coste | Efecto |
|--------|-------|--------|
| Sello Rápido | 2 | devuelve una carta rival a su mano |
| Tormenta de Kunai | 3 | 2 de daño a TODAS las cartas del carril rival elegido |
| Invocación Ancestral | 6 | convoca gratis una bestia de 3 colas o menos de tu mazo |

## Fases
1. (hoy) Diseño + tablero + cartas + práctica vs IA del dragón.
2. Retos PvP con pozo en WLD: contrato propio + lobby + confirmación de ambos
   + arbitraje de Juan + notificaciones (motor conceptual tipo Damas, código nuevo).
3. Vercel project nuevo + mini app en Developer Portal (equipo Dragon Trade Labs).

## Reglas de negocio (heredadas de la marca)
- Apuesta en WLD: mín 1 WLD, máx equivalente a $10 USD (precio vivo), igual que Damas.
- Comisión: 1% del pozo al resolver (contrato).
- Modo práctica gratis contra la IA del dragón.
