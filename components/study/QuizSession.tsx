import { useCallback, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { showAlert } from '@/lib/alert';
import { Screen } from '@/components/ui/Screen';
import { Container } from '@/components/ui/Container';
import { StudyHeader } from '@/components/study/StudyHeader';
import { KwagiPrompt } from '@/components/study/KwagiPrompt';
import { ChoiceBubble, type ChoiceState } from '@/components/study/ChoiceBubble';
import { FeedbackSheet } from '@/components/study/FeedbackSheet';
import { SessionComplete, type SessionAction } from '@/components/study/SessionComplete';
import { ANSWER_LABEL, studyLine } from '@/constants/studyLines';
import { completeQuizSession, type QuizAnswerInput } from '@/lib/db/quiz';
import type { StudyQuestion } from '@/lib/quizBuilder';
import { useAppStore } from '@/lib/store';
import { playSound } from '@/lib/sounds';
import { useThemeColors } from '@/hooks/useTheme';
import { useStudyTimer } from '@/hooks/useStudyTimer';
import { useFocusMode } from '@/hooks/useFocusMode';

const LETTERS = ['A', 'B', 'C', 'D'];
export const XP_PER_CORRECT = 10;

/** Ask the same questions again with the choices in a new order. */
function reshuffle(questions: StudyQuestion[]): StudyQuestion[] {
  return questions.map((question) => {
    const answer = question.choices[question.answer];
    const choices = [...question.choices].sort(() => Math.random() - 0.5);
    return { ...question, choices, answer: choices.indexOf(answer) };
  });
}

interface Props {
  questions: StudyQuestion[];
  onExit: () => void;
  /** Start a fresh quiz with new questions. */
  onAgain?: () => void;
}

export function QuizSession({ questions: initial, onExit, onAgain }: Props) {
  useFocusMode();
  const c = useThemeColors();
  const language = useAppStore((state) => state.settings.dialogueLanguage);
  const [questions, setQuestions] = useState(initial);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [missed, setMissed] = useState<StudyQuestion[]>([]);
  const [finished, setFinished] = useState(false);
  const [savingResults, setSavingResults] = useState(false);
  const [line, setLine] = useState('');
  const answers = useRef<QuizAnswerInput[]>([]);
  const timer = useStudyTimer();
  const answerLock = useRef(false);
  const questionStartedAt = useRef(0);
  const saving = useRef(false);
  const question = questions[index];
  const answered = selected !== null;
  const isCorrect = answered && selected === question.answer;

  const choose = useCallback((choice: number) => {
    if (answerLock.current) return;
    answerLock.current = true;
    const now = timer.elapsed(Date.now());
    const right = choice === question.answer;
    setSelected(choice);
    if (right) {
      const nextCombo = combo + 1;
      setCorrect((value) => value + 1);
      setCombo(nextCombo);
      setBestCombo((value) => Math.max(value, nextCombo));
      setLine(nextCombo >= 3 ? `${nextCombo} ${studyLine(language, 'streak')}` : studyLine(language, 'correct'));
    } else {
      setCombo(0);
      setMissed((value) => [...value, question]);
      setLine(studyLine(language, 'wrong'));
    }
    playSound(right ? 'correct' : 'wrong');
    answers.current.push({ flashcardId: question.flashcardId, question: question.question, userAnswer: question.choices[choice], correctAnswer: question.choices[question.answer], isCorrect: right, timeTakenMs: now - questionStartedAt.current });
    void useAppStore.getState().markStudied().catch(() => undefined);
    void Haptics.notificationAsync(right ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
  }, [combo, language, question, timer]);

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

  const restartWith = useCallback((next: StudyQuestion[]) => {
    answers.current = [];
    answerLock.current = false;
    questionStartedAt.current = timer.elapsed(Date.now());
    setQuestions(reshuffle(next));
    setIndex(0);
    setSelected(null);
    setCorrect(0);
    setCombo(0);
    setBestCombo(0);
    setMissed([]);
    setFinished(false);
  }, [timer]);

  const retryMissed = useCallback(() => restartWith(missed), [missed, restartWith]);

  const leave = () => {
    if (index === 0 && !answered) { onExit(); return; }
    showAlert('Leave this quiz?', 'Your unfinished answers will not be saved.', [
      { text: 'Keep studying', style: 'cancel' }, { text: 'Leave quiz', style: 'destructive', onPress: onExit },
    ]);
  };

  if (finished) {
    const percent = Math.round((correct / questions.length) * 100);
    const again: SessionAction | null = onAgain ? { label: 'Another round', icon: 'play', onPress: onAgain } : null;
    const done: SessionAction = { label: 'Done', onPress: onExit };
    return (
      <SessionComplete
        mood={percent >= 80 ? 'excited' : percent >= 50 ? 'happy' : 'thinking'}
        title={percent === 100 ? 'Perfect round!' : percent >= 80 ? 'Great recall!' : percent >= 50 ? 'Nice progress!' : 'Good practice!'}
        message={missed.length ? 'Practice the ones you missed while they are fresh.' : 'Every answer was right. Keep the momentum going.'}
        stats={[
          { icon: 'checkmark-circle', label: 'Correct', value: correct, format: (n) => `${n}/${questions.length}`, tint: c.green },
          { icon: 'pie-chart', label: 'Accuracy', value: percent, format: (n) => `${n}%`, tint: c.teal },
          { icon: 'flame', label: 'Best streak', value: bestCombo, tint: c.amber },
        ]}
        primary={missed.length ? { label: `Practice ${missed.length} missed`, icon: 'refresh', onPress: retryMissed } : again ?? done}
        secondary={missed.length ? (again ? [again, done] : [done]) : again ? [done] : []}
        celebrate={percent >= 50}
      />
    );
  }

  const choiceState = (choiceIndex: number): ChoiceState => {
    if (!answered) return 'idle';
    if (choiceIndex === question.answer) return 'correct';
    if (choiceIndex === selected) return 'wrong';
    return 'dimmed';
  };

  return (
    <Screen>
      <View className="flex-1">
        <Container className="flex-1 px-4 pt-2">
          <StudyHeader progress={(index + (answered ? 1 : 0)) / questions.length} label={`${index + 1} / ${questions.length}`} combo={combo} onClose={leave} closeLabel="Exit quiz" disabled={savingResults} />
          <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: 12, paddingBottom: answered ? 220 : 24 }} showsVerticalScrollIndicator={false}>
            <KwagiPrompt eyebrow={question.subject} text={question.question} mood={!answered ? 'thinking' : isCorrect ? 'correct' : 'wrong'} promptKey={`${index}-${questions.length}`} />
            <Text className="mb-3 mt-5 font-rounded text-sm text-sub">{answered ? ' ' : 'Choose the answer'}</Text>
            {question.choices.map((choice, choiceIndex) => (
              <ChoiceBubble
                key={`${index}-${choiceIndex}-${choice}`}
                letter={LETTERS[choiceIndex]}
                text={choice}
                state={choiceState(choiceIndex)}
                disabled={answered}
                onPress={() => choose(choiceIndex)}
                accessibilityLabel={`Choice ${LETTERS[choiceIndex]}: ${choice}`}
              />
            ))}
          </ScrollView>
        </Container>
        {answered && (
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
            <Container>
              <FeedbackSheet
                correct={isCorrect}
                title={line}
                detailLabel={isCorrect ? undefined : ANSWER_LABEL[language]}
                detail={isCorrect ? undefined : question.choices[question.answer]}
                actionLabel={savingResults ? 'Saving...' : index + 1 === questions.length ? 'See results' : 'Continue'}
                onContinue={() => void next()}
                busy={savingResults}
              />
            </Container>
          </View>
        )}
      </View>
    </Screen>
  );
}
