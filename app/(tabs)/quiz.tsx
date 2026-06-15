import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KwagiOwl } from '@/components/kwagi/KwagiOwl';
import { KwagiSpeech } from '@/components/kwagi/KwagiSpeech';
import { Screen } from '@/components/ui/Screen';
import { FadeIn } from '@/components/ui/FadeIn';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Flashcards } from '@/components/quiz/Flashcards';
import { useAppStore } from '@/lib/store';
import { BOARDS } from '@/constants/boards';
import { SEED_QUESTIONS, type SeedQuestion } from '@/constants/questions';
import { randomDialogue } from '@/constants/dialogues';
import { useKwagiMood } from '@/hooks/useKwagiMood';
import { recordStudy } from '@/lib/db/progress';
import { saveQuizSession, type QuizAnswerInput } from '@/lib/db/quiz';
import { useThemeColors } from '@/hooks/useTheme';

const LETTERS = ['A', 'B', 'C', 'D'];
const XP_PER_CORRECT = 10;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Mode = 'setup' | 'practice' | 'done';

export default function QuizScreen() {
  const { settings } = useAppStore();
  const c = useThemeColors();
  const [mode, setMode] = useState<Mode>('setup');
  const [showFlashcards, setShowFlashcards] = useState(false);

  if (showFlashcards) {
    return <Flashcards onExit={() => setShowFlashcards(false)} animate={settings.kwagiAnimations} />;
  }

  if (mode === 'practice' || mode === 'done') {
    return (
      <PracticeSession
        board={settings.activeBoard}
        animate={settings.kwagiAnimations}
        onExit={() => setMode('setup')}
      />
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <FadeIn index={0}>
          <Text className="mb-1 text-2xl font-extrabold tracking-tighter text-ink">Quiz Time</Text>
          <Text className="mb-5 text-sm text-sub">Subukan natin kung gaano ka na ka-handa.</Text>
        </FadeIn>

        <FadeIn index={1}>
          <View className="mb-5 items-center">
            <KwagiOwl mood="happy" size={128} animate={settings.kwagiAnimations} />
          </View>
        </FadeIn>

        <FadeIn index={2}>
          <Card elevated className="mb-4" glow={c.amber}>
            <View className="flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-amberdim">
                <Ionicons name="rocket" size={20} color={c.amber} />
              </View>
              <Text className="ml-3 text-md font-bold tracking-tight text-ink">Practice Mode</Text>
            </View>
            <Text className="mt-2 text-sm text-sub leading-5">
              {BOARDS[settings.activeBoard].name} — random questions with instant feedback at explanation.
            </Text>
            <View className="mt-4">
              <Button label="Start Practice" onPress={() => setMode('practice')} icon={<Ionicons name="play" size={18} color={c.bg} />} />
            </View>
          </Card>
        </FadeIn>

        <FadeIn index={3}>
          <Card elevated>
            <View className="flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${c.teal}1F` }}>
                <Ionicons name="albums" size={20} color={c.teal} />
              </View>
              <Text className="ml-3 text-md font-bold tracking-tight text-ink">Flashcards (Review)</Text>
            </View>
            <Text className="mt-2 text-sm text-sub leading-5">
              Flip cards na due ngayon. SM-2 spaced repetition.
            </Text>
            <View className="mt-4">
              <Button
                label="Review Due Cards"
                variant="secondary"
                onPress={() => setShowFlashcards(true)}
                icon={<Ionicons name="albums-outline" size={18} color={c.ink} />}
              />
            </View>
          </Card>
        </FadeIn>
      </ScrollView>
    </Screen>
  );
}

function PracticeSession({
  board,
  animate,
  onExit,
}: {
  board: keyof typeof BOARDS;
  animate: boolean;
  onExit: () => void;
}) {
  const questions = useMemo<SeedQuestion[]>(() => {
    const byBoard = SEED_QUESTIONS.filter((q) => q.board === board);
    const pool = byBoard.length >= 5 ? byBoard : SEED_QUESTIONS;
    return shuffle(pool).slice(0, 10);
  }, [board]);

  const c = useThemeColors();
  const { mood, flash, setBase } = useKwagiMood('thinking');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [bubble, setBubble] = useState('Anong sagot? Isipin natin... 🤔');
  const startedAt = useRef(Date.now());
  const qStartedAt = useRef(Date.now());
  const answers = useRef<QuizAnswerInput[]>([]);

  const q = questions[index];
  const answered = selected !== null;

  const onSelect = useCallback(
    (choiceIdx: number) => {
      if (answered) return;
      const isCorrect = choiceIdx === q.answer;
      setSelected(choiceIdx);
      useAppStore.getState().markStudied();
      answers.current.push({
        question: q.question,
        userAnswer: q.choices[choiceIdx],
        correctAnswer: q.choices[q.answer],
        isCorrect,
        timeTakenMs: Date.now() - qStartedAt.current,
      });
      if (isCorrect) {
        setCorrectCount((prev) => prev + 1);
        flash('correct', 3000);
        setBubble(randomDialogue('correct'));
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        flash('wrong', 3000);
        setBubble(randomDialogue('wrong'));
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [answered, q, flash],
  );

  const next = useCallback(async () => {
    if (index + 1 >= questions.length) {
      // Finish: persist stats + session.
      const correct = correctCount;
      const durationSeconds = Math.round((Date.now() - startedAt.current) / 1000);
      await recordStudy({
        questionsAnswered: questions.length,
        correctAnswers: correct,
        studySeconds: durationSeconds,
        xp: correct * XP_PER_CORRECT,
      });
      await saveQuizSession({
        board,
        subject: null,
        mode: 'practice',
        total: questions.length,
        correct,
        durationSeconds,
        answers: answers.current,
      });
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
      setBase('thinking');
      setBubble('Next! Anong sagot dito? 🤔');
      qStartedAt.current = Date.now();
    }
  }, [index, questions.length, correctCount, board, setBase]);

  if (finished) {
    const pct = Math.round((correctCount / questions.length) * 100);
    const great = pct >= 80;
    const ok = pct >= 50;
    return (
      <Screen>
        <ScrollView contentContainerStyle={{ padding: 16, alignItems: 'center' }}>
          <KwagiOwl mood={great ? 'excited' : ok ? 'happy' : 'wrong'} size={150} animate={animate} />
          <Text className="mt-4 text-3xl font-extrabold tracking-tighter text-ink">{correctCount}/{questions.length}</Text>
          <Text className="text-md text-sub">{pct}% correct</Text>
          <View className="mt-3 flex-row items-center rounded-pill bg-amberdim px-4 py-2">
            <Ionicons name="flash" size={16} color={c.amber} />
            <Text className="ml-1.5 font-bold text-amber">+{correctCount * XP_PER_CORRECT} XP</Text>
          </View>
          <Text className="mt-4 text-center text-md text-ink leading-6">
            {great
              ? 'Grabe! Board passer vibes talaga! 🎉'
              : ok
                ? 'Ayos! Tuloy-tuloy lang ang review. 💪'
                : 'Okay lang yan! Balikan natin yung mahihirap. 🦉'}
          </Text>
          <View className="mt-6 w-full gap-3">
            <Button label="Try Again" onPress={onExit} />
            <Button label="Back to Home" variant="secondary" onPress={() => router.navigate('/')} />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-1 p-4">
        {/* Top bar */}
        <View className="mb-3 flex-row items-center justify-between">
          <Pressable onPress={onExit} accessibilityRole="button" accessibilityLabel="Exit quiz" className="h-10 w-10 items-center justify-center">
            <Ionicons name="close" size={26} color={c.sub} />
          </Pressable>
          <Text className="text-sm text-sub">
            Q {index + 1} of {questions.length}
          </Text>
          <View className="w-10" />
        </View>
        <ProgressBar progress={(index + (answered ? 1 : 0)) / questions.length} />

        <ScrollView className="mt-4 flex-1" showsVerticalScrollIndicator={false}>
          <View className="mb-3 flex-row gap-2">
            <Badge label={q.board} color={BOARDS[q.board].color} />
            <Badge label={q.subject} color={c.sub} />
          </View>

          <Text className="mb-5 text-lg font-semibold tracking-tight text-ink leading-6">{q.question}</Text>

          {q.choices.map((choice, i) => {
            const isAnswer = i === q.answer;
            const isPicked = i === selected;
            let cls = 'border-bordersoft bg-surface';
            let badgeCls = 'border-border';
            let badgeText = 'text-sub';
            if (answered && isAnswer) {
              cls = 'border-green bg-green/10';
              badgeCls = 'border-green bg-green';
              badgeText = 'text-bg';
            } else if (answered && isPicked && !isAnswer) {
              cls = 'border-coral bg-coral/10';
              badgeCls = 'border-coral bg-coral';
              badgeText = 'text-bg';
            }
            return (
              <Pressable
                key={i}
                onPress={() => onSelect(i)}
                disabled={answered}
                accessibilityRole="button"
                accessibilityLabel={`Choice ${LETTERS[i]}: ${choice}`}
                className={`mb-3 flex-row items-center rounded-card border p-4 ${cls}`}
              >
                <View className={`mr-3 h-7 w-7 items-center justify-center rounded-full border ${badgeCls}`}>
                  <Text className={`text-sm font-bold ${badgeText}`}>{LETTERS[i]}</Text>
                </View>
                <Text className="flex-1 text-md text-ink">{choice}</Text>
                {answered && isAnswer && <Ionicons name="checkmark-circle" size={22} color={c.green} />}
                {answered && isPicked && !isAnswer && <Ionicons name="close-circle" size={22} color={c.coral} />}
              </Pressable>
            );
          })}

          {answered && (
            <View className="mt-1 flex-row items-start">
              <KwagiOwl mood={mood} size={76} animate={animate} />
              <View className="ml-1 flex-1">
                <KwagiSpeech text={bubble} />
                <View className="mt-2 rounded-card border border-bordersoft bg-card p-3">
                  <View className="flex-row items-center">
                    <Ionicons name="bulb" size={14} color={c.purple} />
                    <Text className="ml-1 text-xs font-bold tracking-tight text-purple">Explain</Text>
                  </View>
                  <Text className="mt-1 text-sm text-sub leading-5">{q.explanation}</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {answered && (
          <View className="pt-3">
            <Button label={index + 1 >= questions.length ? 'See Results' : 'Next Question'} onPress={next} />
          </View>
        )}
      </View>
    </Screen>
  );
}
