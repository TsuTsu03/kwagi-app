import React, { useEffect, useRef } from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Polyline,
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
 * Kwagi — a chibi Philippine barn owl drawn to match the "Kwagi Expression
 * Sheet": one bean-shaped caramel body with small ear points, a thick
 * sticker-style outline, a big cream heart face mask, dark glossy eyes, a
 * glowing halo ring, striped wings, a scalloped belly, and per-mood marks
 * (check, cross, ?, zZ). It stays a live SVG so moods morph and he can blink,
 * breathe, sway, float, think with a wing on his chin, and peek/wave from
 * screen edges.
 */
const C = {
  outline: '#5A3417',
  bodyTop: '#D8A062',
  bodyBot: '#B97A3F',
  wing: '#A7672F',
  wingStripe: '#7A4519',
  faceCream: '#FAEBD3',
  faceRim: '#B07A45',
  belly: '#F5E2C3',
  scallop: '#CF9D68',
  beak: '#EE9A3A',
  feet: '#EE9A3A',
  eye: '#3A2211',
  mouth: '#7C2F20',
  tongue: '#F28B86',
  white: '#FFFFFF',
  brow: '#5A3417',
  amber: '#F5C24C',
  teal: '#34D9C4',
  wrong: '#F2776B',
  indigo: '#7C8CFF',
  question: '#E0B27A',
  bubble: '#A9CBF5',
  shadow: 'rgba(0,0,0,0.22)',
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
  excited: { eyes: 'open', eyeScale: 1.1, brow: 'none', mouth: 'smile', sparkle: C.amber, mark: 'none' },
  thinking: { eyes: 'winkL', eyeScale: 1, brow: 'none', mouth: 'neutral', sparkle: null, mark: 'question' },
  correct: { eyes: 'open', eyeScale: 1.08, brow: 'none', mouth: 'smile', sparkle: C.teal, mark: 'check' },
  wrong: { eyes: 'open', eyeScale: 0.9, brow: 'sad', mouth: 'frown', sparkle: null, mark: 'cross' },
  sleepy: { eyes: 'sleepyClosed', eyeScale: 1, brow: 'none', mouth: 'tiny', sparkle: null, mark: 'sleep' },
};

const EYE = { lx: 80, rx: 120, cy: 82, r: 13 };

/** One bean-shaped head and body with two small ear points. */
const BODY =
  'M100 36 C 118 36 134 38 146 44 L 153 37 C 159 54 162 72 162 96 ' +
  'C 162 132 154 164 132 176 C 120 182 80 182 68 176 ' +
  'C 46 164 38 132 38 96 C 38 72 41 54 47 37 L 54 44 C 66 38 82 36 100 36 Z';

/** Heart-shaped face mask: two lobes on top, a soft point under the beak. */
const FACE_HEART =
  'M100 56 C 92 44 74 40 62 50 C 50 60 50 84 58 98 C 68 114 86 120 100 124 ' +
  'C 114 120 132 114 142 98 C 150 84 150 60 138 50 C 126 40 108 44 100 56 Z';

const BELLY =
  'M64 122 C 72 112 128 112 136 122 C 146 142 140 170 118 176 ' +
  'C 108 179 92 179 82 176 C 60 170 54 142 64 122 Z';

/** Left wing in local space: shoulder at (0,0), hanging down. Mirror it for the right. */
const WING = 'M2 0 C -14 4 -24 28 -22 54 C -21 68 -12 76 -2 74 C 6 72 9 62 10 50 C 12 30 12 10 2 0 Z';

// Small "u" feather scallops on the belly, in staggered rows.
const SCALLOPS: [number, number][] = [
  [86, 134], [100, 134], [114, 134],
  [78, 148], [93, 148], [107, 148], [122, 148],
  [86, 162], [100, 162], [114, 162],
];

/** Four-point twinkle star. */
const star = (x: number, y: number, r: number) =>
  `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`;

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
  // Raised high beside the head, like the waving pose on the expression sheet.
  const wavePropsL = useAnimatedProps(() => ({ rotation: 145 + wave.value * 18 }));
  const wavePropsR = useAnimatedProps(() => ({ rotation: -145 - wave.value * 18 }));

  const r = EYE.r * cfg.eyeScale;
  const lid = r + 2;
  const lidProps = useAnimatedProps(() => ({ height: 2 * lid * blink.value }));

  const haloColor = HALO[mood];
  const chinWing = mood === 'thinking' && !peek;

  const wingShape = (
    <>
      <Path d={WING} fill={C.wing} stroke={C.outline} strokeWidth={3.5} strokeLinejoin="round" />
      <G stroke={C.wingStripe} strokeWidth={2.5} strokeLinecap="round" fill="none">
        <Path d="M-19 40 Q -6 45 8 40" />
        <Path d="M-20 53 Q -7 58 7 53" />
        <Path d="M-16 65 Q -7 69 3 65" />
      </G>
    </>
  );
  const mirrored = <G transform="scale(-1, 1)">{wingShape}</G>;

  // Pupil + highlights ride the gaze offset; the lid rect drops for blinks.
  const renderOpenEye = (
    x: number,
    pupilProps: typeof pupilPropsL,
    hiaProps: typeof hiaPropsL,
    hibProps: typeof hibPropsL,
  ) => (
    <G key={`eye-${x}`}>
      <AnimatedCircle animatedProps={pupilProps} r={r} fill={C.eye} />
      <AnimatedCircle animatedProps={hiaProps} r={r * 0.34} fill={C.white} />
      <AnimatedCircle animatedProps={hibProps} r={r * 0.14} fill={C.white} opacity={0.85} />
      <AnimatedRect x={x - lid} y={EYE.cy - lid} width={2 * lid} fill={C.faceCream} animatedProps={lidProps} />
    </G>
  );

  return (
    <Animated.View style={[{ width: size, height: size }, containerStyle]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <LinearGradient id="owlBody" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.bodyTop} />
            <Stop offset="1" stopColor={C.bodyBot} />
          </LinearGradient>
        </Defs>

        <Ellipse cx={100} cy={190} rx={46} ry={7} fill={C.shadow} />

        {/* Pivot via nested translates — the `origin` prop breaks on web. */}
        <G transform="translate(100, 112)">
        <AnimatedG animatedProps={bodyProps}>
        <G transform="translate(-100, -112)">

        {/* Halo ring with a soft pulsing glow */}
        <AnimatedG animatedProps={haloProps}>
          <Ellipse cx={100} cy={18} rx={31} ry={7} fill="none" stroke={haloColor} strokeWidth={10} opacity={0.28} />
        </AnimatedG>
        <Ellipse cx={100} cy={18} rx={30} ry={6.5} fill="none" stroke={haloColor} strokeWidth={3.5} />

        {/* Feet: three rounded toes each, tucked under the body */}
        <G fill={C.feet} stroke={C.outline} strokeWidth={2}>
          {[80, 86, 92, 108, 114, 120].map((x) => (
            <Ellipse key={x} cx={x} cy={x === 86 || x === 114 ? 185 : 183} rx={4.2} ry={4} />
          ))}
        </G>

        {/* Body */}
        <Path d={BODY} fill="url(#owlBody)" stroke={C.outline} strokeWidth={4} strokeLinejoin="round" />

        {/* Scalloped cream belly */}
        <Path d={BELLY} fill={C.belly} />
        <G stroke={C.scallop} strokeWidth={2.2} strokeLinecap="round" fill="none">
          {SCALLOPS.map(([x, y]) => (
            <Path key={`${x}-${y}`} d={`M${x - 5} ${y} Q${x} ${y + 6} ${x + 5} ${y}`} />
          ))}
        </G>

        {/* Wings — for a peek: one grips the edge, the other waves into screen */}
        {gripSide === 'left' ? (
          <G transform="translate(49, 100) rotate(60)">{wingShape}</G>
        ) : waveSide === 'left' ? (
          <G transform="translate(49, 100)">
            <AnimatedG animatedProps={wavePropsL}>{wingShape}</AnimatedG>
          </G>
        ) : (
          <G transform="translate(49, 100)">{wingShape}</G>
        )}
        {gripSide === 'right' ? (
          <G transform="translate(151, 100) rotate(-60)">{mirrored}</G>
        ) : waveSide === 'right' ? (
          <G transform="translate(151, 100)">
            <AnimatedG animatedProps={wavePropsR}>{mirrored}</AnimatedG>
          </G>
        ) : chinWing ? null : (
          <G transform="translate(151, 100)">{mirrored}</G>
        )}

        {/* Heart face mask */}
        <Path d={FACE_HEART} fill={C.faceCream} stroke={C.faceRim} strokeWidth={2.5} strokeLinejoin="round" />

        {/* Sparkles */}
        {cfg.sparkle && (
          <AnimatedG animatedProps={twinkleProps} fill={cfg.sparkle}>
            <Path d={star(30, 62, 9)} />
            <Path d={star(44, 36, 5)} />
            <Path d={star(172, 84, 6)} />
            {cfg.mark === 'none' && <Path d={star(166, 46, 8)} />}
          </AnimatedG>
        )}

        {/* Eyes */}
        {cfg.eyes === 'happyClosed' && (
          <G stroke={C.eye} strokeWidth={4} strokeLinecap="round" fill="none">
            <Path d={`M ${EYE.lx - 11} ${EYE.cy + 4} Q ${EYE.lx} ${EYE.cy - 8} ${EYE.lx + 11} ${EYE.cy + 4}`} />
            <Path d={`M ${EYE.rx - 11} ${EYE.cy + 4} Q ${EYE.rx} ${EYE.cy - 8} ${EYE.rx + 11} ${EYE.cy + 4}`} />
          </G>
        )}
        {cfg.eyes === 'sleepyClosed' && (
          <G stroke={C.eye} strokeWidth={4} strokeLinecap="round" fill="none">
            <Path d={`M ${EYE.lx - 11} ${EYE.cy} Q ${EYE.lx} ${EYE.cy + 7} ${EYE.lx + 11} ${EYE.cy}`} />
            <Path d={`M ${EYE.rx - 11} ${EYE.cy} Q ${EYE.rx} ${EYE.cy + 7} ${EYE.rx + 11} ${EYE.cy}`} />
          </G>
        )}
        {cfg.eyes === 'winkL' && (
          <Path
            d={`M ${EYE.lx - 10} ${EYE.cy + 1} Q ${EYE.lx} ${EYE.cy + 7} ${EYE.lx + 10} ${EYE.cy + 1}`}
            stroke={C.eye}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
        )}
        {leftOpen && renderOpenEye(EYE.lx, pupilPropsL, hiaPropsL, hibPropsL)}
        {rightOpen && renderOpenEye(EYE.rx, pupilPropsR, hiaPropsR, hibPropsR)}

        {/* Worried brows: inner ends lifted */}
        {cfg.brow === 'sad' && (
          <G stroke={C.brow} strokeWidth={3.5} strokeLinecap="round">
            <Line x1={EYE.lx - 12} y1={EYE.cy - 15} x2={EYE.lx + 9} y2={EYE.cy - 21} />
            <Line x1={EYE.rx + 12} y1={EYE.cy - 15} x2={EYE.rx - 9} y2={EYE.cy - 21} />
          </G>
        )}

        {/* Mouth sits under the beak */}
        {cfg.mouth === 'smile' && (
          <G>
            <Path d="M90 106 Q100 124 110 106 Z" fill={C.mouth} stroke={C.outline} strokeWidth={2} strokeLinejoin="round" />
            <Ellipse cx={100} cy={114} rx={4.5} ry={3} fill={C.tongue} />
          </G>
        )}
        {cfg.mouth === 'frown' && (
          <Path d="M91 119 Q100 111 109 119" stroke={C.outline} strokeWidth={3} fill="none" strokeLinecap="round" />
        )}

        {/* Beak */}
        <Path
          d={cfg.mouth === 'tiny' ? 'M95 96 Q100 94 105 96 L101 104 Q100 106 99 104 Z' : 'M93 95 Q100 92 107 95 L101.5 107 Q100 110 98.5 107 Z'}
          fill={C.beak}
          stroke={C.outline}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Thinking: right wing raised to the chin */}
        {chinWing && <G transform="translate(146, 134) rotate(108) scale(0.66)">{mirrored}</G>}

        {/* Per-mood corner marks (match the expression sheet) */}
        {cfg.mark === 'check' && (
          <Path d="M166 46 L174 54 L189 37" stroke={C.teal} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {cfg.mark === 'cross' && (
          <G stroke={C.wrong} strokeWidth={4.5} strokeLinecap="round">
            <Line x1={169} y1={36} x2={184} y2={51} />
            <Line x1={184} y1={36} x2={169} y2={51} />
          </G>
        )}
        {cfg.mark === 'question' && (
          <G>
            <Path
              d="M166 40 C166 30 184 30 184 40 C184 48 175 47 175 56"
              stroke={C.question}
              strokeWidth={4.5}
              fill="none"
              strokeLinecap="round"
            />
            <Circle cx={175} cy={63} r={2.8} fill={C.question} />
          </G>
        )}
        {cfg.mark === 'sleep' && (
          <G stroke={C.indigo} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <Polyline points="160,62 168,62 160,70 168,70" />
            <Polyline points="172,36 186,36 172,52 186,52" />
          </G>
        )}
        {cfg.mark === 'sleep' && (
          <G>
            <Ellipse cx={111} cy={108} rx={6} ry={7} fill={C.bubble} opacity={0.85} stroke={C.outline} strokeWidth={1} />
            <Circle cx={109} cy={105} r={1.8} fill={C.white} />
          </G>
        )}
        </G>
        </AnimatedG>
        </G>
      </Svg>
    </Animated.View>
  );
}

export default KwagiOwl;
