import { showAlert } from '@/lib/alert';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/ui/Screen';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PressableScale } from '@/components/ui/PressableScale';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Flashcards } from '@/components/quiz/Flashcards';
import { KwagiOwl } from '@/components/kwagi/KwagiOwl';
import { useAppStore } from '@/lib/store';
import { listFlashcards } from '@/lib/db/flashcards';
import { listSubjects, type SubjectWithCount } from '@/lib/db/notes';
import { completeQuizSession, type QuizAnswerInput } from '@/lib/db/quiz';
import { buildQuiz, type StudyQuestion } from '@/lib/quizBuilder';
import { useThemeColors } from '@/hooks/useTheme';
import { useStudyTimer } from '@/hooks/useStudyTimer';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

const LETTERS = ['A', 'B', 'C', 'D'];
const SESSION_SIZES = [5, 10, 20];
const XP_PER_CORRECT = 10;

export default function QuizScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const animate = useAnimationsEnabled();
  const c = useThemeColors();
  const [subjects, setSubjects] = useState<SubjectWithCount[]>([]);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [available, setAvailable] = useState(0);
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
      const [cards, nextSubjects] = await Promise.all([listFlashcards({ subjectId }), listSubjects()]);
      setAvailable(cards.length);
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

  if (reviewing) return <Flashcards onExit={() => { setReviewing(false); void load(); }} animate={animate} />;
  if (questions.length) return <PracticeSession questions={questions} animate={animate} onExit={() => { setQuestions([]); void load(); }} />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Container>
          <Text className="text-2xl font-extrabold text-ink">Study</Text>
          <Text className="mb-5 mt-1 text-sm text-sub">Practice any subject using your own cards.</Text>
          <View className="mb-5 items-center"><KwagiOwl mood="happy" size={118} animate={animate} /></View>
          <Card className="mb-4" glow={c.amber}>
            <Text className="text-md font-bold text-ink">Quick quiz</Text>
            <Text className="mt-1 text-sm leading-5 text-sub">Multiple-choice questions built from your card library. {loading ? 'Loading cards...' : `${available} active cards available.`}</Text>
            {loadError && <View className="mt-3 rounded-card border border-coral bg-coral/10 p-3"><Text className="text-sm text-coral">Cards could not load.</Text><PressableScale onPress={() => void load()} accessibilityRole="button" className="mt-2 min-h-11 justify-center"><Text className="font-bold text-amber">Try again</Text></PressableScale></View>}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 14, paddingBottom: 4 }}>
              <Filter label="All subjects" active={!subjectId} onPress={() => setSubjectId(null)} />
              {subjects.map((subject) => <Filter key={subject.id} label={subject.name} active={subjectId === subject.id} onPress={() => setSubjectId(subject.id)} />)}
            </ScrollView>
            <View className="mt-3 flex-row items-center gap-2">
              <Text className="text-xs font-semibold text-sub">Questions</Text>
              {sessionSizes.map((size) => <Filter key={size} label={String(size)} active={selectedCount === size} onPress={() => setCount(size)} />)}
            </View>
            <View className="mt-4"><Button label={starting ? 'Starting...' : `Start ${Math.min(selectedCount, available)}-question quiz`} onPress={() => void start()} disabled={available < 2 || loading || loadError || starting} icon={<Ionicons name="play" size={18} color={c.bg} />} /></View>
          </Card>
          <Card>
            <Text className="text-md font-bold text-ink">Due-card review</Text>
            <Text className="mt-1 text-sm leading-5 text-sub">Review cards with spaced repetition and choose how well you remembered each answer.</Text>
            <View className="mt-4"><Button label="Review due cards" variant="secondary" onPress={() => setReviewing(true)} icon={<Ionicons name="albums-outline" size={18} color={c.ink} />} /></View>
          </Card>
          {available < 2 && <PressableScale onPress={() => router.navigate('/cards')} accessibilityRole="button" className="mt-4"><Text className="text-center text-sm font-semibold text-amber">Add cards to start a quiz</Text></PressableScale>}
        </Container>
      </ScrollView>
    </Screen>
  );
}

function PracticeSession({ questions, animate, onExit }: { questions: StudyQuestion[]; animate: boolean; onExit: () => void }) {
  const c = useThemeColors();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const answers = useRef<QuizAnswerInput[]>([]);
  const timer = useStudyTimer();
  const answerLock = useRef(false);
  const questionStartedAt = useRef(0);
  const saving = useRef(false);
  const [savingResults, setSavingResults] = useState(false);
  const question = questions[index];
  const answered = selected !== null;

  const choose = useCallback((choice: number) => {
    if (answered || answerLock.current) return;
    answerLock.current = true;
    const now = timer.elapsed(Date.now());
    const isCorrect = choice === question.answer;
    setSelected(choice);
    if (isCorrect) setCorrect((value) => value + 1);
    answers.current.push({ flashcardId: question.flashcardId, question: question.question, userAnswer: question.choices[choice], correctAnswer: question.choices[question.answer], isCorrect, timeTakenMs: now - questionStartedAt.current });
    void useAppStore.getState().markStudied().catch(() => undefined);
    void Haptics.notificationAsync(isCorrect ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
  }, [answered, question, timer]);

  const next = useCallback(async () => {
    if (!answerLock.current) return;
    if (index + 1 < questions.length) {
      setIndex((value) => value + 1);
      setSelected(null);
      answerLock.current = false;
      questionStartedAt.current = timer.elapsed(Date.now());
      return;
    }
    if (saving.current) return;
    saving.current = true;
    setSavingResults(true);
    try {
      const seconds = Math.max(1, Math.round(timer.elapsed(Date.now()) / 1000));
      await completeQuizSession(
        { board: null, subject: questions[0]?.subject ?? null, mode: 'practice', total: questions.length, correct, durationSeconds: seconds, answers: answers.current },
        { questionsAnswered: questions.length, correctAnswers: correct, studySeconds: seconds, xp: correct * XP_PER_CORRECT },
      );
      setFinished(true);
    } catch {
      showAlert('Could not save results', 'Your session is still open. Please try again.');
    } finally {
      saving.current = false;
      setSavingResults(false);
    }
  }, [correct, index, questions, timer]);

  if (finished) {
    const percent = Math.round((correct / questions.length) * 100);
    return (
      <Screen><ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}><Container className="items-center">
        <KwagiOwl mood={percent >= 80 ? 'excited' : percent >= 50 ? 'happy' : 'thinking'} size={145} animate={animate} />
        <Text className="mt-4 text-3xl font-extrabold text-ink">{correct}/{questions.length}</Text>
        <Text className="mt-1 text-md text-sub">{percent}% correct · +{correct * XP_PER_CORRECT} XP</Text>
        <Text className="mt-4 text-center text-md leading-6 text-ink">{percent >= 80 ? 'Strong recall. Keep the streak going.' : percent >= 50 ? 'Good start. Review missed cards, then try again.' : 'Review the answers slowly, then test yourself again.'}</Text>
        <View className="mt-6 w-full gap-3"><Button label="Done" onPress={onExit} /><Button label="Review cards" variant="secondary" onPress={() => router.navigate('/cards')} /></View>
      </Container></ScrollView></Screen>
    );
  }

  return (
    <Screen><Container className="flex-1 p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Pressable onPress={() => showAlert('Leave this quiz?', 'Your unfinished answers will not be saved.', [
          { text: 'Keep studying', style: 'cancel' }, { text: 'Leave quiz', style: 'destructive', onPress: onExit },
        ])} disabled={savingResults} accessibilityRole="button" accessibilityLabel="Exit quiz" className="h-11 w-11 items-center justify-center"><Ionicons name="close" size={26} color={c.sub} /></Pressable>
        <Text className="text-sm text-sub">{index + 1} of {questions.length}</Text><View className="w-10" />
      </View>
      <ProgressBar progress={(index + (answered ? 1 : 0)) / questions.length} />
      <ScrollView className="mt-5 flex-1" showsVerticalScrollIndicator={false}>
        <Text className="mb-2 text-xs font-bold uppercase text-teal">{question.subject}</Text>
        <Text className="mb-5 text-lg font-semibold leading-7 text-ink">{question.question}</Text>
        {question.choices.map((choice, choiceIndex) => {
          const isAnswer = choiceIndex === question.answer;
          const picked = choiceIndex === selected;
          const state = answered && isAnswer ? 'border-green bg-green/10' : answered && picked ? 'border-coral bg-coral/10' : 'border-bordersoft bg-surface';
          return <PressableScale key={`${choiceIndex}-${choice}`} onPress={() => choose(choiceIndex)} disabled={answered} accessibilityRole="button" accessibilityLabel={`Choice ${LETTERS[choiceIndex]}: ${choice}`} className={`mb-3 flex-row items-center rounded-card border p-4 ${state}`}>
            <Text className="mr-3 font-bold text-sub">{LETTERS[choiceIndex]}</Text><Text className="flex-1 text-md text-ink">{choice}</Text>
            {answered && isAnswer && <Ionicons name="checkmark-circle" size={21} color={c.green} />}{answered && picked && !isAnswer && <Ionicons name="close-circle" size={21} color={c.coral} />}
          </PressableScale>;
        })}
        {answered && <Card className="mt-2"><Text className="text-xs font-bold text-purple">Correct answer</Text><Text className="mt-1 text-sm leading-5 text-sub">{question.choices[question.answer]}</Text></Card>}
      </ScrollView>
      {answered && <View className="pt-3"><Button label={savingResults ? 'Saving results...' : index + 1 === questions.length ? 'See results' : 'Next question'} disabled={savingResults} onPress={() => void next()} /></View>}
    </Container></Screen>
  );
}

function Filter({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <PressableScale onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} className={`min-h-11 justify-center rounded-pill border px-3 py-2 ${active ? 'border-amber bg-amberdim' : 'border-bordersoft bg-surface'}`}><Text className={`text-sm font-semibold ${active ? 'text-amber' : 'text-sub'}`}>{label}</Text></PressableScale>;
}
