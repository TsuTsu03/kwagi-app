import React, { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
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
  withTiming,
} from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useTheme';

const AnimatedG = Animated.createAnimatedComponent(G);

/** Deterministic pseudo-random so the sky is stable across renders. */
function seeded(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// Sky gradients tuned to read as a real sky, not a flat fill.
const NIGHT_SKY = ['#16203F', '#0B1124', '#05070F'];
const DAY_SKY = ['#BFE0FB', '#DCE9F7', '#F3EEE8', '#FCEFD6'];

interface Star {
  cx: number;
  cy: number;
  r: number;
  o: number;
  twinkle: boolean;
}

/**
 * Full-screen atmospheric backdrop that mirrors Kwagi's nocturnal nature:
 *
 *  • Dark  → a midnight sky: deep blue gradient, a glowing moon, and a
 *            field of stars (some softly twinkling). The owl is awake.
 *  • Light → a sunny day: soft blue-to-warm sky, a glowing sun with rays,
 *            and a few slowly drifting clouds.
 *
 * Render once behind each screen's content.
 */
export function Ambiance({ animate = true }: { animate?: boolean }) {
  const { width, height } = useWindowDimensions();
  const c = useThemeColors();
  const isDay = !c.stars;

  const moonX = width * 0.78;
  const moonY = height * 0.13;

  const stars = useMemo<Star[]>(() => {
    if (isDay) return [];
    const out: Star[] = [];
    for (let i = 0; i < 70; i++) {
      const r = 0.5 + seeded(i + 13) * 1.6;
      out.push({
        cx: seeded(i + 1) * width,
        cy: seeded(i + 7) * height * 0.7,
        r,
        o: 0.25 + seeded(i + 23) * 0.6,
        twinkle: seeded(i + 31) > 0.78,
      });
    }
    return out;
  }, [isDay, width, height]);

  const staticStars = stars.filter((s) => !s.twinkle);
  const twinkleStars = stars.filter((s) => s.twinkle);

  // Celestial halo pulse + star twinkle.
  const halo = useSharedValue(0.7);
  const twinkle = useSharedValue(0.4);

  useEffect(() => {
    if (!animate) {
      halo.value = 0.7;
      twinkle.value = 0.7;
      return;
    }
    halo.value = withRepeat(
      withSequence(
        withTiming(0.95, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    twinkle.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [animate, halo, twinkle]);

  const haloProps = useAnimatedProps(() => ({ opacity: halo.value }));
  const twinkleProps = useAnimatedProps(() => ({ opacity: twinkle.value }));

  const sky = isDay ? DAY_SKY : NIGHT_SKY;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            {sky.map((color, i) => (
              <Stop key={i} offset={`${i / (sky.length - 1)}`} stopColor={color} />
            ))}
          </LinearGradient>
          <RadialGradient id="celestialGlow" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={isDay ? '#FFE6A8' : '#CFE0FF'} stopOpacity={isDay ? '0.55' : '0.35'} />
            <Stop offset="1" stopColor={isDay ? '#FFE6A8' : '#CFE0FF'} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Sky */}
        <Rect x="0" y="0" width={width} height={height} fill="url(#sky)" />

        {/* Stars (night only) */}
        {!isDay && (
          <>
            <G>
              {staticStars.map((s, i) => (
                <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#FFFFFF" opacity={s.o} />
              ))}
            </G>
            <AnimatedG animatedProps={twinkleProps}>
              {twinkleStars.map((s, i) => (
                <Circle key={i} cx={s.cx} cy={s.cy} r={s.r + 0.3} fill="#FFFFFF" opacity={s.o} />
              ))}
            </AnimatedG>
          </>
        )}

        {/* Celestial halo */}
        <AnimatedG animatedProps={haloProps}>
          <Circle cx={moonX} cy={moonY} r={130} fill="url(#celestialGlow)" />
        </AnimatedG>

        {isDay ? (
          // Sun + rays
          <>
            <G stroke="#FFD27A" strokeWidth={3} strokeLinecap="round" opacity={0.7}>
              {Array.from({ length: 12 }).map((_, i) => {
                const a = (i / 12) * Math.PI * 2;
                const r1 = 40;
                const r2 = 56;
                return (
                  <Line
                    key={i}
                    x1={moonX + Math.cos(a) * r1}
                    y1={moonY + Math.sin(a) * r1}
                    x2={moonX + Math.cos(a) * r2}
                    y2={moonY + Math.sin(a) * r2}
                  />
                );
              })}
            </G>
            <Circle cx={moonX} cy={moonY} r={30} fill="#FFCF6B" />
            <Circle cx={moonX} cy={moonY} r={30} fill="#FFE39B" opacity={0.5} />
          </>
        ) : (
          // Moon with soft phase shading + a few craters
          <>
            <Circle cx={moonX} cy={moonY} r={32} fill="#FBF4DC" />
            <Circle cx={moonX + 11} cy={moonY - 6} r={28} fill="#0B1124" opacity={0.16} />
            <Circle cx={moonX - 9} cy={moonY + 4} r={4} fill="#D9CFA8" opacity={0.5} />
            <Circle cx={moonX + 3} cy={moonY + 12} r={3} fill="#D9CFA8" opacity={0.45} />
            <Circle cx={moonX - 4} cy={moonY - 10} r={2.4} fill="#D9CFA8" opacity={0.4} />
          </>
        )}
      </Svg>

      {/* Drifting clouds overlay */}
      {isDay ? (
        <>
          <DriftCloud x={width * 0.08} y={height * 0.1} scale={1.1} color="#FFFFFF" opacity={0.92} animate={animate} range={10} delay={0} />
          <DriftCloud x={width * 0.52} y={height * 0.05} scale={0.8} color="#FFFFFF" opacity={0.8} animate={animate} range={14} delay={1200} />
          <DriftCloud x={width * 0.3} y={height * 0.26} scale={0.95} color="#FFFFFF" opacity={0.7} animate={animate} range={8} delay={600} />
        </>
      ) : (
        <>
          <DriftCloud x={width * 0.05} y={height * 0.22} scale={1.2} color="#0F1730" opacity={0.5} animate={animate} range={12} delay={0} />
          <DriftCloud x={width * 0.55} y={height * 0.32} scale={0.85} color="#0F1730" opacity={0.4} animate={animate} range={16} delay={900} />
        </>
      )}
    </View>
  );
}

/** A soft puffy cloud (overlapping ellipses) that gently sways sideways. */
function DriftCloud({
  x,
  y,
  scale,
  color,
  opacity,
  animate,
  range,
  delay,
}: {
  x: number;
  y: number;
  scale: number;
  color: string;
  opacity: number;
  animate: boolean;
  range: number;
  delay: number;
}) {
  const drift = useSharedValue(0);

  useEffect(() => {
    if (!animate) {
      drift.value = 0;
      return;
    }
    drift.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
          withTiming(-1, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );
  }, [animate, drift, delay]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: drift.value * range }],
  }));

  const w = 140 * scale;
  const h = 60 * scale;

  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y, width: w, height: h, opacity }, style]}>
      <Svg width={w} height={h} viewBox="0 0 140 60">
        <Ellipse cx={45} cy={38} rx={32} ry={20} fill={color} />
        <Ellipse cx={78} cy={30} rx={30} ry={24} fill={color} />
        <Ellipse cx={104} cy={40} rx={26} ry={17} fill={color} />
        <Ellipse cx={70} cy={46} rx={50} ry={14} fill={color} />
      </Svg>
    </Animated.View>
  );
}

export default Ambiance;
