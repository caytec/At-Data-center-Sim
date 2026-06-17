import type { ComponentDef } from '../engine/types';

/**
 * Catalog of buildable components.
 *
 * Numbers are deliberately anchored to real 2024-2025 AI-datacenter figures
 * (see docs/ECONOMICS.md for sources) then lightly scaled for a fun idle curve:
 *   - H100-class GPU ~700 W, rents for ~$2-4 / GPU-hour
 *   - Dense AI racks draw 60+ kW
 *   - PUE 1.6 (air) -> 1.1 (direct liquid cooling)
 *
 * `capex` is the base price of unit #0; each owned unit multiplies the next
 * price by `costGrowth` (the classic incremental-game cost curve).
 */
export const COMPONENTS: ComponentDef[] = [
  // ---- Compute (revenue) ----
  {
    id: 'rented-gpu',
    kind: 'gpu',
    name: 'Rented GPU Slot',
    blurb: 'A single GPU you rent by the hour and sublease to AI startups. Your first dollar.',
    capex: 1_500,
    costGrowth: 1.1,
    usefulLifeHours: 8_760, // 1 year
    powerKW: 0.7, // ~H100 draw
    revenuePerHour: 1.4,
    pflops: 0.5,
    unlockTier: 1,
  },
  {
    id: 'h100-node',
    kind: 'gpu',
    name: 'Owned H100 Node',
    blurb: 'You buy the silicon outright. Higher margin, but the capital is yours to depreciate.',
    capex: 30_000,
    costGrowth: 1.08,
    usefulLifeHours: 26_280, // 3 years
    powerKW: 0.7,
    revenuePerHour: 2.8,
    pflops: 1,
    unlockTier: 3,
  },
  {
    id: 'gb200-rack',
    kind: 'gpu',
    name: 'GB200 Liquid Rack',
    blurb: 'A full rack of next-gen accelerators. Enormous output, enormous power bill.',
    capex: 400_000,
    costGrowth: 1.07,
    usefulLifeHours: 26_280,
    powerKW: 60, // dense AI rack
    revenuePerHour: 72,
    pflops: 40,
    unlockTier: 6,
  },

  // ---- Cooling (lowers PUE) ----
  {
    id: 'fans',
    kind: 'cooling',
    name: 'Hot-Aisle Fans',
    blurb: 'Basic airflow. Nudges PUE from 1.6 down to 1.5.',
    capex: 5_000,
    costGrowth: 1.0,
    usefulLifeHours: 43_800, // 5 years
    enablesPUE: 1.5,
    unlockTier: 1,
  },
  {
    id: 'containment',
    kind: 'cooling',
    name: 'Aisle Containment',
    blurb: 'Separate hot and cold air. PUE 1.3 — real money saved on power.',
    capex: 50_000,
    costGrowth: 1.0,
    usefulLifeHours: 43_800,
    enablesPUE: 1.3,
    unlockTier: 4,
  },
  {
    id: 'liquid',
    kind: 'cooling',
    name: 'Direct Liquid Cooling',
    blurb: 'Coolant on the chip. PUE 1.12 — hyperscaler-grade efficiency.',
    capex: 500_000,
    costGrowth: 1.0,
    usefulLifeHours: 43_800,
    enablesPUE: 1.12,
    unlockTier: 6,
  },

  // ---- Power capacity (kW headroom) ----
  {
    id: 'circuit',
    kind: 'power',
    name: '30A Power Circuit',
    blurb: 'More amps from the wall. Without capacity, GPUs throttle.',
    capex: 2_000,
    costGrowth: 1.12,
    usefulLifeHours: 87_600,
    powerCapacityKW: 10,
    unlockTier: 1,
  },
  {
    id: 'substation',
    kind: 'power',
    name: 'Utility Substation Feed',
    blurb: 'A direct line from the grid. Megawatts of headroom.',
    capex: 150_000,
    costGrowth: 1.1,
    usefulLifeHours: 175_200,
    powerCapacityKW: 1_000,
    unlockTier: 5,
  },

  // ---- Staff (ops capacity) ----
  {
    id: 'technician',
    kind: 'staff',
    name: 'Data Center Technician',
    blurb: 'Keeps the lights on. Each tech can babysit ~50 GPUs. Costs salary every hour.',
    capex: 0, // hiring is "free"; the cost is the recurring salary
    costGrowth: 1.0,
    usefulLifeHours: 1,
    salaryPerYear: 80_000,
    opsCapacity: 50,
    unlockTier: 3,
  },
];

export const COMPONENTS_BY_ID: Record<string, ComponentDef> = Object.fromEntries(
  COMPONENTS.map((c) => [c.id, c]),
);
