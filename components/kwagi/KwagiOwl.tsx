import React, { useEffect, useRef } from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Polygon,
  Polyline,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { KwagiMood } from '@/constants/dialogues';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Kwagi — a chibi Philippine barn owl. Warm brown gradient body, a cream
 * heart-shaped face disc, small head tufts, speckled feathers, big amber
 * eyes. Matches the Stitch "Kwagi Expression Sheet" art (incl. the per-mood
 * marks ✓ ✗ ? zZ) while staying a live SVG so moods morph and he can blink,
 * breathe, float, and raise a wing to peek/wave.
 */
const C = {
  bodyTop: '#B57F4C',
  bodyBot: '#6E4A2A',
  wing: '#5E3F22',
  speck: '#5E3F22',
  faceCream: '#F3E6CC',
  faceRim: '#8A5A2E',
  belly: '#ECDAB6',
  chevron: '#CDA877',
  beak: '#E8902A',
  beakDark: '#C9761A',
  feet: '#E8902A',
  eye: '#2A1A0E',
  iris: '#C8841E',
  white: '#FFFFFF',
  brow: '#4A3120',
  amber: '#F5B454',
  teal: '#34D9C4',
  wrong: '#F2776B',
  indigo: '#6C8CFF',
  shadow: 'rgba(0,0,0,0.20)',
};

const HALO: Record<KwagiMood, string> = {
  happy: C.amber,
  excited: C.amber,
  thinking: C.indigo,
  correct: C.teal,
  wrong: C.wrong,
  sleepy: C.indigo,
};

type EyeStyle = 'open' | 'happyClosed' | 'sleepyClosed' | 'winkL';

interface MoodConfig {
  eyes: EyeStyle;
  eyeScale: number;
  brow: 'none' | 'sad';
  mouth: 'beak' | 'smile' | 'frown' | 'neutral' | 'tiny';
  sparkle: string | null;
  /** Corner accent that matches the expression sheet. */
  mark: 'none' | 'check' | 'cross' | 'question' | 'sleep';
}

const MOODS: Record<KwagiMood, MoodConfig> = {
  happy: { eyes: 'happyClosed', eyeScale: 1, brow: 'none', mouth: 'beak', sparkle: null, mark: 'none' },
  excited: { eyes: 'open', eyeScale: 1.12, brow: 'none', mouth: 'smile', sparkle: C.amber, mark: 'none' },
  thinking: { eyes: 'winkL', eyeScale: 1, brow: 'none', mouth: 'neutral', sparkle: null, mark: 'question' },
  correct: { eyes: 'open', eyeScale: 1.1, brow: 'none', mouth: 'smile', sparkle: C.teal, mark: 'check' },
  wrong: { eyes: 'open', eyeScale: 0.88, brow: 'sad', mouth: 'frown', sparkle: null, mark: 'cross' },
  sleepy: { eyes: 'sleepyClosed', eyeScale: 1, brow: 'none', mouth: 'tiny', sparkle: null, mark: 'sleep' },
};

const EYE = { lx: 83, rx: 117, cy: 92, r: 13 };

const FACE_HEART =
  'M100 136 C 78 118 60 106 60 86 C 60 70 76 62 88 72 C 92 75 96 78 100 84 ' +
  'C 104 78 108 75 112 72 C 124 62 140 70 140 86 C 140 106 122 118 100 136 Z';

// Deterministic feather speckles on head + wings.
const SPECKS: { x: number; y: number; rx: number; ry: number }[] = [
  { x: 78, y: 60, rx: 2, ry: 3 },
  { x: 122, y: 60, rx: 2, ry: 3 },
  { x: 100, y: 50, rx: 2, ry: 2.6 },
  { x: 66, y: 78, rx: 2, ry: 3 },
  { x: 134, y: 78, rx: 2, ry: 3 },
  { x: 100, y: 168, rx: 2, ry: 2.6 },
];

interface Props {
  mood?: KwagiMood;
  size?: number;
  /** Disable blink + breathing + float (respects user's animation setting). */
  animate?: boolean;
  /**
   * Peek pose: the side of the screen edge Kwagi is peeking from. The near
   * wing grips that edge, the far wing waves into the screen, and he tilts
   * his head around the corner.
   */
  peek?: 'left' | 'right';
}

export function KwagiOwl({ mood = 'happy', size = 110, animate = true, peek }: Props) {
  const cfg = MOODS[mood];
  // Edge-side wing grips; opposite wing waves in; head leans around the corner.
  const gripSide = peek;
  const waveSide = peek === 'left' ? 'right' : peek === 'right' ? 'left' : undefined;
  const tilt = peek === 'left' ? 7 : peek === 'right' ? -7 : 0;
  const blink = useSharedValue(0);
  const breathe = useSharedValue(1);
  const float = useSharedValue(0);
  const halo = useSharedValue(0.6);
  // Life layer: wandering gaze, idle sway, waving wing, twinkling sparkles.
  const gazeX = useSharedValue(0);
  const gazeY = useSharedValue(0);
  const sway = useSharedValue(0);
  const wave = useSharedValue(0);
  const twinkle = useSharedValue(1);
  // Spring-driven reaction layer (applying Remotion's spring/keyframe craft to
  // reanimated): a hop+pop on correct/excited, a shake on wrong.
  const reactScale = useSharedValue(1);
  const reactY = useSharedValue(0);
  const reactX = useSharedValue(0);
  const blinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gazeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const leftOpen = cfg.eyes === 'open';
  const rightOpen = cfg.eyes === 'open' || cfg.eyes === 'winkL';
  const anyOpen = leftOpen || rightOpen;

  useEffect(() => {
    if (!animate) {
      breathe.value = 1;
      float.value = 0;
      halo.value = 0.6;
      return;
    }
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    float.value = withRepeat(
      withSequence(
        withTiming(-1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    halo.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [animate, breathe, float, halo]);

  // Idle sway — a gentle head/body rock. Sleepy Kwagi nods deeper and slower,
  // like he's fighting to stay awake.
  useEffect(() => {
    if (!animate) {
      sway.value = 0;
      return;
    }
    const amp = mood === 'sleepy' ? 3.5 : 1.4;
    const dur = mood === 'sleepy' ? 2600 : 1900;
    sway.value = withRepeat(
      withSequence(
        withTiming(-amp, { duration: dur, easing: Easing.inOut(Easing.ease) }),
        withTiming(amp, { duration: dur, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [animate, mood, sway]);

  // Sparkles twinkle instead of sitting frozen.
  useEffect(() => {
    if (!animate || !cfg.sparkle) {
      twinkle.value = 1;
      return;
    }
    twinkle.value = withRepeat(
      withSequence(
        withTiming(0.25, { duration: 420, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 420, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [animate, cfg.sparkle, twinkle]);

  // Peek wave — the inward wing actually waves hello.
  useEffect(() => {
    if (!animate || !peek) {
      wave.value = 0;
      return;
    }
    wave.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 480, easing: Easing.inOut(Easing.ease) }),
        withTiming(-0.4, { duration: 480, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [animate, peek, wave]);

  // Wandering gaze — every few seconds the open eyes glance somewhere, hold,
  // then drift back to center.
  useEffect(() => {
    if (!animate || !anyOpen) {
      gazeX.value = 0;
      gazeY.value = 0;
      return;
    }
    let active = true;
    const scheduleGlance = () => {
      const delay = 3600 + Math.random() * 3200;
      gazeTimer.current = setTimeout(() => {
        if (!active) return;
        const gx = (Math.random() * 2 - 1) * 3;
        const gy = Math.random() * 2 - 0.5;
        const ease = { duration: 260, easing: Easing.out(Easing.cubic) };
        gazeX.value = withSequence(withTiming(gx, ease), withDelay(750, withTiming(0, ease)));
        gazeY.value = withSequence(withTiming(gy, ease), withDelay(750, withTiming(0, ease)));
        scheduleGlance();
      }, delay);
    };
    scheduleGlance();
    return () => {
      active = false;
      if (gazeTimer.current) clearTimeout(gazeTimer.current);
    };
  }, [animate, anyOpen, gazeX, gazeY]);

  useEffect(() => {
    if (!animate || !anyOpen) {
      blink.value = 0;
      return;
    }
    let active = true;
    const scheduleBlink = () => {
      const delay = 3000 + Math.random() * 2000;
      blinkTimer.current = setTimeout(() => {
        if (!active) return;
        // Owls double-blink now and then — sells the "alive" illusion.
        blink.value =
          Math.random() < 0.35
            ? withSequence(
                withTiming(1, { duration: 80 }),
                withTiming(0, { duration: 80 }),
                withDelay(110, withTiming(1, { duration: 70 })),
                withTiming(0, { duration: 70 }),
              )
            : withSequence(withTiming(1, { duration: 80 }), withTiming(0, { duration: 80 }));
        scheduleBlink();
      }, delay);
    };
    scheduleBlink();
    return () => {
      active = false;
      if (blinkTimer.current) clearTimeout(blinkTimer.current);
    };
  }, [animate, anyOpen, blink]);

  // Fire a reaction whenever the mood becomes celebratory or wrong.
  useEffect(() => {
    if (!animate) return;
    if (mood === 'correct' || mood === 'excited') {
      reactScale.value = withSequence(
        withSpring(1.14, { damping: 8, stiffness: 180 }), // bouncy pop
        withSpring(1, { damping: 12 }),
      );
      reactY.value = withSequence(
        withSpring(-size * 0.07, { damping: 7 }), // little hop
        withSpring(0, { damping: 12 }),
      );
    } else if (mood === 'wrong') {
      const dx = size * 0.05;
      reactX.value = withSequence(
        withTiming(-dx, { duration: 50 }),
        withTiming(dx, { duration: 50 }),
        withTiming(-dx * 0.7, { duration: 50 }),
        withTiming(dx * 0.7, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }
  }, [mood, animate, size, reactScale, reactY, reactX]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: reactX.value },
      { translateY: float.value * (size * 0.03) + reactY.value },
      { scale: breathe.value * reactScale.value },
    ],
  }));
  const haloProps = useAnimatedProps(() => ({ opacity: halo.value }));
  // Peek tilt (static) + live sway ride the same rotation about the body center.
  const bodyProps = useAnimatedProps(() => ({ rotation: tilt + sway.value }));
  const twinkleProps = useAnimatedProps(() => ({ opacity: twinkle.value }));
  // Gaze rides plain cx/cy attributes so it works on native and web alike.
  const rNow = EYE.r * cfg.eyeScale;
  const pupilPropsL = useAnimatedProps(() => ({ cx: EYE.lx + gazeX.value, cy: EYE.cy + gazeY.value }));
  const pupilPropsR = useAnimatedProps(() => ({ cx: EYE.rx + gazeX.value, cy: EYE.cy + gazeY.value }));
  const hiaPropsL = useAnimatedProps(() => ({
    cx: EYE.lx - rNow * 0.32 + gazeX.value,
    cy: EYE.cy - rNow * 0.36 + gazeY.value,
  }));
  const hiaPropsR = useAnimatedProps(() => ({
    cx: EYE.rx - rNow * 0.32 + gazeX.value,
    cy: EYE.cy - rNow * 0.36 + gazeY.value,
  }));
  const hibPropsL = useAnimatedProps(() => ({
    cx: EYE.lx + rNow * 0.28 + gazeX.value,
    cy: EYE.cy + rNow * 0.3 + gazeY.value,
  }));
  const hibPropsR = useAnimatedProps(() => ({
    cx: EYE.rx + rNow * 0.28 + gazeX.value,
    cy: EYE.cy + rNow * 0.3 + gazeY.value,
  }));
  const wavePropsL = useAnimatedProps(() => ({ rotation: 42 + wave.value * 16 }));
  const wavePropsR = useAnimatedProps(() => ({ rotation: -42 - wave.value * 16 }));

  const r = EYE.r * cfg.eyeScale;
  const lid = r + 2;
  const lidProps = useAnimatedProps(() => ({ height: 2 * lid * blink.value }));

  const haloColor = HALO[mood];

  // Pupil + highlights ride the gaze offset inside the static amber iris ring.
  const renderOpenEye = (
    x: number,
    pupilProps: typeof pupilPropsL,
    hiaProps: typeof hiaPropsL,
    hibProps: typeof hibPropsL,
  ) => (
    <G key={`eye-${x}`}>
      <Circle cx={x} cy={EYE.cy} r={r + 1.5} fill={C.iris} opacity={0.9} />
      <AnimatedCircle animatedProps={pupilProps} r={r} fill={C.eye} />
      <AnimatedCircle animatedProps={hiaProps} r={r * 0.26} fill={C.white} />
      <AnimatedCircle animatedProps={hibProps} r={r * 0.12} fill={C.white} opacity={0.8} />
      <AnimatedRect x={x - lid} y={EYE.cy - lid} width={2 * lid} fill={C.faceCream} animatedProps={lidProps} />
    </G>
  );

  return (
    <Animated.View style={[{ width: size, height: size }, containerStyle]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <RadialGradient id="owlHalo" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={haloColor} stopOpacity="0.55" />
            <Stop offset="0.6" stopColor={haloColor} stopOpacity="0.12" />
            <Stop offset="1" stopColor={haloColor} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="owlBody" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.bodyTop} />
            <Stop offset="1" stopColor={C.bodyBot} />
          </LinearGradient>
        </Defs>

        <AnimatedG animatedProps={haloProps}>
          <Circle cx={100} cy={96} r={98} fill="url(#owlHalo)" />
        </AnimatedG>

        {/* Pivot via nested translates — the `origin` prop breaks on web. */}
        <G transform="translate(100, 112)">
        <AnimatedG animatedProps={bodyProps}>
        <G transform="translate(-100, -112)">
        <Ellipse cx={100} cy={188} rx={50} ry={8} fill={C.shadow} />

        {/* Head tufts */}
        <Path d="M78 50 C 70 30 80 24 92 44 Z" fill={C.bodyTop} />
        <Path d="M122 50 C 130 30 120 24 108 44 Z" fill={C.bodyTop} />

        {/* Body + rounded head */}
        <Ellipse cx={100} cy={122} rx={62} ry={64} fill="url(#owlBody)" />
        <Circle cx={100} cy={84} r={54} fill="url(#owlBody)" />

        {/* Feather speckles */}
        <G fill={C.speck} opacity={0.25}>
          {SPECKS.map((s, i) => (
            <Ellipse key={i} cx={s.x} cy={s.y} rx={s.rx} ry={s.ry} />
          ))}
        </G>

        {/* Wings — for a peek: one grips the edge, the other waves into screen */}
        {gripSide === 'left' ? (
          <G transform="rotate(26 56 118)">
            <Ellipse cx={38} cy={132} rx={15} ry={30} fill={C.wing} />
          </G>
        ) : waveSide === 'left' ? (
          <G transform="translate(54, 120)">
            <AnimatedG animatedProps={wavePropsL}>
              <Ellipse cx={-12} cy={0} rx={15} ry={32} fill={C.wing} />
            </AnimatedG>
          </G>
        ) : (
          <Ellipse cx={48} cy={128} rx={18} ry={44} fill={C.wing} />
        )}
        {gripSide === 'right' ? (
          <G transform="rotate(-26 144 118)">
            <Ellipse cx={162} cy={132} rx={15} ry={30} fill={C.wing} />
          </G>
        ) : waveSide === 'right' ? (
          <G transform="translate(146, 120)">
            <AnimatedG animatedProps={wavePropsR}>
              <Ellipse cx={12} cy={0} rx={15} ry={32} fill={C.wing} />
            </AnimatedG>
          </G>
        ) : (
          <Ellipse cx={152} cy={128} rx={18} ry={44} fill={C.wing} />
        )}

        {/* Feet */}
        <G stroke={C.feet} strokeWidth={4} strokeLinecap="round">
          <Line x1={86} y1={180} x2={80} y2={188} />
          <Line x1={86} y1={180} x2={86} y2={189} />
          <Line x1={86} y1={180} x2={92} y2={188} />
          <Line x1={114} y1={180} x2={108} y2={188} />
          <Line x1={114} y1={180} x2={114} y2={189} />
          <Line x1={114} y1={180} x2={120} y2={188} />
        </G>

        {/* Cream belly with chevrons */}
        <Ellipse cx={100} cy={150} rx={30} ry={32} fill={C.belly} />
        <G stroke={C.chevron} strokeWidth={2.5} strokeLinecap="round" fill="none">
          <Path d="M88 150 L100 156 L112 150" />
          <Path d="M88 162 L100 168 L112 162" />
        </G>

        {/* Heart face disc */}
        <Path d={FACE_HEART} fill={C.faceCream} stroke={C.faceRim} strokeWidth={2.5} />

        {/* Sparkles */}
        {cfg.sparkle && (
          <AnimatedG animatedProps={twinkleProps} stroke={cfg.sparkle} strokeWidth={3} strokeLinecap="round">
            <Line x1={42} y1={54} x2={50} y2={62} />
            <Line x1={158} y1={54} x2={150} y2={62} />
            <Line x1={150} y1={48} x2={158} y2={48} />
            <Line x1={42} y1={48} x2={50} y2={48} />
            <Line x1={66} y1={34} x2={66} y2={24} />
            <Line x1={134} y1={34} x2={134} y2={24} />
          </AnimatedG>
        )}

        {/* Eyes */}
        {cfg.eyes === 'happyClosed' && (
          <G stroke={C.eye} strokeWidth={3.5} strokeLinecap="round" fill="none">
            <Path d={`M ${EYE.lx - 12} ${EYE.cy + 3} Q ${EYE.lx} ${EYE.cy - 7} ${EYE.lx + 12} ${EYE.cy + 3}`} />
            <Path d={`M ${EYE.rx - 12} ${EYE.cy + 3} Q ${EYE.rx} ${EYE.cy - 7} ${EYE.rx + 12} ${EYE.cy + 3}`} />
          </G>
        )}
        {cfg.eyes === 'sleepyClosed' && (
          <G stroke={C.eye} strokeWidth={3.5} strokeLinecap="round" fill="none">
            <Path d={`M ${EYE.lx - 12} ${EYE.cy} Q ${EYE.lx} ${EYE.cy + 8} ${EYE.lx + 12} ${EYE.cy}`} />
            <Path d={`M ${EYE.rx - 12} ${EYE.cy} Q ${EYE.rx} ${EYE.cy + 8} ${EYE.rx + 12} ${EYE.cy}`} />
          </G>
        )}
        {cfg.eyes === 'winkL' && (
          <Path
            d={`M ${EYE.lx - 11} ${EYE.cy} Q ${EYE.lx} ${EYE.cy + 7} ${EYE.lx + 11} ${EYE.cy}`}
            stroke={C.eye}
            strokeWidth={3.5}
            strokeLinecap="round"
            fill="none"
          />
        )}
        {leftOpen && renderOpenEye(EYE.lx, pupilPropsL, hiaPropsL, hibPropsL)}
        {rightOpen && renderOpenEye(EYE.rx, pupilPropsR, hiaPropsR, hibPropsR)}

        {/* Sad brows */}
        {cfg.brow === 'sad' && (
          <G stroke={C.brow} strokeWidth={4} strokeLinecap="round">
            <Line x1={EYE.lx - 14} y1={EYE.cy - 20} x2={EYE.lx + 12} y2={EYE.cy - 12} />
            <Line x1={EYE.rx + 14} y1={EYE.cy - 20} x2={EYE.rx - 12} y2={EYE.cy - 12} />
          </G>
        )}

        {/* Beak / mouth */}
        {cfg.mouth === 'beak' && <Polygon points="100,104 94,104 100,114" fill={C.beak} />}
        {cfg.mouth === 'tiny' && <Polygon points="100,105 96,105 100,112" fill={C.beak} />}
        {cfg.mouth === 'neutral' && <Polygon points="100,104 93,104 100,115" fill={C.beak} />}
        {cfg.mouth === 'smile' && (
          <>
            <Polygon points="100,102 93,102 100,112" fill={C.beak} />
            <Path d="M 86 116 Q 100 130 114 116" stroke={C.beakDark} strokeWidth={3} fill="none" strokeLinecap="round" />
          </>
        )}
        {cfg.mouth === 'frown' && (
          <>
            <Polygon points="100,104 93,104 100,114" fill={C.beak} />
            <Path d="M 88 126 Q 100 116 112 126" stroke={C.beakDark} strokeWidth={3} fill="none" strokeLinecap="round" />
          </>
        )}

        {/* Per-mood corner marks (match the expression sheet) */}
        {cfg.mark === 'check' && (
          <Path d="M144 56 L151 64 L165 48" stroke={C.teal} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {cfg.mark === 'cross' && (
          <G stroke={C.wrong} strokeWidth={4} strokeLinecap="round">
            <Line x1={148} y1={50} x2={164} y2={66} />
            <Line x1={164} y1={50} x2={148} y2={66} />
          </G>
        )}
        {cfg.mark === 'question' && (
          <G>
            <Path
              d="M148 54 C148 45 164 45 164 54 C164 61 155 60 155 68"
              stroke={C.indigo}
              strokeWidth={3.5}
              fill="none"
              strokeLinecap="round"
            />
            <Circle cx={155} cy={74} r={2.2} fill={C.indigo} />
          </G>
        )}
        {cfg.mark === 'sleep' && (
          <G stroke={C.indigo} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <Polyline points="144,64 152,64 144,72 152,72" />
            <Polyline points="156,48 168,48 156,62 168,62" />
          </G>
        )}
        {cfg.mark === 'sleep' && <Ellipse cx={120} cy={112} rx={4} ry={5} fill={C.indigo} opacity={0.6} />}
        </G>
        </AnimatedG>
        </G>
      </Svg>
    </Animated.View>
  );
}

export default KwagiOwl;
