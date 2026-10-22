// Design tokens. Placeholder values until the Figma integration is connected —
// swap these for the Figma tokens rather than adding colours anywhere else.
export const tokens = {
  color: {
    bg: '#F6F6F2',
    surface: '#FFFFFF',
    ink: '#1A1D21',
    muted: '#5F6670',
    line: '#E2E2DA',
    accent: '#2F5BD3',
    accentSoft: '#E6ECFB',
    accentStrong: '#2347A8',
    good: '#1F8A4C',
    goodSoft: '#E3F3E9',
    goodStrong: '#166B3A',
    miss: '#9A4300',
    missSoft: '#FBEBDD',
    missStrong: '#B4540A',
    streak: '#F08A24',
    streakInk: '#9A4A00',
    locked: '#E2E2DA',
    lockedStrong: '#CFCFC6',
    bad: '#C2412D',
    badSoft: '#FBE7E3',
    warn: '#A86A00',
    warnSoft: '#FAF0DC',
    codeBg: '#15181D',
    codeInk: '#E6E8EB',
    codeMuted: '#8A93A0',
  },
  font: {
    sans: '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  size: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '20px',
    xl: '28px',
    xxl: '40px',
  },
  space: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '40px',
    xxl: '64px',
  },
  radius: {
    sm: '6px',
    md: '10px',
    lg: '14px',
  },
  layout: {
    sidebar: '260px',
    content: '860px',
  },
} as const

export type Tokens = typeof tokens
