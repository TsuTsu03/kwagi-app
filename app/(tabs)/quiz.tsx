import { showAlert } from '@/lib/alert';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { ReviewSession } from '@/components/study/ReviewSession';
import { QuizSession } from '@/components/study/QuizSession';
import { KwagiPrompt } from '@/components/study/KwagiPrompt';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { countDue, listFlashcards } from '@/lib/db/flashcards';
import { useAppStore } from '@/lib/store';
import { inviteLine } from '@/constants/studyLines';
import { listSubjects, type SubjectWithCount } from '@/lib/db/notes';
import { buildQuiz, type StudyQuestion } from '@/lib/quizBuilder';
import { useThemeColors } from '@/hooks/useTheme';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

const SESSION_SIZES = [5, 10, 20];

export default function QuizScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const animate = useAnimationsEnabled();
  const c = useThemeColors();
  const [subjects, setSubjects] = useState<SubjectWithCount[]>([]);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [available, setAvailable] = useState(0);
  const [due, setDue] = useState(0);
  const language = useAppStore((state) => state.settings.dialogueLanguage);
  const [count, setCount] = useState(10);
  const [questions, setQuestions] = useState<StudyQuestion[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [cards, nextSubjects, nextDue] = await Promise.all([listFlashcards({ subjectId }), listSubjects(), countDue()]);
      setAvailable(cards.length);
      setDue(nextDue);
      setSubjects(nextSubjects);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [subjectId]);
  useFocusEffect(useCallback(() => {
    if (params.mode === 'review') {
      setReviewing(true);
      router.setParams({ mode: undefined });
    }
    void load();
  }, [load, params.mode]));

  const start = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const cards = await listFlashcards({ subjectId });
      const next = buildQuiz(cards, Math.min(selectedCount, cards.length));
      if (!next.length) {
        showAlert('More cards needed', 'Add at least two active cards with different answers before starting a quiz.');
        return;
      }
      setQuestions(next);
    } catch {
      showAlert('Quiz could not start', 'Kwagi could not read your cards. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const sessionSizes = useMemo(() => {
    if (available < 2) return [];
    return Array.from(new Set(SESSION_SIZES.map((size) => Math.min(size, available))));
  }, [available]);

  const selectedCount = Math.min(count, sessionSizes.at(-1) ?? count);

  if (reviewing) return <Animated.View entering={animate ? FadeIn.duration(220) : undefined} style={{ flex: 1 }}><ReviewSession onExit={() => { setReviewing(false); void load(); }} /></Animated.View>;
  if (questions.length) return <Animated.View entering={animate ? FadeIn.duration(220) : undefined} style={{ flex: 1 }}><QuizSession key={questions.map((question) => question.flashcardId).join()} questions={questions} onExit={() => { setQuestions([]); void load(); }} onAgain={() => void start()} /></Animated.View>;

  const enter = (delay: number) => (animate ? FadeInDown.delay(delay).springify().damping(16) : undefined);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Container>
          <Text className="font-display text-2xl text-ink">Study</Text>
          <Text className="mb-5 mt-1 font-roundedsoft text-sm text-sub">Short, focused sessions with your own cards.</Text>

          <Animated.View entering={enter(0)}>
            <KwagiPrompt text={loading ? '...' : inviteLine(language, due, available)} mood={due ? 'excited' : available >= 2 ? 'happy' : 'sleepy'} promptKey={`${due}-${available}`} />
          </Animated.View>

          <Animated.View entering={enter(90)}>
            <View className="mb-4 mt-2 rounded-bubble border-2 border-bordersoft bg-surface p-4">
              <View className="flex-row items-center">
                <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: `${c.teal}22` }}><Ionicons name="albums" size={22} color={c.teal} /></View>
                <View className="ml-3 flex-1">
                  <Text className="font-rounded text-md text-ink">Review due cards</Text>
                  <Text className="font-roundedsoft text-sm text-sub">{due ? `${due} ready now · spaced repetition` : 'Nothing due right now'}</Text>
                </View>
              </View>
              <View className="mt-4"><Button label={due ? `Review ${Math.min(due, 20)} cards` : 'Check due cards'} color={c.teal} variant={due ? 'primary' : 'secondary'} onPress={() => setReviewing(true)} icon={<Ionicons name="play" size={18} color={due ? c.bg : c.ink} />} /></View>
            </View>
          </Animated.View>

          <Animated.View entering={enter(180)}>
            <View className="rounded-bubble border-2 border-bordersoft bg-surface p-4">
              <View className="flex-row items-center">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-amberdim"><Ionicons name="game-controller" size={21} color={c.amber} /></View>
                <View className="ml-3 flex-1">
                  <Text className="font-rounded text-md text-ink">Quick quiz</Text>
                  <Text className="font-roundedsoft text-sm text-sub">{loading ? 'Loading cards...' : `Multiple choice from ${available} cards`}</Text>
                </View>
              </View>
              {loadError && <View className="mt-3 rounded-card border border-coral bg-coral/10 p-3"><Text className="text-sm text-coral">Cards could not load.</Text><PressableScale onPress={() => void load()} accessibilityRole="button" className="mt-2 min-h-11 justify-center"><Text className="font-bold text-amber">Try again</Text></PressableScale></View>}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 14, paddingBottom: 4 }}>
                <Filter label="All subjects" active={!subjectId} onPress={() => setSubjectId(null)} />
                {subjects.map((subject) => <Filter key={subject.id} label={subject.name} dot={subject.color ?? undefined} active={subjectId === subject.id} onPress={() => setSubjectId(subject.id)} />)}
              </ScrollView>
              {sessionSizes.length > 0 && (
                <View className="mt-3 flex-row items-center gap-2">
                  <Text className="font-rounded text-xs text-sub">Questions</Text>
                  {sessionSizes.map((size) => <Filter key={size} label={String(size)} active={selectedCount === size} onPress={() => setCount(size)} />)}
                </View>
              )}
              <View className="mt-4"><Button label={starting ? 'Starting...' : `Start ${Math.min(selectedCount, available)}-question quiz`} onPress={() => void start()} disabled={available < 2 || loading || loadError || starting} icon={<Ionicons name="play" size={18} color={c.bg} />} /></View>
            </View>
          </Animated.View>
          {available < 2 && !loading && <PressableScale onPress={() => router.navigate('/cards')} accessibilityRole="button" className="mt-4 min-h-11 justify-center"><Text className="text-center font-rounded text-sm text-amber">Add cards to start a quiz</Text></PressableScale>}
        </Container>
      </ScrollView>
    </Screen>
  );
}

function Filter({ label, active, onPress, dot }: { label: string; active: boolean; onPress: () => void; dot?: string }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} className={`min-h-11 flex-row items-center justify-center rounded-pill border-2 px-3.5 py-2 ${active ? 'border-amber bg-amberdim' : 'border-bordersoft bg-card'}`}>
      {!!dot && <View className="mr-1.5 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dot }} />}
      <Text className={`font-rounded text-sm ${active ? 'text-amber' : 'text-sub'}`}>{label}</Text>
    </PressableScale>
  );
}
