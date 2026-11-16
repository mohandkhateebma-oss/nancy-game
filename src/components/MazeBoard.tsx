import React from 'react';
import {
  Direction,
  EnemyState,
  PlannedPreview,
  Point,
  isWall,
  pointKey,
  samePoint,
} from '../game/data';
import { MazeRobotSvg } from './RobotSvg';

interface MazeBoardProps {
  map: string[];
  player: Point;
  facing: Direction;
  enemies: EnemyState[];
  chips: Point[];
  exit: Point;
  visited: Set<string>;
  plannedPreview: PlannedPreview | null;
  showPreview: boolean;
  bumpEvent: { id: number; dir: Direction; target: Point } | null;
  hitFlash: boolean;
  moveDurationMs: number;
  walking: boolean;
  directWalkMode: boolean;
  onTileClick?: (pos: Point) => void;
}

export function MazeBoard({
  map,
  player,
  facing,
  enemies,
  chips,
  exit,
  visited,
  plannedPreview,
  showPreview,
  bumpEvent,
  hitFlash,
  moveDurationMs,
  walking,
  directWalkMode,
  onTileClick,
}: MazeBoardProps) {
  const rows = map.length;
  const cols = map[0]?.length ?? 11;

  const previewIndexMap = new Map<string, number>();
  if (showPreview && plannedPreview) {
    plannedPreview.points.forEach((p, idx) => {
      const k = pointKey(p);
      if (!previewIndexMap.has(k)) {
        previewIndexMap.set(k, idx + 1);
      }
    });
  }

  return (
    <div
      className="relative w-full max-w-[540px] mx-auto rounded-xl border border-[#45569c]/70 bg-[#080d26] p-2.5 shadow-[inset_0_0_28px_rgba(85,239,255,0.06)] select-none"
      role="grid"
      aria-label="Maze board"
    >
      <div
        className="relative w-full"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {/* Static & Trail Tile Layer */}
        {map.map((row, y) =>
          row.split('').map((_, x) => {
            const pos: Point = [x, y];
            const k = pointKey(pos);
            const wallTile = isWall(map, x, y);
            const isVisited = visited.has(k);
            const hasChip = chips.some((c) => samePoint(c, pos));
            const isExitTile = samePoint(exit, pos);
            const isStartTile = x === 1 && y === 1;
            const previewStep = previewIndexMap.get(k);
            const isPlannedBlockedWall =
              showPreview &&
              plannedPreview?.blockedTarget &&
              samePoint(plannedPreview.blockedTarget, pos);
            const isActiveBumpWall =
              bumpEvent && samePoint(bumpEvent.target, pos);

            const isAdjacentToPlayer =
              directWalkMode &&
              !wallTile &&
              Math.abs(player[0] - x) + Math.abs(player[1] - y) === 1;

            return (
              <div key={k} className="aspect-square p-[2px]">
                <button
                  type="button"
                  disabled={!isAdjacentToPlayer}
                  onClick={() => isAdjacentToPlayer && onTileClick?.(pos)}
                  aria-label={
                    wallTile
                      ? `Wall (${x},${y})`
                      : isExitTile
                      ? `Portal Exit (${x},${y})`
                      : hasChip
                      ? `Data Crystal (${x},${y})`
                      : `Floor (${x},${y})`
                  }
                  className={[
                    'relative w-full h-full rounded-[5px] flex items-center justify-center transition-colors duration-150',
                    wallTile
                      ? 'bg-gradient-to-br from-[#3d3f89] to-[#1a1f52] border border-[#7270d6]/65 shadow-[inset_0_0_8px_rgba(154,139,255,0.28)] cursor-default'
                      : isExitTile
                      ? 'bg-[radial-gradient(circle,#7640b0,#211747)] border border-[#d6a3ff] shadow-[0_0_12px_rgba(196,124,255,0.65)]'
                      : isVisited
                      ? 'bg-[radial-gradient(circle,#21577a,#0f2347)] border border-[#347c9a]/80 shadow-[inset_0_0_8px_rgba(85,239,255,0.22)]'
                      : 'bg-[#0b1433] border border-[#1d2b5a]',
                    isAdjacentToPlayer
                      ? 'cursor-pointer hover:border-[#55efff] hover:bg-[#152d5a] focus-visible:outline-2 focus-visible:outline-[#55efff]'
                      : 'cursor-default',
                    isPlannedBlockedWall ? 'ring-2 ring-amber-400/75' : '',
                    isActiveBumpWall ? 'ring-2 ring-rose-500 bg-rose-900/60' : '',
                  ].join(' ')}
                >
                  {/* Start marker */}
                  {isStartTile && !isVisited && (
                    <span className="text-[9px] font-mono-num font-bold text-emerald-300/70">S</span>
                  )}

                  {/* Planned Ghost Path dot */}
                  {previewStep !== undefined && !hasChip && !isExitTile && (
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-cyan-300/45 border border-cyan-200/80 shadow-[0_0_6px_rgba(85,239,255,0.5)]"
                      title={`Planned step ${previewStep}`}
                    />
                  )}

                  {/* Crystal */}
                  {hasChip && (
                    <span
                      className="animate-crystal text-[clamp(14px,2.2vw,22px)] drop-shadow-[0_0_8px_rgba(85,239,255,0.85)] leading-none"
                      aria-hidden="true"
                    >
                      💎
                    </span>
                  )}

                  {/* Exit Portal */}
                  {isExitTile && (
                    <span
                      className="animate-portal text-[clamp(15px,2.4vw,24px)] drop-shadow-[0_0_10px_rgba(216,164,255,0.9)] leading-none"
                      aria-hidden="true"
                    >
                      🌀
                    </span>
                  )}

                  {/* Adjacent step cue in Direct Walk mode */}
                  {isAdjacentToPlayer && !hasChip && !isExitTile && previewStep === undefined && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-300/35" />
                  )}
                </button>
              </div>
            );
          })
        )}

        {/* Smoothly Interpolated Sprite Overlay Layer */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Enemies */}
          {enemies.map((enemy) => (
            <div
              key={enemy.id}
              style={{
                width: `${100 / cols}%`,
                height: `${100 / rows}%`,
                transform: `translate3d(${enemy.pos[0] * 100}%, ${enemy.pos[1] * 100}%, 0)`,
                transition: `transform ${moveDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
              }}
              className="absolute left-0 top-0 p-[3px] flex items-center justify-center"
            >
              <div
                className={[
                  'w-full h-full rounded-[5px] flex items-center justify-center text-[clamp(15px,2.3vw,23px)] leading-none',
                  enemy.type === 'hunter'
                    ? 'bg-[#57234b]/80 border border-rose-400/50 drop-shadow-[0_0_8px_rgba(255,88,122,0.8)]'
                    : 'bg-[#164a62]/80 border border-amber-300/50 drop-shadow-[0_0_8px_rgba(255,214,110,0.65)]',
                ].join(' ')}
                title={enemy.type === 'hunter' ? 'Hunter (tracks you)' : 'Guardian (patrols)'}
              >
                {enemy.type === 'hunter' ? '👾' : '🛰️'}
              </div>
            </div>
          ))}

          {/* Player Robot */}
          <div
            style={{
              width: `${100 / cols}%`,
              height: `${100 / rows}%`,
              transform: `translate3d(${player[0] * 100}%, ${player[1] * 100}%, 0)`,
              transition: `transform ${moveDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
            }}
            className="absolute left-0 top-0 p-[2px] flex items-center justify-center z-10"
          >
            <div
              key={bumpEvent ? `bump-${bumpEvent.id}` : hitFlash ? 'hit' : 'idle'}
              className={[
                'w-full h-full flex items-center justify-center',
                bumpEvent ? `animate-bump-${bumpEvent.dir}` : '',
                hitFlash ? 'animate-hit-shake' : '',
              ].join(' ')}
            >
              <MazeRobotSvg facing={facing} walking={walking} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
