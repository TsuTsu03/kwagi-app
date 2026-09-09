import { showAlert } from '@/lib/alert';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PressableScale } from '@/components/ui/PressableScale';
import { createFlashcard, deleteFlashcard, listFlashcards, setFlashcardSuspended, updateFlashcard, type Flashcard } from '@/lib/db/flashcards';
import { listSubjects, type SubjectWithCount } from '@/lib/db/notes';
import { useThemeColors } from '@/hooks/useTheme';

export default function CardsScreen() {
  const c = useThemeColors();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [subjects, setSubjects] = useState<SubjectWithCount[]>([]);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'due' | 'paused'>('all');
  const [cardSubjectId, setCardSubjectId] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState(0);
  const [editing, setEditing] = useState<Flashcard | null>(null);
  const [composing, setComposing] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [nextCards, nextSubjects] = await Promise.all([
        listFlashcards({ subjectId, includeSuspended: true }),
        listSubjects(),
      ]);
      setCards(nextCards);
      setLoadedAt(Date.now());
      setSubjects(nextSubjects);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [subjectId]);
  useFocusEffect(useCallback(() => void load(), [load]));

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return cards.filter((card) =>
      (!needle || `${card.front} ${card.back}`.toLowerCase().includes(needle)) &&
      (status === 'all' || (status === 'paused' ? !!card.suspended : !card.suspended && card.next_review <= loadedAt)),
    );
  }, [cards, query, status, loadedAt]);

  const openComposer = (card: Flashcard | null) => {
    setEditing(card);
    setFront(card?.front ?? '');
    setBack(card?.back ?? '');
    setCardSubjectId(card?.subject_id ?? subjectId);
    setComposing(true);
  };

  const save = async () => {
    if (!front.trim() || !back.trim() || saving) return;
    setSaving(true);
    try {
      const subject = subjects.find((item) => item.id === cardSubjectId);
      if (!subject) return;
      if (editing) await updateFlashcard(editing.id, { front: front.trim(), back: back.trim(), subjectId: subject.id, subjectName: subject.name });
      else {
        await createFlashcard({ front: front.trim(), back: back.trim(), subject_id: subject.id, subject: subject.name });
      }
      setComposing(false);
      setEditing(null);
      setFront('');
      setBack('');
      await load();
    } catch {
      showAlert('Could not save card', 'Your card was not changed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateCardList = useCallback(async (action: () => Promise<void>) => {
    try {
      await action();
      await load();
    } catch {
      showAlert('Could not update card', 'Nothing was changed. Please try again.');
    }
  }, [load]);

  return (
    <Screen>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={filtered}
        keyExtractor={(card) => card.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        ListHeaderComponent={
        <Container>
          <View className="mb-4 flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-2xl font-extrabold text-ink">Cards</Text>
              <Text className="mt-1 text-sm text-sub">{loading ? 'Loading your library...' : `${cards.length} cards in this view`} · Search, edit, and review.</Text>
            </View>
            <PressableScale onPress={() => openComposer(null)} accessibilityRole="button" accessibilityLabel="New card" className="h-11 w-11 items-center justify-center rounded-full bg-amber">
              <Ionicons name="add" size={24} color={c.bg} />
            </PressableScale>
          </View>
          {loadError && <Card className="mb-4"><Text className="text-sm text-coral">Cards could not load.</Text><Button label="Try again" variant="secondary" onPress={() => void load()} className="mt-3" /></Card>}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
            <Filter label="All" active={!subjectId} onPress={() => setSubjectId(null)} />
            {subjects.map((subject) => <Filter key={subject.id} label={subject.name} active={subjectId === subject.id} onPress={() => setSubjectId(subject.id)} />)}
          </ScrollView>
          <View className="mb-3 flex-row flex-wrap gap-2">
            <Filter label="All cards" active={status === 'all'} onPress={() => setStatus('all')} />
            <Filter label="Due now" active={status === 'due'} onPress={() => setStatus('due')} />
            <Filter label="Paused" active={status === 'paused'} onPress={() => setStatus('paused')} />
          </View>
          <View className="mb-4 flex-row items-center rounded-card border border-bordersoft bg-surface px-3">
            <Ionicons name="search" size={18} color={c.muted} />
            <TextInput value={query} onChangeText={setQuery} accessibilityLabel="Search cards" placeholder="Search cards" placeholderTextColor={c.muted} className="ml-2 min-h-11 flex-1 text-md text-ink" />
          </View>
          {composing && (
            <Card className="mb-4" glow={c.amber}>
              <Text className="mb-2 text-md font-bold text-ink">{editing ? 'Edit card' : 'New card'}</Text>
              <Text className="mb-2 text-sm font-semibold text-sub">Choose a subject</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
                {subjects.map((subject) => <Filter key={subject.id} label={`Save in ${subject.name}`} active={cardSubjectId === subject.id} onPress={() => { if (!saving) setCardSubjectId(subject.id); }} />)}
              </ScrollView>
              {!subjects.length && <Button label="Create a subject in Notes" variant="secondary" onPress={() => router.navigate('/notes')} className="mb-3" />}
              <TextInput value={front} onChangeText={setFront} editable={!saving} accessibilityLabel="Question or term" placeholder="Question or term" placeholderTextColor={c.muted} multiline className="mb-2 min-h-12 rounded-card border border-bordersoft bg-card p-3 text-md text-ink" />
              <TextInput value={back} onChangeText={setBack} editable={!saving} accessibilityLabel="Answer or definition" placeholder="Answer or definition" placeholderTextColor={c.muted} multiline className="min-h-20 rounded-card border border-bordersoft bg-card p-3 text-md text-ink" />
              <View className="mt-3 flex-row gap-2">
                <Button label={saving ? 'Saving...' : 'Save'} onPress={() => void save()} disabled={saving || !front.trim() || !back.trim() || !cardSubjectId} className="flex-1" />
                <Button label="Cancel" variant="secondary" disabled={saving} onPress={() => setComposing(false)} className="flex-1" />
              </View>
            </Card>
          )}
        </Container>}
        renderItem={({ item: card }) => <Container>
            <Card className="mb-3" style={{ opacity: card.suspended ? 0.58 : 1 }}>
              <View className="flex-row items-start">
                <PressableScale onPress={() => openComposer(card)} accessibilityRole="button" accessibilityLabel={`Edit card: ${card.front}`} className="flex-1">
                  <View>
                    <Text className="text-md font-bold text-ink">{card.front}</Text>
                    <Text className="mt-2 text-sm leading-5 text-sub" numberOfLines={3}>{card.back}</Text>
                    <Text className="mt-2 text-xs text-sub">{card.subject ?? 'Unsorted'} · {card.suspended ? 'Paused' : card.next_review <= loadedAt ? 'Due now' : `Review ${new Date(card.next_review).toLocaleDateString()}`}</Text>
                  </View>
                </PressableScale>
                <View className="ml-2">
                  <PressableScale onPress={() => void updateCardList(() => setFlashcardSuspended(card.id, !card.suspended))} accessibilityRole="button" accessibilityLabel={card.suspended ? 'Resume card' : 'Pause card'} className="ml-2 h-11 w-11 items-center justify-center">
                    <Ionicons name={card.suspended ? 'play-circle-outline' : 'pause-circle-outline'} size={22} color={card.suspended ? c.green : c.muted} />
                  </PressableScale>
                  <PressableScale onPress={() => showAlert('Delete card?', 'This card will be permanently deleted.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => void updateCardList(() => deleteFlashcard(card.id)) },
                  ])} accessibilityRole="button" accessibilityLabel="Delete card" className="ml-2 h-11 w-11 items-center justify-center">
                    <Ionicons name="trash-outline" size={19} color={c.coral} />
                  </PressableScale>
                </View>
              </View>
            </Card>
        </Container>}
        ListEmptyComponent={<Container>
          {!loading && !loadError && !filtered.length && <Card className="py-8"><Text className="text-center text-md font-bold text-ink">{cards.length ? 'No matching cards' : 'Build your first study set'}</Text><Text className="mt-2 text-center text-sm leading-5 text-sub">{cards.length ? 'Try another search or card filter.' : 'Add a question and answer, or turn a note into flashcards.'}</Text><Button label={cards.length ? 'Reset filters' : 'Add a card'} variant="secondary" onPress={() => { if (cards.length) { setQuery(''); setStatus('all'); } else openComposer(null); }} className="mt-4" /></Card>}
        </Container>}
      />
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Filter({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} className={`min-h-11 justify-center rounded-pill border px-3.5 py-2 ${active ? 'border-amber bg-amberdim' : 'border-bordersoft bg-surface'}`}>
      <Text className={`text-sm font-semibold ${active ? 'text-amber' : 'text-sub'}`}>{label}</Text>
    </PressableScale>
  );
}
