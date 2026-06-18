import type { LessonDef } from '../engine/types';

/**
 * Plain-language business lessons. Each is tied to a moment in play so the
 * concept lands when the player has just *experienced* it. `{placeholders}` are
 * filled with live numbers by the UI when available.
 *
 * Two registers: `bodyEasy` (gentle, intuitive) and `bodyRealistic` (precise,
 * uses the real terminology) — chosen by the player's difficulty setting.
 */
export const LESSONS: LessonDef[] = [
  {
    id: 'gross-margin',
    concept: 'Gross Margin',
    title: 'You make money on every GPU-hour',
    bodyEasy:
      'Each GPU earns money renting out, and spends a little on electricity. What is left over is your margin. Sell for more than it costs to run — that gap is the whole game.',
    bodyRealistic:
      'Gross margin = (Revenue − Cost of Goods Sold) ÷ Revenue. Here COGS is mostly power. Right now your margin is {grossMargin}%. Keep revenue per GPU-hour well above power cost per GPU-hour and the business prints cash.',
  },
  {
    id: 'capex-vs-opex',
    concept: 'CapEx vs OpEx',
    title: 'Buying vs renting your hardware',
    bodyEasy:
      'Renting a GPU costs a little forever. Buying one costs a lot now but is cheaper over time. Big one-time purchases are CapEx; the ongoing bills are OpEx.',
    bodyRealistic:
      'CapEx (capital expenditure) is up-front spend on assets you own and depreciate over their useful life. OpEx (operating expenditure) is recurring: power, salaries, maintenance. Owning hardware trades higher CapEx for lower OpEx and better long-run margin.',
  },
  {
    id: 'fixed-vs-variable',
    concept: 'Fixed vs Variable Cost',
    title: 'Some bills come whether you sell or not',
    bodyEasy:
      'A technician’s salary is the same whether your GPUs are busy or idle — that is a fixed cost. Power roughly follows how busy you are — that is variable. Idle GPUs still cost you.',
    bodyRealistic:
      'Fixed costs (salaries, depreciation) do not move with utilization; variable costs (power) scale with it. At {utilization}% utilization your idle capacity is pure drag. Raising utilization spreads fixed costs over more revenue — that is operating leverage.',
  },
  {
    id: 'pue-efficiency',
    concept: 'PUE / Efficiency',
    title: 'Power Usage Effectiveness is free money',
    bodyEasy:
      'For every watt your chips use, you waste some on cooling. Better cooling wastes less. Going from PUE 1.6 to 1.3 cuts a big chunk off your power bill — with no loss in output.',
    bodyRealistic:
      'PUE = total facility power ÷ IT power. Air-cooled GPU halls run ~1.5-1.6; direct liquid cooling reaches ~1.1. Your PUE is {pue}. Dropping PUE is operating leverage you buy once and harvest forever — a 1.5→1.1 move is ~27% less power spend.',
  },
  {
    id: 'leverage',
    concept: 'Leverage / Financing',
    title: 'Borrowing to grow faster',
    bodyEasy:
      'A loan gives you cash now to buy more GPUs, in exchange for interest later. If those GPUs earn more than the interest costs, borrowing makes you richer faster. If not, it sinks you.',
    bodyRealistic:
      'Leverage amplifies returns and risk. Borrow at rate r to fund assets returning ROI: you profit on the spread (ROI − r) across borrowed capital, but interest is a fixed cost that must be paid even when demand drops. Mind your payback period and coverage.',
  },
  {
    id: 'economies-of-scale',
    concept: 'Economies of Scale',
    title: 'Bigger gets cheaper per unit',
    bodyEasy:
      'A huge campus can buy power and hardware in bulk and spread its fixed costs across far more GPUs. Cost per GPU-hour falls as you grow — that is why hyperscalers win.',
    bodyRealistic:
      'At scale, fixed costs amortize across more output and procurement/power contracts improve unit cost. Marginal cost per GPU-hour declines, widening margins and raising the barrier to entry for smaller rivals.',
  },
  {
    id: 'diversification',
    concept: 'Diversification',
    title: 'Don’t depend on one site or one customer',
    bodyEasy:
      'If all your GPUs sit in one place and the power fails, you earn nothing. Spreading across regions and customers smooths out the bad days.',
    bodyRealistic:
      'Geographic and customer diversification reduce correlated risk: regional outages, local power-price spikes, or a single customer churning hit a smaller share of revenue. Diversification lowers volatility for a given expected return.',
  },
  {
    id: 'equity-valuation',
    concept: 'Equity & Valuation',
    title: 'What is the whole company worth?',
    bodyEasy:
      'Going public means selling slices of your company to investors. They pay based on how much profit they expect in the future — that total is your valuation.',
    bodyRealistic:
      'Equity value reflects the present value of expected future cash flows. An IPO sells shares at a multiple of earnings/revenue. Reinvesting at high ROIC compounds equity value — the ultimate score of the whole zero-to-hero run.',
  },
];

export const LESSONS_BY_ID: Record<string, LessonDef> = Object.fromEntries(
  LESSONS.map((l) => [l.id, l]),
);
