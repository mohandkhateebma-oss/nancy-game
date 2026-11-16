import React from 'react';
import { ARCHETYPES, ARCHETYPE_COLORS, Direction } from '../game/data';

export function HeroMascotSvg() {
  return (
    <svg viewBox="0 0 220 260" role="img" aria-label="Nova robot mascot" className="w-56 md:w-64 h-auto overflow-visible">
      <defs>
        <linearGradient id="armorHero" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#f5ffff" />
          <stop offset=".48" stopColor="#91c9ed" />
          <stop offset="1" stopColor="#425b9e" />
        </linearGradient>
        <linearGradient id="coreHero" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#8fffff" />
          <stop offset="1" stopColor="#367cff" />
        </linearGradient>
      </defs>
      <path
        d="M47 112 23 145l12 34 25-25M173 112l24 33-12 34-25-25"
        fill="url(#armorHero)"
        stroke="#55efff"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <rect x="62" y="30" width="96" height="105" rx="27" fill="url(#armorHero)" stroke="#55efff" strokeWidth="5" />
      <rect x="72" y="48" width="76" height="62" rx="18" fill="#101c48" stroke="#9cfaff" strokeWidth="3" />
      <ellipse cx="94" cy="77" rx="8" ry="12" fill="#55efff" />
      <ellipse cx="126" cy="77" rx="8" ry="12" fill="#55efff" />
      <path d="M96 94q14 10 28 0" fill="none" stroke="#ff70d7" strokeWidth="4" strokeLinecap="round" />
      <path d="M110 30V13m-9 0h18" stroke="#55efff" strokeWidth="6" strokeLinecap="round" />
      <rect x="54" y="137" width="112" height="83" rx="24" fill="url(#armorHero)" stroke="#55efff" strokeWidth="5" />
      <path d="M78 153h64" stroke="#fff" strokeWidth="4" opacity=".7" />
      <circle cx="110" cy="180" r="20" fill="#10234f" stroke="#55efff" strokeWidth="4" />
      <circle cx="110" cy="180" r="11" fill="url(#coreHero)" />
      <path
        d="M78 218 68 245h25l8-25m28-2 8 29h25l-10-29"
        fill="url(#armorHero)"
        stroke="#55efff"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <circle cx="47" cy="151" r="7" fill="#ff61d5" />
      <circle cx="174" cy="151" r="7" fill="#ff61d5" />
    </svg>
  );
}

export function MazeRobotSvg({ facing, walking }: { facing: Direction; walking?: boolean }) {
  const eyeOffset =
    facing === 'U' ? { x: 0, y: -1.8 } : facing === 'D' ? { x: 0, y: 1.8 } : facing === 'L' ? { x: -2.2, y: 0 } : { x: 2.2, y: 0 };

  return (
    <svg viewBox="0 0 40 46" aria-label="Robot" className="w-[84%] h-[84%] block drop-shadow-[0_0_8px_rgba(85,239,255,0.75)]">
      {/* Antenna */}
      <line x1="20" y1="3" x2="20" y2="0" stroke="#55efff" strokeWidth="2.4" strokeLinecap="round" />
      {/* Head */}
      <rect x="8" y="3" width="24" height="22" rx="7" fill="#d9f7ff" stroke="#55efff" strokeWidth="2.2" />
      <rect x="11" y="8" width="18" height="12" rx="4" fill="#101c48" />
      {/* Directional eyes */}
      <circle cx={16 + eyeOffset.x} cy={14 + eyeOffset.y} r="2.5" fill="#55efff" />
      <circle cx={24 + eyeOffset.x} cy={14 + eyeOffset.y} r="2.5" fill="#55efff" />
      {/* Body */}
      <rect x="7" y="26" width="26" height="15" rx="5" fill="#8bbce9" stroke="#55efff" strokeWidth="2.2" />
      <circle cx="20" cy="33" r="4" fill={walking ? '#ffd66e' : '#55efff'} />
      {/* Feet with subtle stride */}
      <path
        d={walking ? 'M13 41 10 45m17-4 3 4' : 'M13 41 11 45m16-4 2 4'}
        stroke="#55efff"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ArchetypeRobotSvg({ index }: { index: number }) {
  const accent = ARCHETYPE_COLORS[index] ?? '#55efff';
  const label = ARCHETYPES[index] ?? 'Digital DNA Robot';

  const accessories: React.ReactNode[] = [
    // 0: Guardian
    <>
      <path d="M5 24L-7 13l-3 15 15 7M35 24l12-11 3 15-15 7" fill={accent} stroke="#eafcff" strokeWidth="2" />
      <path d="M-8 5L-2 -2 4 5" stroke={accent} strokeWidth="3" fill="none" />
    </>,
    // 1: Builder
    <>
      <path d="M3 35L-5 47h13l5-10M37 35l8 12H32l-4-10" fill="none" stroke={accent} strokeWidth="4" />
      <path d="M-4 2h10v7H-4zM34 2h10v7H34z" fill={accent} />
    </>,
    // 2: Detective
    <>
      <circle cx="10" cy="17" r="8" fill="none" stroke={accent} strokeWidth="3" />
      <circle cx="30" cy="17" r="8" fill="none" stroke={accent} strokeWidth="3" />
      <path d="M18 17h4M20 4v-7m-4 3h8" stroke={accent} strokeWidth="2" />
    </>,
    // 3: Pattern Oracle
    <>
      <path d="M8 13L20 4l12 9-12 9z" fill="none" stroke={accent} strokeWidth="2" />
      <circle cx="20" cy="15" r="3" fill={accent} />
      <path d="M8 3l-4-4m28 4 4-4" stroke={accent} strokeWidth="2" />
    </>,
    // 4: Network Navigator
    <>
      <path d="M20 2v-9m-5 4h10M5 10L-2 5m37 5 7-5" stroke={accent} strokeWidth="3" fill="none" />
      <circle cx="20" cy="-8" r="3" fill={accent} />
    </>,
    // 5: Experience Curator
    <>
      <path d="M2 7l-7-7m43 7 7-7" stroke={accent} strokeWidth="3" />
      <path d="M-4 17h8m32 0h8" stroke={accent} strokeWidth="3" />
    </>,
    // 6: Cloud Conductor
    <>
      <path d="M4 3q16-13 32 0l-4 7H8z" fill={accent} opacity=".8" />
      <path d="M20 -4v-8m-5 4h10" stroke={accent} strokeWidth="2" />
    </>,
    // 7: System Rescuer
    <>
      <path d="M-2 15l-8 8 8 5M42 15l8 8-8 5" fill="none" stroke={accent} strokeWidth="4" />
      <path d="M8 40l-5 8m29-8 5 8" stroke={accent} strokeWidth="3" />
    </>,
    // 8: Play Architect
    <>
      <path d="M-4 3h9v9h-9zM35 3h9v9h-9zM-4 32h9v9h-9zM35 32h9v9h-9z" fill={accent} />
      <path d="M-2 22h8m28 0h8" stroke={accent} strokeWidth="3" />
    </>,
  ];

  return (
    <svg
      viewBox="-12 -14 64 66"
      role="img"
      aria-label={`${label} robot`}
      className="w-44 h-44 drop-shadow-[0_0_22px_rgba(85,239,255,0.45)]"
    >
      <g>{accessories[index]}</g>
      <rect x="8" y="3" width="24" height="22" rx="7" fill="#d9f7ff" stroke={accent} strokeWidth="2.5" />
      <rect x="11" y="8" width="18" height="12" rx="4" fill="#101c48" />
      <circle cx="16" cy="14" r="2.5" fill={accent} />
      <circle cx="24" cy="14" r="2.5" fill={accent} />
      <rect x="7" y="26" width="26" height="15" rx="5" fill="#8bbce9" stroke={accent} strokeWidth="2.5" />
      <circle cx="20" cy="33" r="4" fill={accent} />
      <path d="M13 41 11 45m16-4 2 4" stroke={accent} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
