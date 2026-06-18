# GigaRack — The Economic Model

This document explains the simulation that powers GigaRack and the real-world
figures it is anchored to. The model lives in pure TypeScript at
`web/src/engine/economics.ts` and is locked down by golden-number tests in
`web/src/engine/__tests__/economics.test.ts`. Balance values live as data in
`web/src/data/`.

The design principle: **every line the player sees is a real P&L line, and every
constant is in the ballpark of a real AI data center** — scaled only enough to make
an idle curve fun.

---

## The per-hour income statement

Each simulation tick computes per-hour rates and scales them by elapsed game time:

```
revenue       = Σ(gpu_count × revenuePerHour) × utilization
powerCost     = effectivePowerKW × PUE × pricePerKWh
opex          = staffSalaries/yr ÷ 8760  +  maintenanceRate × bookValue ÷ 8760
depreciation  = Σ(gpu_count × capex ÷ usefulLifeHours)        # realistic mode only
EBIT          = revenue − powerCost − opex − depreciation
interest      = Σ(loanPrincipal × rate) ÷ 8760               # realistic mode only
netProfit     = EBIT − interest
cash         += netProfit × dtHours
```

Where:

- **`effectivePowerKW = installedKW × (idleFraction + (1 − idleFraction) × utilization)`** —
  idle GPUs still draw a large fraction of full power. This is what teaches *fixed
  vs variable cost*: capacity you bought but aren't selling is pure drag.
- **`utilization = clamp(demand × powerFactor × opsFactor, 0, 1)`**:
  - `demand` — the shared market index (0–1.05), from the backend.
  - `powerFactor = min(1, powerCapacityKW / installedKW)` — not enough amps ⇒ throttle.
  - `opsFactor = min(1, opsCapacity / gpuCount)` — not enough staff ⇒ throttle.
- **`PUE`** = the lowest (best) value among owned cooling tiers (default 1.6).
- **`bookValue = totalCapexSpent − accumulatedDepreciation`** (floored at 0).
- **`netWorth = cash + bookValue − debt`** — the headline leaderboard score.

---

## Real-world anchors

| Quantity                       | Real-world figure (2024–2025)                      | In GigaRack                         |
| ------------------------------ | -------------------------------------------------- | ----------------------------------- |
| GPU power draw (H100-class)    | ~700 W at full load                                | `powerKW: 0.7` per GPU              |
| GPU rental price               | ~$2–4 / GPU-hour                                    | `revenuePerHour: 1.4–2.8`           |
| Dense AI rack power            | 60+ kW per rack                                     | GB200 rack `powerKW: 60`            |
| **PUE** (air-cooled GPU halls) | ~1.5–1.6                                            | base `1.6`, fans `1.5`              |
| **PUE** (direct liquid)        | ~1.1–1.15                                           | liquid cooling `1.12`               |
| Industrial power price         | ~$0.07–0.15 / kWh                                   | `pricePerKWh: 0.08` (easy) / `0.10` |
| AI capacity cost               | ~$3.5M / MW (vs ~$1.2M/MW traditional)             | reflected in late-tier CapEx        |
| Hardware refresh cycle         | ~3 years useful life                               | `usefulLifeHours: 26,280`           |

A worked example — **one rented GPU, realistic mode, demand 0.75**:

```
utilization  = 0.75
revenue      = 1.4 × 0.75            = $1.05 /hr
effPowerKW   = 0.7 × (0.4 + 0.6×0.75)= 0.595 kW
powerCost    = 0.595 × 1.6 × 0.10    = $0.0952 /hr
depreciation = 1500 ÷ 8760           = $0.171 /hr
maintenance  = 0.03 × 1500 ÷ 8760    = $0.0051 /hr
EBIT         = 1.05 − 0.0952 − 0.0051 − 0.171 = $0.778 /hr
```

(These exact numbers are asserted in the test suite.)

---

## How each concept is *taught by the mechanics*

| Business concept        | The mechanic that makes you feel it                                   |
| ----------------------- | -------------------------------------------------------------------- |
| Gross margin            | Revenue minus power cost, shown live and as a KPI.                    |
| CapEx vs OpEx           | Renting (low CapEx) vs owning H100s (high CapEx, lower OpEx).         |
| Fixed vs variable cost  | Salaries/depreciation don't move with sales; power does. Idle = drag.|
| PUE / efficiency        | Cooling upgrades cut the power bill with zero loss in output.        |
| Utilization             | Power and staff caps throttle output until you invest in capacity.   |
| Leverage / financing    | Loans add cash now and fixed interest forever — profit on the spread.|
| Depreciation            | Owned hardware loses book value over its useful life.                |
| Economies of scale      | Late-tier components spread fixed costs across far more output.       |
| Equity & valuation      | The IPO/prestige tier converts a run into a valuation multiplier.    |

---

## Difficulty knobs

`web/src/engine/economics.ts › DIFFICULTY` holds every tunable, per mode:

| Knob                    | Easy   | Realistic |
| ----------------------- | ------ | --------- |
| Starting cash           | $7,500 | $5,000    |
| Power price ($/kWh)     | 0.08   | 0.10      |
| Maintenance (%/yr)      | 1%     | 3%        |
| Idle power fraction     | 0.30   | 0.40      |
| Loan rate               | 8%     | 12%       |
| Full accounting         | off    | on        |
| Baseline demand         | 0.90   | 0.75      |

"Full accounting" off (Easy) hides depreciation and disables financing so beginners
see a clean revenue-minus-costs picture before the full P&L is introduced.

---

## Sources

Figures above are drawn from public 2024–2025 industry reporting on AI data center
power, cost, and efficiency (NVIDIA H100/DGX/GB200 power specs; PUE benchmarks from
hyperscaler disclosures; IEA/industry power-cost analyses; per-MW build-cost
estimates). They are approximations chosen for pedagogy and game balance, not
investment advice.
