import type { TierDef } from '../engine/types';

/**
 * The zero-to-hero progression. Advancing a tier is gated on net worth and
 * triggers a lesson card. Tiers 1-5 are fully wired in the MVP; 6-8 are data
 * stubs that unlock late-game components and remain a roadmap surface.
 */
export const TIERS: TierDef[] = [
  {
    tier: 1,
    name: 'The Closet',
    blurb: 'One GPU humming in a converted closet. Welcome to the business.',
    netWorthRequired: 0,
    lessonId: 'gross-margin',
  },
  {
    tier: 2,
    name: 'The Garage Rack',
    blurb: 'A full rack and some fans. You are officially a tiny cloud provider.',
    netWorthRequired: 15_000,
    lessonId: 'capex-vs-opex',
  },
  {
    tier: 3,
    name: 'Server Room',
    blurb: 'Real hardware, real staff. Payroll is now a thing you think about.',
    netWorthRequired: 120_000,
    lessonId: 'fixed-vs-variable',
  },
  {
    tier: 4,
    name: 'Data Hall',
    blurb: 'Containment and a power contract. Efficiency becomes your edge.',
    netWorthRequired: 1_000_000,
    lessonId: 'pue-efficiency',
  },
  {
    tier: 5,
    name: 'Financed Expansion',
    blurb: 'Borrow to grow. Other people’s money — used well — accelerates everything.',
    netWorthRequired: 8_000_000,
    lessonId: 'leverage',
  },
  {
    tier: 6,
    name: 'Hyperscale Campus',
    blurb: 'Megawatts and liquid cooling. Scale changes the math.',
    netWorthRequired: 75_000_000,
    lessonId: 'economies-of-scale',
  },
  {
    tier: 7,
    name: 'Multi-Region Operator',
    blurb: 'Sites on three continents, SLAs, diversified demand.',
    netWorthRequired: 500_000_000,
    lessonId: 'diversification',
  },
  {
    tier: 8,
    name: 'IPO',
    blurb: 'Go public. Reset operations for permanent multipliers and a valuation.',
    netWorthRequired: 5_000_000_000,
    lessonId: 'equity-valuation',
  },
];

/** Highest tier whose netWorthRequired is met. */
export function tierForNetWorth(netWorth: number): number {
  let t = 1;
  for (const def of TIERS) {
    if (netWorth >= def.netWorthRequired) t = def.tier;
  }
  return t;
}
