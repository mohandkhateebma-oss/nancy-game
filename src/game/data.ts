export type Direction = 'U' | 'D' | 'L' | 'R';
export type Point = [number, number];

export interface MissionConfig {
  id: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  name: string;
  title: string;
  desc: string;
  cardSummary: string;
  icon: string;
  map: string[];
  start: Point;
  chips: Point[];
  exit: Point;
  enemies: Array<{
    pos: Point;
    type: 'hunter' | 'guardian';
    patrol?: Point[];
  }>;
}

export interface EnemyState {
  id: number;
  pos: Point;
  prevPos: Point;
  type: 'hunter' | 'guardian';
  patrol: Point[];
  patrolIndex: number;
}

export interface PlayMetrics {
  moves: number;
  blocked: number;
  collect: number;
  risk: number;
  nearEnemy: number; // within Manhattan distance <= 2
  safeDistance: number; // kept safe margin around enemies while progressing
  enemyHits: number;
  avoided: number;
  branches: number;
  turns: number;
  revisits: number;
  routeChanges: number;
  deadEnds: number;
  efficient: number;
  explore: number;
  adapt: number;
}

export const COMMAND_INFO: Record<
  Direction,
  { symbol: string; label: string; shortLabel: string; hint: string; dx: number; dy: number }
> = {
  U: { symbol: '↑', label: 'Move Up', shortLabel: 'UP', hint: 'One tile up', dx: 0, dy: -1 },
  D: { symbol: '↓', label: 'Move Down', shortLabel: 'DOWN', hint: 'One tile down', dx: 0, dy: 1 },
  L: { symbol: '←', label: 'Move Left', shortLabel: 'LEFT', hint: 'One tile left', dx: -1, dy: 0 },
  R: { symbol: '→', label: 'Move Right', shortLabel: 'RIGHT', hint: 'One tile right', dx: 1, dy: 0 },
};

export const MISSIONS: MissionConfig[] = [
  {
    id: 0,
    difficulty: 'Easy',
    name: 'Data Garden',
    title: 'Recover the scattered data',
    desc: 'Reach the portal to complete the mission. Data crystals are optional bonuses along the way.',
    cardSummary: 'Open passages, one tracking enemy, and gentle routes to learn the controls.',
    icon: '🌱',
    map: [
      '###########',
      '#P..#.....#',
      '#.#.#.###.#',
      '#.#...#...#',
      '#...#...#.#',
      '###.#...#.#',
      '#...#...#.#',
      '#.#...#...#',
      '#.#.###.#.#',
      '#........X#',
      '###########',
    ],
    start: [1, 1],
    chips: [
      [9, 1],
      [6, 5],
      [1, 9],
    ],
    exit: [9, 9],
    enemies: [{ pos: [7, 3], type: 'hunter' }],
  },
  {
    id: 1,
    difficulty: 'Medium',
    name: 'Firewall',
    title: 'Navigate the firewall corridors',
    desc: 'Branching paths offer safer detours or faster shortcuts past two threats. Reach the portal.',
    cardSummary: 'More branching corridors, two threats (one hunter, one patrol), and tactical choices.',
    icon: '🛡️',
    map: [
      '###########',
      '#P....#...#',
      '#.#.#...#.#',
      '#.#...#...#',
      '#...###.#.#',
      '###...#...#',
      '#...#...#.#',
      '#.#...#...#',
      '#.#.###.#.#',
      '#........X#',
      '###########',
    ],
    start: [1, 1],
    chips: [
      [9, 1],
      [9, 5],
      [3, 8],
    ],
    exit: [9, 9],
    enemies: [
      { pos: [3, 7], type: 'hunter' },
      {
        pos: [7, 3],
        type: 'guardian',
        patrol: [
          [7, 3],
          [8, 3],
          [9, 3],
          [8, 3],
          [7, 3],
          [7, 2],
          [6, 2],
          [7, 2],
        ],
      },
    ],
  },
  {
    id: 2,
    difficulty: 'Hard',
    name: 'Core System',
    title: 'Restore the central system',
    desc: 'A dense network of alternate routes with three active threats. Plan, observe, and adapt.',
    cardSummary: 'Complex multi-branch network, three enemies, and four optional data crystals.',
    icon: '⚡',
    map: [
      '#############',
      '#P....#.....#',
      '#.#.#...###.#',
      '#.#...#.....#',
      '#...#...#.#.#',
      '###.#...#...#',
      '#...#...###.#',
      '#.#...#.....#',
      '#.#.###.#.#.#',
      '#.....#....X#',
      '#############',
    ],
    start: [1, 1],
    chips: [
      [9, 1],
      [6, 5],
      [1, 9],
      [9, 9],
    ],
    exit: [11, 9],
    enemies: [
      { pos: [3, 9], type: 'hunter' },
      {
        pos: [7, 3],
        type: 'guardian',
        patrol: [
          [7, 3],
          [9, 3],
          [11, 3],
          [9, 3],
        ],
      },
      {
        pos: [7, 8],
        type: 'guardian',
        patrol: [
          [7, 8],
          [7, 7],
          [9, 7],
          [9, 8],
          [9, 9],
          [7, 9],
        ],
      },
    ],
  },
];

export const SPEC_NAMES = [
  'Cybersecurity',
  'Software Engineering',
  'Data Science',
  'AI & Machine Learning',
  'Networking',
  'UI/UX Design',
  'Cloud & DevOps',
  'IT Support',
  'Game Development',
];

export const ARCHETYPES = [
  'The Digital Guardian',
  'The Master Builder',
  'The Data Detective',
  'The Pattern Oracle',
  'The Network Navigator',
  'The Experience Curator',
  'The Cloud Conductor',
  'The System Rescuer',
  'The Play Architect',
];

export const ARCHETYPE_COLORS = [
  '#55efff',
  '#a66bff',
  '#ff61d5',
  '#ffd66e',
  '#67e6a5',
  '#438bff',
  '#ff8c55',
  '#a6b5ff',
  '#e879c8',
];

export const ARCHETYPE_DESCRIPTIONS = [
  'You pay close attention to threats, maintain safe margins around risks, and think defensively before acting.',
  'You build a structured plan, organize clean command sequences, and favor clear, efficient paths to your goal.',
  'You gather optional data along the way, inspect branches, and learn from everything the maze reveals.',
  'You anticipate how enemies shift, adapt your route dynamically, and adjust decisions based on changing conditions.',
  'You explore how corridors connect and naturally map out the broader topology of the system.',
  'You value clarity, smooth progression, and balanced routes that avoid unnecessary friction.',
  'You focus on steady reliability, fault recovery, and keeping the system moving toward completion.',
  'You test hypotheses, troubleshoot blocked paths, and recover quickly when unexpected obstacles appear.',
  'You experiment freely with alternate routes and enjoy discovering creative ways through challenges.',
];

export const SKILL_ROADMAP = [
  'Threat awareness · Secure thinking · Digital forensics',
  'Algorithms · TypeScript · Software architecture',
  'Data cleaning · Statistics · Data visualization',
  'Python · Pattern recognition · Machine learning basics',
  'Networking fundamentals · Routing · Protocols',
  'Wireframing · Accessibility · User testing',
  'Automation · Linux · Deployment pipelines',
  'Troubleshooting · Operating systems · Scripting',
  'Game logic · Level design · Interactive programming',
];

export function samePoint(a: Point, b: Point): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

export function pointKey(p: Point): string {
  return `${p[0]},${p[1]}`;
}

export function isWall(map: string[], x: number, y: number): boolean {
  return !map[y] || map[y][x] === undefined || map[y][x] === '#';
}

export function getNeighbors(map: string[], pos: Point): Point[] {
  const dirs: Point[] = [
    [pos[0], pos[1] - 1],
    [pos[0], pos[1] + 1],
    [pos[0] - 1, pos[1]],
    [pos[0] + 1, pos[1]],
  ];
  return dirs.filter(([nx, ny]) => !isWall(map, nx, ny));
}

export function bfsPath(map: string[], start: Point, target: Point): Point[] {
  if (samePoint(start, target)) return [start.slice() as Point];
  const queue: Point[] = [start.slice() as Point];
  const cameFrom = new Map<string, string | null>([[pointKey(start), null]]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (samePoint(current, target)) {
      const path: Point[] = [];
      let cursor: string | null = pointKey(current);
      while (cursor) {
        const [cx, cy] = cursor.split(',').map(Number);
        path.unshift([cx, cy]);
        cursor = cameFrom.get(cursor) ?? null;
      }
      return path;
    }

    for (const next of getNeighbors(map, current)) {
      const k = pointKey(next);
      if (!cameFrom.has(k)) {
        cameFrom.set(k, pointKey(current));
        queue.push(next);
      }
    }
  }
  return [];
}

export interface PlannedPreview {
  points: Point[];
  blockedAtStep: number | null;
  blockedTarget: Point | null;
  reachesExit: boolean;
}

export function simulatePlannedPath(
  map: string[],
  start: Point,
  exit: Point,
  program: Direction[],
  startIndex = 0
): PlannedPreview {
  let cursor: Point = [start[0], start[1]];
  const points: Point[] = [];
  let blockedAtStep: number | null = null;
  let blockedTarget: Point | null = null;
  let reachesExit = samePoint(cursor, exit);

  for (let i = startIndex; i < program.length; i++) {
    const cmd = program[i];
    const info = COMMAND_INFO[cmd];
    const nx = cursor[0] + info.dx;
    const ny = cursor[1] + info.dy;

    if (isWall(map, nx, ny)) {
      if (blockedAtStep === null) {
        blockedAtStep = i;
        blockedTarget = [nx, ny];
      }
      continue;
    }

    cursor = [nx, ny];
    points.push([nx, ny]);
    if (samePoint(cursor, exit)) {
      reachesExit = true;
      break;
    }
  }

  return { points, blockedAtStep, blockedTarget, reachesExit };
}

export function createInitialMetrics(): PlayMetrics {
  return {
    moves: 0,
    blocked: 0,
    collect: 0,
    risk: 0,
    nearEnemy: 0,
    safeDistance: 0,
    enemyHits: 0,
    avoided: 0,
    branches: 0,
    turns: 0,
    revisits: 0,
    routeChanges: 0,
    deadEnds: 0,
    efficient: 0,
    explore: 0,
    adapt: 0,
  };
}

export function createEnemies(mission: MissionConfig): EnemyState[] {
  return mission.enemies.map((e, idx) => ({
    id: idx,
    pos: [e.pos[0], e.pos[1]],
    prevPos: [e.pos[0], e.pos[1]],
    type: e.type,
    patrol: e.patrol ? e.patrol.map((p) => [p[0], p[1]] as Point) : [],
    patrolIndex: 0,
  }));
}

export function scoreProfile(
  metrics: PlayMetrics,
  uniqueVisited: number,
  routeLength: number,
  livesRemaining: number
): number[] {
  const m = metrics;
  const moves = Math.max(1, m.moves);
  const efficiencyRatio = m.efficient / moves;
  const exploreRatio = uniqueVisited / Math.max(1, routeLength);
  const turnRatio = m.turns / moves;

  // Normalized weights so every archetype is genuinely attainable depending on play style.
  const raw = [
    // 0: Cybersecurity — threat awareness, evading enemies, keeping safe distance
    1.1 + m.avoided * 1.4 + m.safeDistance * 0.25 + m.nearEnemy * 0.4 + m.risk * 0.35,
    // 1: Software Engineering — structured efficiency & clean direct execution
    1.0 + efficiencyRatio * 3.8 + Math.max(0, 1.4 - m.revisits * 0.2) + (m.blocked === 0 ? 0.8 : 0),
    // 2: Data Science — gathering optional crystals, inspecting branches & patterns
    1.0 + m.collect * 1.45 + uniqueVisited * 0.16 + m.branches * 0.45,
    // 3: AI & Machine Learning — anticipating movement, adapting route & turns
    1.0 + m.routeChanges * 0.55 + m.adapt * 0.75 + m.nearEnemy * 0.45 + turnRatio * 2.2,
    // 4: Networking — exploring branches & connecting corridors
    1.0 + m.branches * 0.9 + uniqueVisited * 0.18 + m.explore * 0.35,
    // 5: UI/UX Design — smooth, low-friction, balanced path with minimal hits/blocks
    1.0 + (livesRemaining === 3 ? 1.1 : 0.3) + efficiencyRatio * 1.8 + m.avoided * 0.45 + (m.blocked <= 1 ? 0.7 : 0),
    // 6: Cloud & DevOps — reliability, completing runs & recovering gracefully
    1.0 + m.moves * 0.08 + livesRemaining * 0.45 + m.avoided * 0.5 + (m.enemyHits > 0 ? 0.9 : 0.3),
    // 7: IT Support — diagnosing blocked commands, dead-ends & troubleshooting
    1.0 + m.blocked * 1.15 + m.adapt * 0.95 + m.deadEnds * 0.7 + m.revisits * 0.22,
    // 8: Game Development — creative exploration, detours & experimentation
    1.0 + m.explore * 0.75 + (1 - exploreRatio) * 1.2 + m.revisits * 0.28 + m.collect * 0.55,
  ];

  const sum = raw.reduce((a, b) => a + b, 0);
  const pct = raw.map((v) => Math.floor((v / sum) * 100));
  const remainder = 100 - pct.reduce((a, b) => a + b, 0);
  const ranked = raw.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  for (let i = 0; i < remainder; i++) {
    pct[ranked[i % ranked.length].i]++;
  }
  return pct;
}
