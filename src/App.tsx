import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Eye,
  EyeOff,
  Pause,
  Play,
  RotateCcw,
  StepForward,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  COMMAND_INFO,
  Direction,
  EnemyState,
  MISSIONS,
  PlayMetrics,
  Point,
  bfsPath,
  createEnemies,
  createInitialMetrics,
  getNeighbors,
  isWall,
  pointKey,
  samePoint,
  simulatePlannedPath,
} from './game/data';
import { sfx } from './game/sound';
import { HeroMascotSvg } from './components/RobotSvg';
import { MazeBoard } from './components/MazeBoard';
import { ResultsScreen } from './components/ResultsScreen';

type Screen = 'home' | 'difficulty' | 'how' | 'game' | 'results';
type ControlMode = 'program' | 'direct';
type SpeedFactor = 1 | 2 | 3;

interface GameSnapshot {
  level: number;
  player: Point;
  facing: Direction;
  lastMoveDir: Direction;
  enemies: EnemyState[];
  chips: Point[];
  lives: number;
  steps: number;
  ended: boolean;
  gameOver: boolean;
  won: boolean;
  visited: Set<string>;
  route: Point[];
  metrics: PlayMetrics;
  feedback: string;
  bumpEvent: { id: number; dir: Direction; target: Point } | null;
  hitFlash: boolean;
}

const SPEED_MS: Record<SpeedFactor, number> = {
  1: 280,
  2: 155,
  3: 85,
};

function makeInitialGame(level: number): GameSnapshot {
  const mission = MISSIONS[level];
  return {
    level,
    player: [mission.start[0], mission.start[1]],
    facing: 'R',
    lastMoveDir: 'R',
    enemies: createEnemies(mission),
    chips: mission.chips.map((p) => [p[0], p[1]]),
    lives: 3,
    steps: 0,
    ended: false,
    gameOver: false,
    won: false,
    visited: new Set([pointKey(mission.start)]),
    route: [[mission.start[0], mission.start[1]]],
    metrics: createInitialMetrics(),
    feedback: 'Build a command sequence or switch to Direct Walk to start moving.',
    bumpEvent: null,
    hitFlash: false,
  };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedLevel, setSelectedLevel] = useState<number>(0);
  const [controlMode, setControlMode] = useState<ControlMode>('program');
  const [speed, setSpeed] = useState<SpeedFactor>(1);
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [muted, setMuted] = useState<boolean>(false);

  const [program, setProgram] = useState<Direction[]>([]);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [running, setRunning] = useState<boolean>(false);
  const [walkingPulse, setWalkingPulse] = useState<boolean>(false);

  const [game, setGame] = useState<GameSnapshot>(() => makeInitialGame(0));

  const gameRef = useRef<GameSnapshot>(game);
  const programRef = useRef<Direction[]>(program);
  const stepIndexRef = useRef<number>(stepIndex);
  const runningRef = useRef<boolean>(running);
  const speedRef = useRef<SpeedFactor>(speed);
  const runTokenRef = useRef<number>(0);
  const bumpCounterRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const activeItemRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    programRef.current = program;
  }, [program]);

  useEffect(() => {
    stepIndexRef.current = stepIndex;
  }, [stepIndex]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeIndex]);

  const stopPlayback = useCallback(() => {
    runTokenRef.current += 1;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    runningRef.current = false;
    setRunning(false);
  }, []);

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

  const mission = MISSIONS[game.level];

  const syncGame = useCallback((next: GameSnapshot) => {
    gameRef.current = next;
    setGame(next);
  }, []);

  const startLevel = useCallback(
    (level: number) => {
      stopPlayback();
      const fresh = makeInitialGame(level);
      syncGame(fresh);
      setProgram([]);
      programRef.current = [];
      setStepIndex(0);
      stepIndexRef.current = 0;
      setActiveIndex(-1);
      setScreen('game');
      window.scrollTo(0, 0);
    },
    [stopPlayback, syncGame]
  );

  const resetRobot = useCallback(() => {
    stopPlayback();
    const fresh = makeInitialGame(gameRef.current.level);
    fresh.feedback = 'Robot returned to start. Your command sequence is preserved.';
    syncGame(fresh);
    setStepIndex(0);
    stepIndexRef.current = 0;
    setActiveIndex(-1);
  }, [stopPlayback, syncGame]);

  const executeDirection = useCallback(
    (dir: Direction) => {
      const prev = gameRef.current;
      if (prev.ended) return;

      const mConfig = MISSIONS[prev.level];
      const info = COMMAND_INFO[dir];
      const oldPos: Point = [prev.player[0], prev.player[1]];
      const target: Point = [oldPos[0] + info.dx, oldPos[1] + info.dy];
      const metrics: PlayMetrics = { ...prev.metrics };
      const visited = new Set(prev.visited);
      const route = prev.route.map((p) => [p[0], p[1]] as Point);
      let chips = prev.chips.map((p) => [p[0], p[1]] as Point);
      let player: Point = [oldPos[0], oldPos[1]];
      let lastMoveDir = prev.lastMoveDir;
      let feedback = prev.feedback;
      let bumpEvent: GameSnapshot['bumpEvent'] = null;
      let hitFlash = false;

      const minEnemyDistBefore = prev.enemies.reduce(
        (min, e) => Math.min(min, Math.abs(e.pos[0] - oldPos[0]) + Math.abs(e.pos[1] - oldPos[1])),
        Infinity
      );

      if (isWall(mConfig.map, target[0], target[1])) {
        metrics.blocked += 1;
        metrics.adapt += 1;
        bumpCounterRef.current += 1;
        bumpEvent = { id: bumpCounterRef.current, dir, target };
        feedback = `${info.label} blocked by a wall. Robot held position.`;
        sfx.blocked();
      } else {
        const oldDist = bfsPath(mConfig.map, oldPos, mConfig.exit).length;
        const newDist = bfsPath(mConfig.map, target, mConfig.exit).length;

        player = target;
        metrics.moves += 1;
        if (newDist > 0 && newDist < oldDist) metrics.efficient += 1;
        else if (newDist > oldDist) metrics.explore += 1;

        const targetKey = pointKey(target);
        if (visited.has(targetKey)) metrics.revisits += 1;
        else visited.add(targetKey);
        route.push([target[0], target[1]]);

        if (dir !== lastMoveDir) {
          metrics.turns += 1;
          metrics.routeChanges += 1;
        }
        lastMoveDir = dir;

        const exits = getNeighbors(mConfig.map, target).length;
        if (exits >= 3) metrics.branches += 1;
        if (exits <= 1) metrics.deadEnds += 1;

        const collectedIndex = chips.findIndex((c) => samePoint(c, target));
        if (collectedIndex !== -1) {
          chips = chips.filter((_, idx) => idx !== collectedIndex);
          metrics.collect += 1;
          feedback = 'Data crystal collected! Optional bonus earned.';
          sfx.crystal();
        } else {
          feedback = `Moved ${info.label.toLowerCase()}.`;
          sfx.step();
        }

        const minEnemyDistAfter = prev.enemies.reduce(
          (min, e) => Math.min(min, Math.abs(e.pos[0] - target[0]) + Math.abs(e.pos[1] - target[1])),
          Infinity
        );
        if (minEnemyDistAfter <= 2) metrics.nearEnemy += 1;
        if (minEnemyDistBefore <= 2 && minEnemyDistAfter > minEnemyDistBefore) {
          metrics.avoided += 1;
        }
        if (minEnemyDistAfter === 3 && newDist < oldDist) {
          metrics.safeDistance += 1;
        }

        setWalkingPulse(true);
        window.setTimeout(() => setWalkingPulse(false), 160);
      }

      const nextSteps = prev.steps + 1;

      // 1. Check immediate win upon stepping onto the portal
      if (samePoint(player, mConfig.exit)) {
        stopPlayback();
        sfx.win();
        const wonState: GameSnapshot = {
          ...prev,
          player,
          facing: dir,
          lastMoveDir,
          chips,
          steps: nextSteps,
          visited,
          route,
          metrics,
          ended: true,
          won: true,
          bumpEvent,
          hitFlash: false,
          feedback: 'Portal reached! Mission complete.',
        };
        syncGame(wonState);
        window.setTimeout(() => {
          setScreen('results');
          window.scrollTo(0, 0);
        }, 340);
        return;
      }

      // 2. Check immediate collision (in case player walked into an enemy tile before enemies move)
      const walkedIntoEnemy = prev.enemies.some((e) => samePoint(e.pos, player));
      if (walkedIntoEnemy) {
        const remainingLives = prev.lives - 1;
        metrics.risk += 1;
        metrics.enemyHits += 1;
        hitFlash = true;
        route.push([mConfig.start[0], mConfig.start[1]]);
        visited.add(pointKey(mConfig.start));

        if (remainingLives <= 0) {
          stopPlayback();
          sfx.gameOver();
          syncGame({
            ...prev,
            player: [mConfig.start[0], mConfig.start[1]],
            facing: dir,
            lastMoveDir,
            chips,
            lives: 0,
            steps: nextSteps,
            visited,
            route,
            metrics,
            ended: true,
            gameOver: true,
            bumpEvent,
            hitFlash: true,
            feedback: 'No lives remaining. Try adjusting your route.',
          });
          return;
        }

        sfx.hit();
        syncGame({
          ...prev,
          player: [mConfig.start[0], mConfig.start[1]],
          facing: dir,
          lastMoveDir,
          chips,
          lives: remainingLives,
          steps: nextSteps,
          visited,
          route,
          metrics,
          bumpEvent,
          hitFlash: true,
          feedback: 'Caught by an enemy! Returned to start with 1 life lost.',
        });
        return;
      }

      // 3. Move enemies every 3rd step
      const enemies: EnemyState[] = prev.enemies.map((e) => ({
        ...e,
        pos: [e.pos[0], e.pos[1]],
        prevPos: [e.pos[0], e.pos[1]],
      }));

      if (nextSteps % 3 === 0) {
        enemies.forEach((enemy, index) => {
          let candidate: Point | null = null;
          if (enemy.type === 'hunter') {
            const path = bfsPath(mConfig.map, enemy.pos, player);
            if (path.length > 1) candidate = path[1];
          } else if (enemy.patrol.length > 0) {
            for (let tries = 0; tries < enemy.patrol.length; tries++) {
              const nextPatrolIdx = (enemy.patrolIndex + 1) % enemy.patrol.length;
              enemy.patrolIndex = nextPatrolIdx;
              const targetWp = enemy.patrol[nextPatrolIdx];
              if (!isWall(mConfig.map, targetWp[0], targetWp[1])) {
                const path = bfsPath(mConfig.map, enemy.pos, targetWp);
                if (path.length > 1) {
                  candidate = path[1];
                  break;
                }
              }
            }
          }

          if (
            candidate &&
            !enemies.some((other, j) => j !== index && samePoint(other.pos, candidate!))
          ) {
            enemy.pos = candidate;
          }
        });
      }

      // 4. Check enemy catch or tile-swap collision
      const caughtAfterMove = enemies.some(
        (e) =>
          samePoint(e.pos, player) ||
          (samePoint(e.pos, oldPos) && samePoint(e.prevPos, player))
      );

      if (caughtAfterMove) {
        const remainingLives = prev.lives - 1;
        metrics.risk += 1;
        metrics.enemyHits += 1;
        hitFlash = true;
        route.push([mConfig.start[0], mConfig.start[1]]);
        visited.add(pointKey(mConfig.start));

        if (remainingLives <= 0) {
          stopPlayback();
          sfx.gameOver();
          syncGame({
            ...prev,
            player: [mConfig.start[0], mConfig.start[1]],
            facing: dir,
            lastMoveDir,
            enemies,
            chips,
            lives: 0,
            steps: nextSteps,
            visited,
            route,
            metrics,
            ended: true,
            gameOver: true,
            bumpEvent,
            hitFlash: true,
            feedback: 'No lives remaining. Try another route.',
          });
          return;
        }

        sfx.hit();
        syncGame({
          ...prev,
          player: [mConfig.start[0], mConfig.start[1]],
          facing: dir,
          lastMoveDir,
          enemies,
          chips,
          lives: remainingLives,
          steps: nextSteps,
          visited,
          route,
          metrics,
          bumpEvent,
          hitFlash: true,
          feedback: 'An enemy intercepted your robot! Returned to start.',
        });
        return;
      }

      syncGame({
        ...prev,
        player,
        facing: dir,
        lastMoveDir,
        enemies,
        chips,
        steps: nextSteps,
        visited,
        route,
        metrics,
        bumpEvent,
        hitFlash,
        feedback,
      });
    },
    [stopPlayback, syncGame]
  );

  const addCommand = useCallback(
    (dir: Direction) => {
      if (runningRef.current || gameRef.current.ended) return;
      if (programRef.current.length >= 60) {
        syncGame({
          ...gameRef.current,
          feedback: 'Maximum 60 commands reached. Try shortening your route.',
        });
        return;
      }
      const nextProg = [...programRef.current, dir];
      programRef.current = nextProg;
      setProgram(nextProg);
      setStepIndex(0);
      stepIndexRef.current = 0;
      setActiveIndex(-1);
      syncGame({
        ...gameRef.current,
        feedback: `Added ${COMMAND_INFO[dir].label} to program.`,
      });
    },
    [syncGame]
  );

  const handleDirectionInput = useCallback(
    (dir: Direction) => {
      if (controlMode === 'direct') {
        if (!runningRef.current) {
          executeDirection(dir);
        }
      } else {
        addCommand(dir);
      }
    },
    [addCommand, controlMode, executeDirection]
  );

  const handleTileClick = useCallback(
    (pos: Point) => {
      if (controlMode !== 'direct' || runningRef.current || gameRef.current.ended) return;
      const [px, py] = gameRef.current.player;
      const dx = pos[0] - px;
      const dy = pos[1] - py;
      if (dx === 0 && dy === -1) executeDirection('U');
      else if (dx === 0 && dy === 1) executeDirection('D');
      else if (dx === -1 && dy === 0) executeDirection('L');
      else if (dx === 1 && dy === 0) executeDirection('R');
    },
    [controlMode, executeDirection]
  );

  const reorderCommand = (index: number, delta: -1 | 1) => {
    if (running) return;
    const target = index + delta;
    if (target < 0 || target >= program.length) return;
    const next = [...program];
    [next[index], next[target]] = [next[target], next[index]];
    setProgram(next);
    setStepIndex(0);
    stepIndexRef.current = 0;
    setActiveIndex(-1);
    syncGame({
      ...gameRef.current,
      feedback: 'Command order updated. Execution pointer reset to start.',
    });
  };

  const removeCommand = (index: number) => {
    if (running) return;
    const next = program.filter((_, idx) => idx !== index);
    setProgram(next);
    setStepIndex(0);
    stepIndexRef.current = 0;
    setActiveIndex(-1);
  };

  const clearProgram = () => {
    if (running) return;
    setProgram([]);
    programRef.current = [];
    setStepIndex(0);
    stepIndexRef.current = 0;
    setActiveIndex(-1);
    syncGame({
      ...gameRef.current,
      feedback: 'Program cleared.',
    });
  };

  const runProgram = useCallback(() => {
    if (runningRef.current) {
      stopPlayback();
      syncGame({
        ...gameRef.current,
        feedback: `Paused at step ${stepIndexRef.current + 1}.`,
      });
      return;
    }

    if (gameRef.current.ended) return;

    if (programRef.current.length === 0) {
      syncGame({
        ...gameRef.current,
        feedback: 'Add at least one direction command first.',
      });
      return;
    }

    if (stepIndexRef.current >= programRef.current.length) {
      // Restart from step 0 on the current robot or let user know
      stepIndexRef.current = 0;
      setStepIndex(0);
    }

    runningRef.current = true;
    setRunning(true);
    const token = ++runTokenRef.current;

    const tick = () => {
      if (token !== runTokenRef.current || !runningRef.current || gameRef.current.ended) {
        return;
      }

      const idx = stepIndexRef.current;
      const cmds = programRef.current;
      if (idx >= cmds.length) {
        runningRef.current = false;
        setRunning(false);
        setActiveIndex(-1);
        if (!gameRef.current.ended) {
          syncGame({
            ...gameRef.current,
            feedback: 'Sequence finished. Add more commands or reset the robot to refine.',
          });
        }
        return;
      }

      setActiveIndex(idx);
      executeDirection(cmds[idx]);
      const nextIdx = idx + 1;
      stepIndexRef.current = nextIdx;
      setStepIndex(nextIdx);

      if (gameRef.current.ended || token !== runTokenRef.current) {
        return;
      }

      timerRef.current = window.setTimeout(tick, SPEED_MS[speedRef.current]);
    };

    tick();
  }, [executeDirection, stopPlayback, syncGame]);

  const stepOnce = useCallback(() => {
    if (runningRef.current || gameRef.current.ended) return;
    if (programRef.current.length === 0) {
      syncGame({
        ...gameRef.current,
        feedback: 'Add a direction command first.',
      });
      return;
    }
    if (stepIndexRef.current >= programRef.current.length) {
      syncGame({
        ...gameRef.current,
        feedback: 'Program finished. Press Reset Robot or add more commands.',
      });
      return;
    }

    const idx = stepIndexRef.current;
    setActiveIndex(idx);
    executeDirection(programRef.current[idx]);
    const nextIdx = idx + 1;
    stepIndexRef.current = nextIdx;
    setStepIndex(nextIdx);
  }, [executeDirection, syncGame]);

  // Keyboard support (Arrow keys / WASD + Space for Run/Pause in Program Mode)
  useEffect(() => {
    if (screen !== 'game') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      if (key === 'arrowup' || key === 'w') {
        e.preventDefault();
        handleDirectionInput('U');
      } else if (key === 'arrowdown' || key === 's') {
        e.preventDefault();
        handleDirectionInput('D');
      } else if (key === 'arrowleft' || key === 'a') {
        e.preventDefault();
        handleDirectionInput('L');
      } else if (key === 'arrowright' || key === 'd') {
        e.preventDefault();
        handleDirectionInput('R');
      } else if (key === ' ' && controlMode === 'program') {
        e.preventDefault();
        runProgram();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [controlMode, handleDirectionInput, runProgram, screen]);

  const toggleMute = () => {
    const next = !muted;
    sfx.muted = next;
    setMuted(next);
  };

  // Planned route preview from current robot position & remaining program
  const plannedPreview = useMemo(() => {
    if (controlMode !== 'program' || program.length === 0) return null;
    const startIdx = stepIndex < program.length ? stepIndex : 0;
    return simulatePlannedPath(mission.map, game.player, mission.exit, program, startIdx);
  }, [controlMode, game.player, mission.exit, mission.map, program, stepIndex]);

  // Portal proximity progress %
  const portalProgress = useMemo(() => {
    const totalPath = Math.max(1, bfsPath(mission.map, mission.start, mission.exit).length - 1);
    const currentPath = bfsPath(mission.map, game.player, mission.exit);
    const remaining = currentPath.length > 0 ? currentPath.length - 1 : totalPath;
    return Math.min(100, Math.max(0, Math.round(((totalPath - remaining) / totalPath) * 100)));
  }, [game.player, mission.exit, mission.map, mission.start]);

  const totalChips = mission.chips.length;
  const collectedChips = totalChips - game.chips.length;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none bg-grid-overlay" aria-hidden="true" />

      <div className="relative z-10">
        {/* HOME SCREEN */}
        {screen === 'home' && (
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 min-h-screen flex items-center">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch">
              <div className="lg:col-span-7 rounded-2xl border border-[#7068d2]/55 bg-[#12183c]/92 p-7 sm:p-11 flex flex-col justify-center shadow-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#55efff]">
                  Digital World · Nova-01
                </p>
                <h1 className="font-display text-4xl sm:text-6xl font-extrabold leading-[1.06] tracking-tight mt-4 mb-3 text-balance">
                  <span className="bg-gradient-to-r from-[#54f5ff] via-[#a18aff] to-[#ff65dc] bg-clip-text text-transparent">
                    Discover
                  </span>
                  <br />
                  Your Digital
                  <br />
                  <span className="bg-gradient-to-r from-[#54f5ff] via-[#a18aff] to-[#ff65dc] bg-clip-text text-transparent">
                    DNA
                  </span>
                </h1>
                <p className="text-lg sm:text-xl font-medium text-white mb-3">
                  Play · Solve · Discover
                </p>
                <p className="text-base sm:text-lg text-[#b4c0e8] max-w-xl leading-relaxed">
                  Guide your robot through cybernetic mazes, dodge patrolling threats, and reach the
                  portal. Your navigation style reveals your Digital DNA across nine tech fields.
                </p>

                <div className="flex flex-wrap gap-3 mt-7">
                  <button
                    type="button"
                    onClick={() => setScreen('difficulty')}
                    className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-[#277dff] to-[#9948ef] border border-[#a4a5ff]/70 shadow-[0_0_22px_rgba(133,91,255,0.45)] hover:brightness-110 transition cursor-pointer whitespace-nowrap"
                  >
                    New Game
                  </button>
                  <button
                    type="button"
                    onClick={() => setScreen('how')}
                    className="px-6 py-3 rounded-xl font-semibold text-[#eef2ff] bg-[#1b2452] border border-[#5d6cc5] hover:border-[#55efff] transition cursor-pointer whitespace-nowrap"
                  >
                    How It Works
                  </button>
                </div>

                <p className="text-xs text-[#8f9fcc] mt-6">
                  3 Difficulty Paths · Visual Route Preview · Instant IT Archetype Profile
                </p>
              </div>

              <div className="lg:col-span-5 relative min-h-[340px] lg:min-h-[540px] rounded-2xl border border-[#7068d2]/55 bg-gradient-to-b from-[#17144a] via-[#0b1231] to-[#101a3e] overflow-hidden flex items-center justify-center shadow-2xl">
                <div
                  className="absolute w-40 h-40 left-[10%] top-[8%] rounded-full shadow-[0_0_50px_#ad8cff]"
                  style={{
                    background:
                      'radial-gradient(circle at 35% 30%, #ffffff, #b8a9ff 30%, #6554bd 70%)',
                  }}
                />
                <div className="absolute w-[70%] h-[22%] border-2 border-[#b47bff]/70 rounded-full -rotate-[20deg] shadow-[0_0_20px_rgba(180,123,255,0.45)]" />
                <div className="relative z-10 animate-float-slow translate-y-4">
                  <HeroMascotSvg />
                </div>
                <div className="absolute bottom-0 inset-x-0 h-[40%] flex items-end gap-2 px-[8%] bg-gradient-to-t from-[#151d53] to-transparent">
                  {[65, 90, 52, 78, 44, 68].map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${h}%` }}
                      className="flex-1 bg-gradient-to-b from-[#34418c] to-[#101738] border border-[#536de0]/70 shadow-[0_0_15px_rgba(59,141,255,0.3)] relative"
                    >
                      <div
                        className="absolute inset-2 opacity-40"
                        style={{
                          background:
                            'repeating-linear-gradient(0deg, #4df4ff 0 3px, transparent 3px 16px)',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        )}

        {/* DIFFICULTY SCREEN */}
        {screen === 'difficulty' && (
          <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 min-h-screen flex items-center">
            <div className="w-full rounded-2xl border border-[#7068d2]/55 bg-[#12183c]/95 p-6 sm:p-9 shadow-2xl space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#55efff]">
                  Select Your Challenge
                </p>
                <h1 className="font-display text-3xl sm:text-5xl font-extrabold mt-2 text-balance">
                  Choose Your{' '}
                  <span className="bg-gradient-to-r from-[#54f5ff] via-[#a18aff] to-[#ff65dc] bg-clip-text text-transparent">
                    Path
                  </span>
                </h1>
                <p className="text-[#b4c0e8] mt-2">
                  Start at any difficulty. Each mission builds a full Digital DNA profile based on
                  how you navigate.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {MISSIONS.map((m, idx) => {
                  const selected = selectedLevel === idx;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedLevel(idx)}
                      className={[
                        'text-left rounded-2xl p-5 border transition cursor-pointer flex flex-col justify-between space-y-4',
                        selected
                          ? 'bg-[#1b2659] border-[#55efff] shadow-[0_0_22px_rgba(85,239,255,0.3)] -translate-y-0.5'
                          : 'bg-[#151d45] border-[#5967b5]/60 hover:border-[#8c9bf0]',
                      ].join(' ')}
                    >
                      <div className="space-y-2.5">
                        <div className="text-3xl">{m.icon}</div>
                        <h2 className="font-display text-lg font-bold text-[#55efff]">
                          {m.difficulty} · {m.name}
                        </h2>
                        <p className="text-sm text-[#b4c0e8] leading-relaxed">{m.cardSummary}</p>
                      </div>
                      <p className="text-xs font-mono-num font-semibold text-[#e6ecff] pt-2 border-t border-[#5967b5]/30">
                        {m.enemies.length} {m.enemies.length === 1 ? 'enemy' : 'enemies'} ·{' '}
                        {m.chips.length} optional crystals
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => startLevel(selectedLevel)}
                  className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-[#277dff] to-[#9948ef] border border-[#a4a5ff]/70 shadow-[0_0_20px_rgba(133,91,255,0.45)] hover:brightness-110 transition cursor-pointer whitespace-nowrap"
                >
                  Start Selected Level
                </button>
                <button
                  type="button"
                  onClick={() => setScreen('home')}
                  className="px-5 py-3 rounded-xl font-semibold text-[#dce4ff] bg-[#1a224d] border border-[#5d6cc5] hover:border-[#55efff] transition cursor-pointer whitespace-nowrap"
                >
                  Back
                </button>
              </div>
            </div>
          </main>
        )}

        {/* HOW IT WORKS SCREEN */}
        {screen === 'how' && (
          <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 min-h-screen flex items-center">
            <div className="w-full rounded-2xl border border-[#7068d2]/55 bg-[#12183c]/95 p-6 sm:p-9 shadow-2xl space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#55efff]">
                  Player Guide
                </p>
                <h1 className="font-display text-3xl sm:text-4xl font-extrabold mt-2">
                  How It{' '}
                  <span className="bg-gradient-to-r from-[#54f5ff] via-[#a18aff] to-[#ff65dc] bg-clip-text text-transparent">
                    Works
                  </span>
                </h1>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-[#5d6cc5]/45 bg-[#171f4a]/75 p-5 space-y-1.5">
                  <h2 className="font-display font-bold text-[#55efff]">01. Choose Your Walk Mode</h2>
                  <p className="text-sm text-[#b4c0e8] leading-relaxed">
                    Use <strong>Program Mode</strong> to queue moves and preview your route on the
                    board, or switch to <strong>Direct Walk</strong> to glide step-by-step using
                    buttons, adjacent tiles, or Arrow/WASD keys.
                  </p>
                </div>
                <div className="rounded-xl border border-[#5d6cc5]/45 bg-[#171f4a]/75 p-5 space-y-1.5">
                  <h2 className="font-display font-bold text-[#55efff]">02. Direct Tile Movement</h2>
                  <p className="text-sm text-[#b4c0e8] leading-relaxed">
                    Every command moves the robot smoothly one tile in that exact direction (Up,
                    Down, Left, or Right). No turning or facing calculations required.
                  </p>
                </div>
                <div className="rounded-xl border border-[#5d6cc5]/45 bg-[#171f4a]/75 p-5 space-y-1.5">
                  <h2 className="font-display font-bold text-[#55efff]">03. Test, Pause & Adjust</h2>
                  <p className="text-sm text-[#b4c0e8] leading-relaxed">
                    Use <strong>Step</strong> to advance one command, <strong>Run</strong> to watch
                    the robot walk smoothly (with 1x / 2x / 3x speed), and <strong>Pause</strong>{' '}
                    anytime to tweak your plan.
                  </p>
                </div>
                <div className="rounded-xl border border-[#5d6cc5]/45 bg-[#171f4a]/75 p-5 space-y-1.5">
                  <h2 className="font-display font-bold text-[#55efff]">04. Reach the Portal</h2>
                  <p className="text-sm text-[#b4c0e8] leading-relaxed">
                    Reach the spinning purple portal to finish the mission and reveal your Digital
                    DNA. Blue crystals are optional bonuses along the way; avoid enemies.
                  </p>
                </div>
              </div>

              <p className="text-sm text-[#9eb0dc]">
                No coding experience needed. Experiment freely and discover how you solve problems.
              </p>

              <button
                type="button"
                onClick={() => setScreen('home')}
                className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-[#277dff] to-[#9948ef] border border-[#a4a5ff]/70 shadow-[0_0_20px_rgba(133,91,255,0.45)] hover:brightness-110 transition cursor-pointer whitespace-nowrap"
              >
                Back to Menu
              </button>
            </div>
          </main>
        )}

        {/* GAME SCREEN */}
        {screen === 'game' && (
          <div className="max-w-[1380px] mx-auto px-3 sm:px-6 py-4 space-y-4">
            {/* Top Bar (3-zone clean header) */}
            <header className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#5967b5]/35">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-display font-bold text-base sm:text-lg text-[#55efff] whitespace-nowrap shrink-0">
                  Digital DNA
                </span>
                <span className="text-xs sm:text-sm text-[#9eb0dc] truncate">
                  {mission.difficulty} · {mission.name}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm font-mono-num font-semibold text-[#e6ecff]">
                <span aria-label={`Lives remaining: ${game.lives}`}>
                  {'♥ '.repeat(game.lives)}
                  <span className="text-[#5967b5]">{'♡ '.repeat(3 - game.lives)}</span>
                </span>
                <span title="Optional data crystals collected">
                  💎 {collectedChips}/{totalChips}
                </span>
                <span>Steps: {game.steps}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
                  className="p-2.5 rounded-lg bg-[#161e47] border border-[#4c5cb0] text-[#dce4ff] hover:border-[#55efff] transition cursor-pointer"
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopPlayback();
                    setScreen('home');
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#161e47] border border-[#4c5cb0] text-[#dce4ff] hover:border-[#55efff] transition cursor-pointer whitespace-nowrap"
                >
                  Menu
                </button>
              </div>
            </header>

            {/* Main Play Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left: Maze Panel */}
              <section className="lg:col-span-7 rounded-2xl border border-[#7068d2]/55 bg-[#12183c]/92 p-4 sm:p-5 shadow-2xl space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                      {mission.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#9eb0dc] mt-0.5">{mission.desc}</p>
                  </div>

                  <div className="min-w-[130px]">
                    <div className="flex items-center justify-between text-xs text-[#9eb0dc] mb-1">
                      <span>Portal Goal</span>
                      <span className="font-mono-num font-bold text-[#55efff]">
                        {portalProgress}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#242c5c] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#55efff] to-[#ff61d5] transition-all duration-200"
                        style={{ width: `${portalProgress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <MazeBoard
                  map={mission.map}
                  player={game.player}
                  facing={game.facing}
                  enemies={game.enemies}
                  chips={game.chips}
                  exit={mission.exit}
                  visited={game.visited}
                  plannedPreview={plannedPreview}
                  showPreview={showPreview && controlMode === 'program'}
                  bumpEvent={game.bumpEvent}
                  hitFlash={game.hitFlash}
                  moveDurationMs={SPEED_MS[speed] * 0.72}
                  walking={walkingPulse}
                  directWalkMode={controlMode === 'direct'}
                  onTileClick={handleTileClick}
                />

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#9eb0dc]">
                  <span>🟦 Wall · 💎 Optional Crystal · 🌀 Portal · 👾 Hunter · 🛰️ Patrol</span>
                  {controlMode === 'program' && (
                    <button
                      type="button"
                      onClick={() => setShowPreview((v) => !v)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#55efff] hover:underline cursor-pointer"
                    >
                      {showPreview ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {showPreview ? 'Route Preview On' : 'Route Preview Off'}
                    </button>
                  )}
                </div>

                <div
                  className="min-h-[28px] text-sm sm:text-base font-semibold text-[#ffd66e]"
                  role="status"
                  aria-live="polite"
                >
                  {game.feedback}
                </div>
              </section>

              {/* Right: Controls & Program Sequence */}
              <aside className="lg:col-span-5 space-y-4">
                {/* Movement Mode & Command Deck */}
                <section className="rounded-2xl border border-[#7068d2]/55 bg-[#12183c]/92 p-4 sm:p-5 shadow-2xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#55efff]">
                      Movement Deck
                    </h3>

                    <div
                      className="inline-flex rounded-lg bg-[#090e29] p-1 border border-[#45569c]/60"
                      role="group"
                      aria-label="Movement mode"
                    >
                      <button
                        type="button"
                        onClick={() => setControlMode('program')}
                        className={[
                          'px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap',
                          controlMode === 'program'
                            ? 'bg-[#277dff] text-white shadow'
                            : 'text-[#9eb0dc] hover:text-white',
                        ].join(' ')}
                      >
                        Program Queue
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          stopPlayback();
                          setControlMode('direct');
                        }}
                        className={[
                          'px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap',
                          controlMode === 'direct'
                            ? 'bg-[#277dff] text-white shadow'
                            : 'text-[#9eb0dc] hover:text-white',
                        ].join(' ')}
                      >
                        Direct Walk
                      </button>
                    </div>
                  </div>

                  {/* D-Pad Grid */}
                  <div className="grid grid-cols-3 gap-2.5 max-w-[340px] mx-auto">
                    <div />
                    <button
                      type="button"
                      onClick={() => handleDirectionInput('U')}
                      disabled={running || game.ended}
                      className="min-h-[64px] rounded-xl border border-[#38c9ef]/70 bg-gradient-to-b from-[#232e68] to-[#141a42] hover:border-[#55efff] hover:shadow-[0_0_16px_rgba(85,239,255,0.35)] active:scale-95 disabled:opacity-45 transition flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                    >
                      <ArrowUp className="w-5 h-5 text-[#55efff]" />
                      <span className="text-xs font-bold tracking-wide">UP</span>
                    </button>
                    <div />

                    <button
                      type="button"
                      onClick={() => handleDirectionInput('L')}
                      disabled={running || game.ended}
                      className="min-h-[64px] rounded-xl border border-[#38c9ef]/70 bg-gradient-to-b from-[#232e68] to-[#141a42] hover:border-[#55efff] hover:shadow-[0_0_16px_rgba(85,239,255,0.35)] active:scale-95 disabled:opacity-45 transition flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-5 h-5 text-[#55efff]" />
                      <span className="text-xs font-bold tracking-wide">LEFT</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDirectionInput('D')}
                      disabled={running || game.ended}
                      className="min-h-[64px] rounded-xl border border-[#38c9ef]/70 bg-gradient-to-b from-[#232e68] to-[#141a42] hover:border-[#55efff] hover:shadow-[0_0_16px_rgba(85,239,255,0.35)] active:scale-95 disabled:opacity-45 transition flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                    >
                      <ArrowDown className="w-5 h-5 text-[#55efff]" />
                      <span className="text-xs font-bold tracking-wide">DOWN</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDirectionInput('R')}
                      disabled={running || game.ended}
                      className="min-h-[64px] rounded-xl border border-[#38c9ef]/70 bg-gradient-to-b from-[#232e68] to-[#141a42] hover:border-[#55efff] hover:shadow-[0_0_16px_rgba(85,239,255,0.35)] active:scale-95 disabled:opacity-45 transition flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                    >
                      <ArrowRight className="w-5 h-5 text-[#55efff]" />
                      <span className="text-xs font-bold tracking-wide">RIGHT</span>
                    </button>
                  </div>

                  <p className="text-xs text-[#9eb0dc] text-center">
                    {controlMode === 'direct'
                      ? 'Direct Walk: Click a direction, tap an adjacent tile, or use Arrow / WASD keys.'
                      : 'Program Queue: Click directions or press Arrow / WASD keys to queue steps. Spacebar runs.'}
                  </p>
                </section>

                {/* Program List & Playback Controls */}
                <section className="rounded-2xl border border-[#7068d2]/55 bg-[#12183c]/92 p-4 sm:p-5 shadow-2xl space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#55efff]">
                      Your Program
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="inline-flex rounded-md bg-[#090e29] p-0.5 border border-[#45569c]/50 text-[11px] font-mono-num">
                        {([1, 2, 3] as SpeedFactor[]).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSpeed(s)}
                            className={[
                              'px-2 py-0.5 rounded transition cursor-pointer',
                              speed === s
                                ? 'bg-[#354594] text-[#55efff] font-bold'
                                : 'text-[#8e9ecc] hover:text-white',
                            ].join(' ')}
                          >
                            {s}x
                          </button>
                        ))}
                      </div>
                      <span className="text-xs font-mono-num text-[#9eb0dc]">
                        {program.length}/60
                      </span>
                    </div>
                  </div>

                  {plannedPreview && plannedPreview.blockedAtStep !== null && showPreview && (
                    <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-500/40 rounded-lg px-3 py-2">
                      Heads up: Step #{plannedPreview.blockedAtStep + 1} hits a wall (highlighted in
                      amber).
                    </div>
                  )}

                  <div className="min-h-[150px] max-h-[220px] overflow-y-auto rounded-xl border border-dashed border-[#5c6db5]/70 bg-[#080e29] p-2.5 space-y-1.5">
                    {program.length === 0 ? (
                      <div className="text-center text-sm text-[#8492bd] py-10 px-3">
                        Your commands appear here.
                        <br />
                        Choose <strong className="text-[#d7e2ff]">UP, DOWN, LEFT, or RIGHT</strong>{' '}
                        to build your route.
                      </div>
                    ) : (
                      program.map((cmd, idx) => {
                        const isActive = idx === activeIndex;
                        const isDone = idx < stepIndex && stepIndex > 0;
                        return (
                          <div
                            key={`${idx}-${cmd}`}
                            ref={isActive ? activeItemRef : null}
                            className={[
                              'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-sm font-medium transition',
                              isActive
                                ? 'bg-[#3a3150] border-[#ffd66e] shadow-[0_0_12px_rgba(255,214,110,0.35)] text-white'
                                : isDone
                                ? 'bg-[#131d40] border-[#324380]/60 text-[#7d8ebe]'
                                : 'bg-[#1b2551] border-[#485da5] text-[#eef2ff]',
                            ].join(' ')}
                          >
                            <span className="font-mono-num text-xs font-bold text-[#55efff] w-6">
                              {idx + 1}.
                            </span>
                            <span className="flex-1">
                              {COMMAND_INFO[cmd].symbol} {COMMAND_INFO[cmd].label}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={running || idx === 0}
                                onClick={() => reorderCommand(idx, -1)}
                                aria-label="Move command earlier"
                                className="px-2 py-0.5 rounded bg-[#253168] hover:bg-[#33448f] disabled:opacity-35 text-xs cursor-pointer"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                disabled={running || idx === program.length - 1}
                                onClick={() => reorderCommand(idx, 1)}
                                aria-label="Move command later"
                                className="px-2 py-0.5 rounded bg-[#253168] hover:bg-[#33448f] disabled:opacity-35 text-xs cursor-pointer"
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                disabled={running}
                                onClick={() => removeCommand(idx)}
                                aria-label="Remove command"
                                className="px-2 py-0.5 rounded bg-[#3b2147] hover:bg-[#5c2b5d] text-rose-200 disabled:opacity-35 text-xs cursor-pointer"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Playback Action Row */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={runProgram}
                      disabled={game.ended || (controlMode === 'direct' && !running)}
                      className="min-h-[44px] px-4 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-[#277dff] to-[#9948ef] border border-[#a4a5ff]/70 shadow-[0_0_18px_rgba(133,91,255,0.4)] hover:brightness-110 disabled:opacity-40 transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                    >
                      {running ? (
                        <>
                          <Pause className="w-4 h-4" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" /> Run Program
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={stepOnce}
                      disabled={running || game.ended || controlMode === 'direct'}
                      className="min-h-[44px] px-4 py-2 rounded-xl font-semibold text-[#eef2ff] bg-[#1b2452] border border-[#5d6cc5] hover:border-[#55efff] disabled:opacity-40 transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                    >
                      <StepForward className="w-4 h-4" /> Step
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={resetRobot}
                      className="min-h-[42px] px-4 py-2 rounded-xl text-sm font-semibold text-[#dce4ff] bg-[#161e47] border border-[#4c5cb0] hover:border-[#55efff] transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                    >
                      <RotateCcw className="w-4 h-4" /> Reset Robot
                    </button>

                    <button
                      type="button"
                      onClick={clearProgram}
                      disabled={running || program.length === 0}
                      className="min-h-[42px] px-4 py-2 rounded-xl text-sm font-semibold text-[#dce4ff] bg-[#161e47] border border-[#4c5cb0] hover:border-rose-400 disabled:opacity-40 transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                    >
                      <Trash2 className="w-4 h-4" /> Clear All
                    </button>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        )}

        {/* RESULTS SCREEN */}
        {screen === 'results' && (
          <ResultsScreen
            mission={mission}
            metrics={game.metrics}
            visited={game.visited}
            route={game.route}
            livesRemaining={game.lives}
            onPlayAgain={() => setScreen('difficulty')}
            onMainMenu={() => setScreen('home')}
          />
        )}
      </div>

      {/* GAME OVER MODAL */}
      {game.gameOver && screen === 'game' && (
        <div
          className="fixed inset-0 z-30 bg-[#050719]/90 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="game-over-title"
        >
          <div className="max-w-md w-full rounded-2xl border border-[#9b76ff] bg-gradient-to-br from-[#1d2453] to-[#0d1230] p-7 text-center shadow-[0_0_45px_rgba(125,91,255,0.45)] space-y-4">
            <div className="text-6xl" aria-hidden="true">
              🤖
            </div>
            <h2 id="game-over-title" className="font-display text-2xl font-bold text-[#ff61d5]">
              Game Over
            </h2>
            <p className="text-sm text-[#b4c0e8] leading-relaxed">
              The patrolling threats intercepted your robot. Reset to try a safer route or inspect
              your sequence step-by-step.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={resetRobot}
                className="px-5 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-[#277dff] to-[#9948ef] border border-[#a4a5ff]/70 shadow-[0_0_18px_rgba(133,91,255,0.4)] hover:brightness-110 transition cursor-pointer whitespace-nowrap"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={() => {
                  resetRobot();
                  syncGame({
                    ...gameRef.current,
                    feedback: 'Use Step or Route Preview to check your sequence one move at a time.',
                  });
                }}
                className="px-5 py-2.5 rounded-xl font-semibold text-[#eef2ff] bg-[#1b2452] border border-[#5d6cc5] hover:border-[#55efff] transition cursor-pointer whitespace-nowrap"
              >
                Check Logic
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
