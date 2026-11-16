import React from 'react';
import {
  ARCHETYPES,
  ARCHETYPE_COLORS,
  ARCHETYPE_DESCRIPTIONS,
  MissionConfig,
  PlayMetrics,
  Point,
  SKILL_ROADMAP,
  SPEC_NAMES,
  isWall,
  pointKey,
  samePoint,
  scoreProfile,
} from '../game/data';
import { ArchetypeRobotSvg } from './RobotSvg';

interface ResultsScreenProps {
  mission: MissionConfig;
  metrics: PlayMetrics;
  visited: Set<string>;
  route: Point[];
  livesRemaining: number;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export function ResultsScreen({
  mission,
  metrics,
  visited,
  route,
  livesRemaining,
  onPlayAgain,
  onMainMenu,
}: ResultsScreenProps) {
  const pct = scoreProfile(metrics, visited.size, route.length, livesRemaining);
  const ranked = pct
    .map((value, index) => ({ value, index }))
    .sort((a, b) => b.value - a.value);
  const first = ranked[0].index;
  const second = ranked[1].index;

  let cumulative = 0;
  const donutStops = pct
    .map((v, i) => {
      const start = cumulative;
      cumulative += v;
      return `${ARCHETYPE_COLORS[i]} ${start}% ${cumulative}%`;
    })
    .join(', ');

  const unique = visited.size;
  const routeLen = Math.max(1, route.length);
  const ratio = unique / routeLen;
  const playStyle =
    ratio > 0.78
      ? 'The Direct Pathfinder'
      : ratio < 0.48
      ? 'The Curious Explorer'
      : 'The Adaptive Problem Solver';

  const routeLabel =
    ratio > 0.78 ? 'Direct route' : ratio < 0.48 ? 'Highly exploratory' : 'Balanced route';

  const strengths: string[] = [];
  if (unique > 5) strengths.push('Exploring different maze areas');
  if (metrics.branches > 0) strengths.push('Recognizing route choices');
  if (metrics.blocked > 0) strengths.push('Troubleshooting obstacles');
  if (metrics.avoided > 0 || metrics.safeDistance > 2) strengths.push('Managing risk around threats');
  if (metrics.collect > 0) strengths.push('Gathering optional data');
  if (metrics.turns > 2) strengths.push('Adapting direction smoothly');
  if (strengths.length === 0) {
    strengths.push('Completing a goal', 'Learning through experimentation');
  }

  const cols = mission.map[0].length;
  const rows = mission.map.length;
  const visitedKeys = new Set(route.map(pointKey));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header Summary */}
      <div className="text-center space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#55efff]">
          Mission Completed · Digital DNA Revealed
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-balance bg-gradient-to-r from-[#54f5ff] via-[#a18aff] to-[#ff65dc] bg-clip-text text-transparent">
          Your Digital DNA
        </h1>
        <div className="flex justify-center py-2">
          <ArchetypeRobotSvg index={first} />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs uppercase tracking-[0.16em] text-[#9eb0dc]">Primary Archetype</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#ffd66e]">
            {ARCHETYPES[first]}
          </h2>
          <p className="text-sm font-medium text-[#d4ddff] font-mono-num">
            {SPEC_NAMES[first]} ({pct[first]}%) · Secondary: {SPEC_NAMES[second]} ({pct[second]}%)
          </p>
        </div>
        <p className="text-base sm:text-lg text-[#b4c0e8] max-w-2xl mx-auto leading-relaxed">
          {ARCHETYPE_DESCRIPTIONS[first]} Your route also shows strong signals aligned with{' '}
          <span className="text-white font-medium">{SPEC_NAMES[second]}</span>.
        </p>
      </div>

      {/* Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-[#7068d2]/55 bg-[#12193d]/90 p-6 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#55efff] mb-5">
            Full Spectrum Analysis
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div
              className="relative w-48 h-48 shrink-0 rounded-full shadow-[0_0_28px_rgba(85,239,255,0.18)]"
              style={{ background: `conic-gradient(${donutStops})` }}
              aria-label="Digital DNA percentage breakdown"
            >
              <div className="absolute inset-[28%] rounded-full bg-[#0e1432] border border-[#5263a6]/70 flex items-center justify-center font-display text-lg font-bold text-[#55efff]">
                DNA
              </div>
            </div>

            <div className="w-full space-y-2">
              {pct.map((val, idx) => (
                <div key={SPEC_NAMES[idx]} className="flex items-center gap-2.5 text-sm">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: ARCHETYPE_COLORS[idx] }}
                  />
                  <span className="flex-1 text-[#dce4ff] truncate">{SPEC_NAMES[idx]}</span>
                  <span className="font-mono-num font-bold text-white">{val}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#7068d2]/55 bg-[#12193d]/90 p-6 shadow-xl flex flex-col justify-between space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#55efff] mb-1">
              Your Play Style
            </p>
            <h3 className="font-display text-2xl font-bold text-white mb-2">{playStyle}</h3>
            <p className="text-sm text-[#b4c0e8] leading-relaxed">
              You completed <span className="text-white font-medium">{mission.name}</span> in{' '}
              <span className="font-mono-num text-white">{metrics.moves}</span> moves, explored{' '}
              <span className="font-mono-num text-white">{unique}</span> unique tiles, collected{' '}
              <span className="font-mono-num text-white">{metrics.collect}</span> optional crystals,
              and encountered <span className="font-mono-num text-white">{metrics.blocked}</span>{' '}
              blocked steps.
            </p>
          </div>

          <div className="space-y-2 border-t border-[#7068d2]/25 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#55efff]">
              Observed Strengths
            </p>
            <p className="text-sm text-[#e8eeff] leading-relaxed">{strengths.join(' · ')}</p>
          </div>

          <div className="space-y-2 border-t border-[#7068d2]/25 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#55efff]">
              Top IT Fields & Next Skills
            </p>
            <p className="text-sm font-semibold text-white">
              {ARCHETYPES[first]} ({SPEC_NAMES[first]}) · {ARCHETYPES[second]} ({SPEC_NAMES[second]})
            </p>
            <p className="text-xs text-[#b4c0e8] leading-relaxed">
              Focus: {SKILL_ROADMAP[first]}
            </p>
            <p className="text-xs text-[#9eb0dc] leading-relaxed">
              Also explore: {SKILL_ROADMAP[second]}
            </p>
          </div>
        </div>
      </div>

      {/* Actual Maze Route */}
      <div className="rounded-2xl border border-[#7068d2]/55 bg-[#12193d]/90 p-6 shadow-xl text-center space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#55efff]">
            Your Actual Maze Route
          </p>
          <p className="text-sm text-[#b4c0e8] max-w-xl mx-auto">
            Green marks the start tile, pink marks the exit portal, and cyan tiles trace your
            explored path.
          </p>
        </div>

        <div
          className="grid gap-1 max-w-[380px] mx-auto p-3 rounded-xl bg-[#080e29] border border-[#4b5eaa]/60"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: rows }).map((_, y) =>
            Array.from({ length: cols }).map((__, x) => {
              const p: Point = [x, y];
              const wallTile = isWall(mission.map, x, y);
              const isStart = samePoint(p, mission.start);
              const isExit = samePoint(p, mission.exit);
              const onRoute = visitedKeys.has(pointKey(p));

              return (
                <div
                  key={`${x},${y}`}
                  className={[
                    'aspect-square rounded-[3px] border',
                    wallTile
                      ? 'bg-[#3a3978] border-[#6563b8]'
                      : isStart
                      ? 'bg-[#67e6a5] border-[#67e6a5] shadow-[0_0_8px_#67e6a5]'
                      : isExit
                      ? 'bg-[#ff61d5] border-[#ff61d5] shadow-[0_0_10px_#ff61d5]'
                      : onRoute
                      ? 'bg-[#176a83] border-[#55efff] shadow-[0_0_6px_rgba(85,239,255,0.5)]'
                      : 'bg-[#101a3c] border-[#1d2b5a]',
                  ].join(' ')}
                />
              );
            })
          )}
        </div>

        <p className="text-xs sm:text-sm font-mono-num text-[#c7d3f8]">
          Moves: {metrics.moves} · Unique tiles: {unique} · Crystals: {metrics.collect}/
          {mission.chips.length} · Blocked: {metrics.blocked} · Revisits: {metrics.revisits} ·{' '}
          {routeLabel}
        </p>
      </div>

      {/* Closing CTA */}
      <div className="rounded-2xl border border-[#7068d2]/55 bg-[#12193d]/90 p-6 text-center space-y-4">
        <h2 className="font-display text-xl font-bold text-[#ff61d5]">Keep Exploring</h2>
        <p className="text-sm sm:text-base text-[#b4c0e8] max-w-xl mx-auto">
          Whether you build, protect, analyze, or design — there is a place for your curiosity in
          technology.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap pt-1">
          <button
            type="button"
            onClick={onPlayAgain}
            className="px-6 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-[#277dff] to-[#9948ef] border border-[#a4a5ff]/70 shadow-[0_0_20px_rgba(133,91,255,0.45)] hover:brightness-110 transition cursor-pointer whitespace-nowrap"
          >
            Play Again
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="px-6 py-2.5 rounded-xl font-semibold text-[#e6ecff] bg-[#1a224d] border border-[#5d6bc4] hover:border-[#55efff] transition cursor-pointer whitespace-nowrap"
          >
            Main Menu
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-[#8d9cc9]">
        An exploratory game profile for learning and entertainment, not a scientifically validated
        assessment.
      </p>
    </div>
  );
}
