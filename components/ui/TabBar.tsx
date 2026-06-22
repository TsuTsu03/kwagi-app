import React, { useEffect } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useTheme';
import { useTablet } from '@/hooks/useTablet';

type IconName = keyof typeof Ionicons.glyphMap;

/** Width of the left navigation rail shown on tablets. */
export const RAIL_WIDTH = 92;

/**
 * Minimal shape of the props expo-router passes to a custom `tabBar`.
 * Method shorthand (not arrow properties) keeps parameters bivariant so the
 * fuller React Navigation `BottomTabBarProps` stays structurally assignable.
 */
interface TabBarProps {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  navigation: {
    emit(event: { type: 'tabPress'; target: string; canPreventDefault: boolean }): {
      defaultPrevented: boolean;
    };
    navigate(name: string): void;
  };
}

const TABS: Record<string, { label: string; icon: IconName; center?: boolean }> = {
  index: { label: 'Home', icon: 'home' },
  notes: { label: 'Notes', icon: 'document-text' },
  quiz: { label: 'Quiz', icon: 'school', center: true },
  chat: { label: 'Chat', icon: 'chatbubble-ellipses' },
  progress: { label: 'Progress', icon: 'stats-chart' },
};

export function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { isTablet } = useTablet();
  const { height } = useWindowDimensions();
  const c = useThemeColors();

  const press = (route: { key: string; name: string }, focused: boolean) => () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
  };

  // Tablet: a fixed left rail. It's absolutely positioned from the bottom and
  // sized to the full window height so it spans the screen even though the
  // navigator hands the tab bar a zero-height slot at the bottom.
  if (isTablet) {
    return (
      <View
        className="absolute left-0 bg-surface border-r border-bordersoft items-center"
        style={{
          bottom: 0,
          width: RAIL_WIDTH,
          height,
          paddingTop: insets.top + 18,
          paddingBottom: insets.bottom + 18,
          zIndex: 50,
          shadowColor: c.shadow,
          shadowOpacity: 1,
          shadowRadius: 18,
          shadowOffset: { width: 6, height: 0 },
        }}
      >
        <Text className="font-extrabold tracking-tighter text-xl text-amber">Kw</Text>
        <View className="mt-6 flex-1 justify-center gap-2.5">
          {state.routes.map((route, index) => {
            const meta = TABS[route.name];
            if (!meta) return null;
            return (
              <RailItem
                key={route.key}
                meta={meta}
                focused={state.index === index}
                onPress={press(route, state.index === index)}
              />
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View
      className="border-t border-bordersoft bg-surface"
      style={{
        paddingBottom: Math.max(insets.bottom, 10),
        paddingTop: 10,
        shadowColor: c.shadow,
        shadowOpacity: 1,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: -6 },
      }}
    >
      <View className="w-full flex-row">
        {state.routes.map((route, index) => {
          const meta = TABS[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          if (meta.center) {
            return <CenterItem key={route.key} meta={meta} focused={focused} onPress={press(route, focused)} />;
          }
          return <TabItem key={route.key} meta={meta} focused={focused} onPress={press(route, focused)} />;
        })}
      </View>
    </View>
  );
}

function RailItem({
  meta,
  focused,
  onPress,
}: {
  meta: { label: string; icon: IconName };
  focused: boolean;
  onPress: () => void;
}) {
  const c = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={meta.label}
      accessibilityState={{ selected: focused }}
      className={`w-16 items-center rounded-2xl py-2.5 ${focused ? 'bg-amberdim' : ''}`}
    >
      <Ionicons name={meta.icon} size={24} color={focused ? c.amber : c.muted} />
      <Text className="mt-1 text-xs tracking-tight" style={{ color: focused ? c.amber : c.muted }}>
        {meta.label}
      </Text>
    </Pressable>
  );
}

function TabItem({
  meta,
  focused,
  onPress,
}: {
  meta: { label: string; icon: IconName };
  focused: boolean;
  onPress: () => void;
}) {
  const c = useThemeColors();
  const p = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(focused ? 1 : 0, { duration: 220 });
  }, [focused, p]);

  // Soft glowing pill slides in behind the active icon.
  const pillStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ scale: 0.7 + p.value * 0.3 }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -p.value * 2 }],
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={meta.label}
      accessibilityState={{ selected: focused }}
      className="flex-1 items-center justify-center"
    >
      <View className="h-9 items-center justify-center">
        <Animated.View className="absolute h-9 w-14 rounded-pill bg-amberdim" style={pillStyle} />
        <Animated.View style={iconStyle}>
          <Ionicons name={meta.icon} size={23} color={focused ? c.amber : c.muted} />
        </Animated.View>
      </View>
      <Text className="mt-1 text-xs tracking-tight" style={{ color: focused ? c.amber : c.muted }}>
        {meta.label}
      </Text>
    </Pressable>
  );
}

function CenterItem({
  meta,
  focused,
  onPress,
}: {
  meta: { label: string; icon: IconName };
  focused: boolean;
  onPress: () => void;
}) {
  const c = useThemeColors();
  const p = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(focused ? 1 : 0, { duration: 260 });
  }, [focused, p]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + p.value * 0.06 }],
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={meta.label}
      accessibilityState={{ selected: focused }}
      className="flex-1 items-center"
    >
      <Animated.View
        className="-mt-8 h-16 w-16 items-center justify-center rounded-full border-4 border-bg"
        style={[
          style,
          {
            backgroundColor: c.amber,
            shadowColor: c.amber,
            shadowOpacity: focused ? 0.6 : 0.35,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 },
            elevation: 10,
          },
        ]}
      >
        <Ionicons name={meta.icon} size={28} color={c.bg} />
      </Animated.View>
      <Text className="mt-1 text-xs tracking-tight" style={{ color: focused ? c.amber : c.muted }}>
        {meta.label}
      </Text>
    </Pressable>
  );
}

export default TabBar;
