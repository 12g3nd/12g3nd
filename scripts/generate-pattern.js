#!/usr/bin/env node
// Generates a daily flow-field SVG seeded by today's UTC date.
// Output: pattern.svg in the repo root.

const fs = require('fs');
const path = require('path');

// ── Tunables ──────────────────────────────────────────────────────────
const WIDTH        = 1200;    // Banner width
const HEIGHT       = 300;     // Banner height (4:1 aspect ratio)
const NUM_LINES    = 700;     // Number of flow lines
const STEPS        = 90;      // Max steps per line
const STEP_SIZE    = 1.6;     // Distance per step
const STROKE_WIDTH = 0.7;
const OPACITY      = 0.45;
const NOISE_BASE   = 0.028;   // Base spatial frequency. Lower = larger features.

// ── Seeded PRNG (mulberry32) ──────────────────────────────────────────
function mulberry32(seed) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Date-derived seed (YYYYMMDD as integer, UTC) ──────────────────────
function dateSeed(date = new Date()) {
  return date.getUTCFullYear() * 10000
       + (date.getUTCMonth() + 1) * 100
       + date.getUTCDate();
}

// ── Generate the SVG body ─────────────────────────────────────────────
function buildPaths(seed) {
  const rand = mulberry32(seed);

  // Daily-randomised field parameters. Each day picks a fresh "weather system".
  const phaseA = rand() * Math.PI * 2;
  const phaseB = rand() * Math.PI * 2;
  const phaseC = rand() * Math.PI * 2;
  const scale  = NOISE_BASE * (0.85 + rand() * 0.3);
  const twist  = rand() * 0.6 - 0.3; // small global rotation in radians

  function fieldAngle(x, y) {
    const a = Math.sin(x * scale       + phaseA);
    const b = Math.cos(y * scale * 1.1 + phaseB);
    const c = Math.sin((x + y) * scale * 0.6 + phaseC);
    return (a + b + c) * Math.PI + twist;
  }

  const lines = [];
  for (let i = 0; i < NUM_LINES; i++) {
    let x = rand() * WIDTH;
    let y = rand() * HEIGHT;
    let d = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    for (let s = 0; s < STEPS; s++) {
      const a = fieldAngle(x, y);
      x += Math.cos(a) * STEP_SIZE;
      y += Math.sin(a) * STEP_SIZE;
      if (x < 0 || x > WIDTH || y < 0 || y > HEIGHT) break;
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    lines.push(`  <path d="${d}"/>`);
  }
  return lines.join('\n');
}

// ── Wrap in an SVG document ───────────────────────────────────────────
function buildSvg(seed) {
  const today = new Date().toISOString().slice(0, 10);
  const paths = buildPaths(seed);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-labelledby="t d">
  <title id="t">Daily flow field, ${today}</title>
  <desc id="d">A generative SVG, regenerated each day from a date-seeded RNG. Seed: ${seed}.</desc>
  <style>
    path { fill: none; stroke: #1a1a1a; stroke-width: ${STROKE_WIDTH}; stroke-linecap: round; opacity: ${OPACITY}; }
    @media (prefers-color-scheme: dark) {
      path { stroke: #e8e8e8; }
    }
  </style>
${paths}
</svg>
`;
}

// ── Main ──────────────────────────────────────────────────────────────
const seed = dateSeed();
const svg  = buildSvg(seed);
const out  = path.resolve(__dirname, '..', 'pattern.svg');
fs.writeFileSync(out, svg);
console.log(`Wrote ${out} (seed ${seed})`);
