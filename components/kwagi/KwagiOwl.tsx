import React, { useEffect, useRef } from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { KwagiMood } from '@/constants/dialogues';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedG = Animated.createAnimatedComponent(G);

// Palette for the owl body (warm browns + cream, amber eyes).
const C = {
  body: '#6B4A2B',
  bodyDark: '#4A3120',
  face: '#E8D2A8',
  faceShade: '#D8BE8E',
  beak: '#F5B454',
  feet: '#E8902A',
  white: '#FFFFFF',
  pupil: '#1A1208',
  amber: '#F5B454',
  teal: '#34D9C4',
  wrong: '#F2776B',
  shadow: 'rgba(0,0,0,0.22)',
};

// Mood-colored halo behind the owl.
const HALO: Record<KwagiMood, string> = {
  happy: C.amber,
  excited: C.amber,
  thinking: '#6C8CFF',
  correct: C.teal,
  wrong: C.wrong,
  sleepy: '#6C8CFF',
};

interface MoodConfig {
  iris: string;
  pupil: { x: number; y: number } | null;
  eyeScale: number;
  brow: 'none' | 'sad';
  mouth: 'beak' | 'smile' | 'neutral' | 'frown' | 'tiny';
  sparkle: boolean;
  closed: boolean;
  squintLeft: boolean;
}

const MOODS: Record<KwagiMood, MoodConfig> = {
  happy: { iris: C.amber, pupil: { x: 0, y: 0 }, eyeScale: 1, brow: 'none', mouth: 'beak', sparkle: false, closed: false, squintLeft: false },
  excited: { iris: C.amber, pupil: { x: -2, y: -3 }, eyeScale: 1.12, brow: 'none', mouth: 'smile', sparkle: false, closed: false, squintLeft: false },
  thinking: { iris: C.amber, pupil: { x: 0, y: -3 }, eyeScale: 1, brow: 'none', mouth: 'neutral', sparkle: false, closed: false, squintLeft: true },
  correct: { iris: C.teal, pupil: { x: 0, y: 0 }, eyeScale: 1.1, brow: 'none', mouth: 'smile', sparkle: true, closed: false, squintLeft: false },
  wrong: { iris: C.wrong, pupil: { x: 0, y: 1 }, eyeScale: 0.9, brow: 'sad', mouth: 'frown', sparkle: false, closed: false, squintLeft: false },
  sleepy: { iris: C.amber, pupil: null, eyeScale: 1, brow: 'none', mouth: 'tiny', sparkle: false, closed: true, squintLeft: false },
};

// Eye geometry (in 200x200 viewBox coordinates).
const EYE = { lx: 74, rx: 126, cy: 96, sclera: 23, iris: 12, pupil: 6 };

interface Props {
  mood?: KwagiMood;
  size?: number;
  /** Disable blink + breathing + float (respects user's animation setting). */
  animate?: boolean;
}

export function KwagiOwl({ mood = 'happy', size = 110, animate = true }: Props) {
  const cfg = MOODS[mood];
  const blink = useSharedValue(0); // 0 = open, 1 = closed
  const breathe = useSharedValue(1);
  const float = useSharedValue(0);
  const halo = useSharedValue(0.6);
  const blinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Idle breathing + gentle floating bob + softly pulsing halo.
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

  // Random blink every 3–5s (paused while sleepy/closed).
  useEffect(() => {
    if (!animate || cfg.closed) {
      blink.value = 0;
      return;
    }
    let active = true;
    const scheduleBlink = () => {
      const delay = 3000 + Math.random() * 2000;
      blinkTimer.current = setTimeout(() => {
        if (!active) return;
        blink.value = withSequence(
          withTiming(1, { duration: 80 }),
          withTiming(0, { duration: 80 }),
        );
        scheduleBlink();
      }, delay);
    };
    scheduleBlink();
    return () => {
      active = false;
      if (blinkTimer.current) clearTimeout(blinkTimer.current);
    };
  }, [animate, cfg.closed, blink]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }, { translateY: float.value * (size * 0.03) }],
  }));
  const haloProps = useAnimatedProps(() => ({ opacity: halo.value }));

  const lidHeight = EYE.sclera * 2;
  const leftLidProps = useAnimatedProps(() => ({
    height: lidHeight * blink.value,
  }));
  const rightLidProps = useAnimatedProps(() => ({
    height: lidHeight * blink.value,
  }));

  const haloColor = HALO[mood];

  return (
    <Animated.View style={[{ width: size, height: size }, containerStyle]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <RadialGradient id="owlHalo" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={haloColor} stopOpacity="0.55" />
            <Stop offset="0.6" stopColor={haloColor} stopOpacity="0.12" />
            <Stop offset="1" stopColor={haloColor} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Soft mood-colored glow halo */}
        <AnimatedG animatedProps={haloProps}>
          <Circle cx={100} cy={96} r={98} fill="url(#owlHalo)" />
        </AnimatedG>

        {/* Drop shadow */}
        <Ellipse cx={100} cy={186} rx={52} ry={9} fill={C.shadow} />

        {/* Body */}
        <Ellipse cx={100} cy={132} rx={56} ry={52} fill={C.body} />
        {/* Wings */}
        <Ellipse cx={52} cy={134} rx={17} ry={36} fill={C.bodyDark} />
        <Ellipse cx={148} cy={134} rx={17} ry={36} fill={C.bodyDark} />
        {/* Striped belly */}
        <Ellipse cx={100} cy={142} rx={32} ry={36} fill={C.face} />
        <Line x1={72} y1={132} x2={128} y2={132} stroke={C.faceShade} strokeWidth={3} strokeLinecap="round" />
        <Line x1={74} y1={146} x2={126} y2={146} stroke={C.faceShade} strokeWidth={3} strokeLinecap="round" />
        <Line x1={78} y1={160} x2={122} y2={160} stroke={C.faceShade} strokeWidth={3} strokeLinecap="round" />

        {/* Feet */}
        <G stroke={C.feet} strokeWidth={4} strokeLinecap="round">
          <Line x1={84} y1={180} x2={78} y2={188} />
          <Line x1={84} y1={180} x2={84} y2={189} />
          <Line x1={84} y1={180} x2={90} y2={188} />
          <Line x1={116} y1={180} x2={110} y2={188} />
          <Line x1={116} y1={180} x2={116} y2={189} />
          <Line x1={116} y1={180} x2={122} y2={188} />
        </G>

        {/* Ear tufts */}
        <Polygon points="58,52 70,20 84,54" fill={C.body} />
        <Polygon points="142,52 130,20 116,54" fill={C.body} />

        {/* Head */}
        <Circle cx={100} cy={84} r={62} fill={C.body} />
        {/* Face disc */}
        <Ellipse cx={100} cy={92} rx={50} ry={46} fill={C.face} />

        {/* Sparkles (correct mood) */}
        {cfg.sparkle && (
          <G stroke={C.amber} strokeWidth={3} strokeLinecap="round">
            <Line x1={40} y1={44} x2={48} y2={52} />
            <Line x1={160} y1={44} x2={152} y2={52} />
            <Line x1={36} y1={92} x2={26} y2={92} />
            <Line x1={164} y1={92} x2={174} y2={92} />
            <Line x1={70} y1={28} x2={70} y2={18} />
            <Line x1={130} y1={28} x2={130} y2={18} />
          </G>
        )}

        {/* Eyes */}
        {cfg.closed ? (
          // Sleepy: half-closed curved lines, no pupils.
          <G stroke={C.pupil} strokeWidth={3} strokeLinecap="round" fill="none">
            <Path d={`M ${EYE.lx - 16} ${EYE.cy} Q ${EYE.lx} ${EYE.cy + 12} ${EYE.lx + 16} ${EYE.cy}`} />
            <Path d={`M ${EYE.rx - 16} ${EYE.cy} Q ${EYE.rx} ${EYE.cy + 12} ${EYE.rx + 16} ${EYE.cy}`} />
          </G>
        ) : (
          <>
            {/* Left eye */}
            {cfg.squintLeft ? (
              <Path
                d={`M ${EYE.lx - 18} ${EYE.cy} Q ${EYE.lx} ${EYE.cy - 10} ${EYE.lx + 18} ${EYE.cy}`}
                stroke={C.pupil}
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
              />
            ) : (
              <G>
                <Circle cx={EYE.lx} cy={EYE.cy} r={EYE.sclera * cfg.eyeScale} fill={C.white} />
                <Circle cx={EYE.lx} cy={EYE.cy} r={EYE.iris} fill={cfg.iris} />
                {cfg.pupil && (
                  <Circle cx={EYE.lx + cfg.pupil.x} cy={EYE.cy + cfg.pupil.y} r={EYE.pupil} fill={C.pupil} />
                )}
                <Circle cx={EYE.lx + cfg.pupil!.x + 3} cy={EYE.cy + cfg.pupil!.y - 3} r={2.2} fill={C.white} />
                {/* Blink lid */}
                <AnimatedRect
                  x={EYE.lx - EYE.sclera}
                  y={EYE.cy - EYE.sclera}
                  width={EYE.sclera * 2}
                  fill={C.face}
                  animatedProps={leftLidProps}
                />
              </G>
            )}

            {/* Right eye */}
            <G>
              <Circle cx={EYE.rx} cy={EYE.cy} r={EYE.sclera * cfg.eyeScale} fill={C.white} />
              <Circle cx={EYE.rx} cy={EYE.cy} r={EYE.iris} fill={cfg.iris} />
              {cfg.pupil && (
                <Circle cx={EYE.rx + cfg.pupil.x} cy={EYE.cy + cfg.pupil.y} r={EYE.pupil} fill={C.pupil} />
              )}
              {cfg.pupil && (
                <Circle cx={EYE.rx + cfg.pupil.x + 3} cy={EYE.cy + cfg.pupil.y - 3} r={2.2} fill={C.white} />
              )}
              <AnimatedRect
                x={EYE.rx - EYE.sclera}
                y={EYE.cy - EYE.sclera}
                width={EYE.sclera * 2}
                fill={C.face}
                animatedProps={rightLidProps}
              />
            </G>
          </>
        )}

        {/* Sad eyebrows (wrong mood) */}
        {cfg.brow === 'sad' && (
          <G stroke={C.bodyDark} strokeWidth={4} strokeLinecap="round">
            <Line x1={EYE.lx - 16} y1={EYE.cy - 26} x2={EYE.lx + 14} y2={EYE.cy - 18} />
            <Line x1={EYE.rx + 16} y1={EYE.cy - 26} x2={EYE.rx - 14} y2={EYE.cy - 18} />
          </G>
        )}

        {/* Beak / mouth */}
        {cfg.mouth === 'beak' && <Polygon points="100,112 92,120 108,120" fill={C.beak} />}
        {cfg.mouth === 'tiny' && <Polygon points="100,114 95,119 105,119" fill={C.beak} />}
        {cfg.mouth === 'neutral' && <Polygon points="100,113 94,120 106,120" fill={C.beak} />}
        {cfg.mouth === 'smile' && (
          <>
            <Polygon points="100,110 93,118 107,118" fill={C.beak} />
            <Path d={`M 86 122 Q 100 134 114 122`} stroke={C.beak} strokeWidth={3} fill="none" strokeLinecap="round" />
          </>
        )}
        {cfg.mouth === 'frown' && (
          <>
            <Polygon points="100,112 93,120 107,120" fill={C.beak} />
            <Path d={`M 88 130 Q 100 120 112 130`} stroke={C.beak} strokeWidth={3} fill="none" strokeLinecap="round" />
          </>
        )}
      </Svg>
    </Animated.View>
  );
}

/** Static placeholder when SVG isn't needed (kept minimal). */
export default KwagiOwl;
