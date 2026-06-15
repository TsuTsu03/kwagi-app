/**
 * Kwagi's two palettes. Keys are identical so `useThemeColors()` can swap
 * them at runtime. These hex values MUST mirror the CSS variables in
 * global.css so NativeWind className colors and inline JS colors agree.
 *
 * Dark = "deep focus" indigo night (calm, low eye-strain for long sessions).
 * Light = soft, friendly, claymorphic — airy lavender-white with deep,
 * readable pastel accents (bubble vibe, AA-friendly on white).
 */
export interface ThemeColors {
  bg: string;
  bgGradTop: string;
  bgGradBottom: string;
  surface: string;
  card: string;
  border: string;
  borderSoft: string;

  amber: string;
  amberLight: string;
  amberDim: string;
  amberDeep: string;

  teal: string;
  coral: string;
  purple: string;
  green: string;
  indigo: string;

  glowAmber: string;
  glowTeal: string;
  glowIndigo: string;

  text: string;
  ink: string;
  sub: string;
  muted: string;

  /** Soft drop-shadow color for floating "bubble" surfaces. */
  shadow: string;
  /** Whether to render the starfield (night sky) in the ambient backdrop. */
  stars: boolean;
}

export const darkColors: ThemeColors = {
  bg: '#0A0E1A',
  bgGradTop: '#111935',
  bgGradBottom: '#070A14',
  surface: '#121A2E',
  card: '#1A2440',
  border: '#26314F',
  borderSoft: 'rgba(255,255,255,0.06)',

  amber: '#F5B454',
  amberLight: '#FFD082',
  amberDim: 'rgba(245,180,84,0.15)',
  amberDeep: '#3A2C12',

  teal: '#34D9C4',
  coral: '#F2776B',
  purple: '#A78BFA',
  green: '#4ADE80',
  indigo: '#6C8CFF',

  glowAmber: 'rgba(245,180,84,0.45)',
  glowTeal: 'rgba(52,217,196,0.40)',
  glowIndigo: 'rgba(108,140,255,0.35)',

  text: '#EDF1FB',
  ink: '#EDF1FB',
  sub: '#9AA6C2',
  muted: '#5C6889',

  shadow: 'rgba(0,0,0,0.45)',
  stars: true,
};

export const lightColors: ThemeColors = {
  bg: '#F4F3FB',
  bgGradTop: '#FFFFFF',
  bgGradBottom: '#ECEAF6',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E6E5F2',
  borderSoft: 'rgba(30,33,64,0.07)',

  amber: '#BA7517',
  amberLight: '#E09A2B',
  amberDim: 'rgba(186,117,23,0.13)',
  amberDeep: '#F3E6CF',

  teal: '#0F8E6F',
  coral: '#D85A30',
  purple: '#5B4FC4',
  green: '#4E8E1F',
  indigo: '#3F63D6',

  glowAmber: 'rgba(186,117,23,0.28)',
  glowTeal: 'rgba(15,142,111,0.22)',
  glowIndigo: 'rgba(63,99,214,0.20)',

  text: '#1E2140',
  ink: '#1E2140',
  sub: '#5A6282',
  muted: '#969CB8',

  shadow: 'rgba(76,70,120,0.18)',
  stars: false,
};
