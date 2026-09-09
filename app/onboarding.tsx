import { showAlert } from '@/lib/alert';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { KwagiOwl } from '@/components/kwagi/KwagiOwl';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Container } from '@/components/ui/Container';
import { useAppStore } from '@/lib/store';
import { useThemeColors } from '@/hooks/useTheme';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

export default function OnboardingScreen() {
  const { settings, updateSettings } = useAppStore();
  const c = useThemeColors();
  const animate = useAnimationsEnabled();
  const [name, setName] = useState(settings.studentName);
  const [course, setCourse] = useState(settings.course);
  const [year, setYear] = useState(settings.yearLevel);
  const [saving, setSaving] = useState(false);
  const finish = async () => { if (saving) return; setSaving(true); try { await updateSettings({ studentName: name.trim(), course: course.trim(), yearLevel: year.trim(), onboardingComplete: true }); router.replace('/'); } catch { showAlert('Could not save setup', 'Your preferences could not be stored. Please try again.'); } finally { setSaving(false); } };
  return <Screen rail={false}><KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, justifyContent: 'center' }} keyboardShouldPersistTaps="handled"><Container>
    <View className="items-center"><KwagiOwl mood="happy" size={150} animate={animate} /><Text className="mt-3 text-3xl font-extrabold text-ink">Meet Kwagi</Text><Text className="mt-2 max-w-[330px] text-center text-md leading-6 text-sub">Your study buddy for notes, flashcards, quizzes, and steady progress in any college course.</Text></View>
    <View className="mt-7 gap-3"><TextInput value={name} onChangeText={setName} accessibilityLabel="Preferred name" placeholder="What should Kwagi call you?" placeholderTextColor={c.muted} className="min-h-12 rounded-card border border-bordersoft bg-surface px-4 text-md text-ink" /><TextInput value={course} onChangeText={setCourse} accessibilityLabel="Course or program" placeholder="Course or program" placeholderTextColor={c.muted} className="min-h-12 rounded-card border border-bordersoft bg-surface px-4 text-md text-ink" /><TextInput value={year} onChangeText={setYear} accessibilityLabel="Year level" placeholder="Year level (optional)" placeholderTextColor={c.muted} className="min-h-12 rounded-card border border-bordersoft bg-surface px-4 text-md text-ink" /><Button label={saving ? 'Saving...' : 'Start studying'} onPress={() => void finish()} disabled={!course.trim() || saving} /></View>
    <Text className="mt-4 text-center text-xs leading-5 text-muted">Your study data stays on this device unless you choose to export a backup.</Text>
  </Container></ScrollView></KeyboardAvoidingView></Screen>;
}
