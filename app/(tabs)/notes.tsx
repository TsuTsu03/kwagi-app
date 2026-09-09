import { showAlert } from '@/lib/alert';
import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  BackHandler,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PressableScale } from '@/components/ui/PressableScale';
import { IconBadge, safeIcon } from '@/components/ui/IconBadge';
import {
  createNote,
  createSubject,
  deleteNote,
  deleteSubject,
  listNotes,
  listSubjects,
  saveNoteWithCards,
  togglePin,
  updateNote,
  type Note,
  type SubjectWithCount,
} from '@/lib/db/notes';
import { generateFlashcards } from '@/lib/flashcardGenerator';
import { useThemeColors } from '@/hooks/useTheme';

type NotesView = 'subjects' | 'notes' | 'editor';
const SUBJECT_COLORS = ['#2DD4BF', '#F5A623', '#A78BFA', '#60A5FA', '#F472B6', '#34D399'];

export default function NotesScreen() {
  const c = useThemeColors();
  const [view, setView] = useState<NotesView>('subjects');
  const [subjects, setSubjects] = useState<SubjectWithCount[]>([]);
  const [activeSubject, setActiveSubject] = useState<SubjectWithCount | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [editing, setEditing] = useState<Note | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [addingSubject, setAddingSubject] = useState(false);
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [subjectBusy, setSubjectBusy] = useState(false);

  const refreshSubjects = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try { setSubjects(await listSubjects()); }
    catch { setLoadError(true); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => void refreshSubjects(), [refreshSubjects]));

  const openSubject = useCallback(async (subject: SubjectWithCount) => {
    try {
      setActiveSubject(subject);
      setNotes(await listNotes(subject.id));
      setQuery('');
      setView('notes');
    } catch {
      showAlert('Could not open subject', 'Your notes are still on this device. Please try again.');
    }
  }, []);

  const filteredNotes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return notes;
    return notes.filter((note) =>
      `${note.title} ${note.content} ${note.tags.join(' ')}`.toLowerCase().includes(needle),
    );
  }, [notes, query]);

  const addSubject = useCallback(async () => {
    const name = subjectName.trim();
    if (!name || subjectBusy) return;
    setSubjectBusy(true);
    const color = SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length];
    try {
      await createSubject({ name, color, icon: 'library' });
      setSubjectName('');
      setAddingSubject(false);
      await refreshSubjects();
    } catch {
      showAlert('Could not add subject', 'Nothing was changed. Please try again.');
    } finally {
      setSubjectBusy(false);
    }
  }, [refreshSubjects, subjectBusy, subjectName, subjects.length]);

  const openEditor = useCallback((note: Note | null) => {
    setEditing(note);
    setTitle(note?.title ?? '');
    setContent(note?.content ?? '');
    setView('editor');
  }, []);

  const hasDraft = title !== (editing?.title ?? '') || content !== (editing?.content ?? '');
  const generatedPreview = useMemo(() => generateFlashcards(content), [content]);
  const leaveEditor = useCallback(() => {
    if (saving) return;
    if (!hasDraft) { setView('notes'); return; }
    showAlert('Discard unsaved changes?', 'Save your note first if you want to keep these changes.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => setView('notes') },
    ]);
  }, [hasDraft, saving]);
  useFocusEffect(useCallback(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (view === 'editor') { leaveEditor(); return true; }
      if (view === 'notes') { setView('subjects'); return true; }
      return false;
    });
    return () => listener.remove();
  }, [leaveEditor, view]));

  const updateNotes = useCallback(async (action: () => Promise<void>) => {
    if (!activeSubject) return;
    try {
      await action();
      setNotes(await listNotes(activeSubject.id));
      await refreshSubjects();
    } catch {
      showAlert('Could not update notes', 'Nothing was changed. Please try again.');
    }
  }, [activeSubject, refreshSubjects]);

  const updateSubjects = useCallback(async (action: () => Promise<void>) => {
    try { await action(); await refreshSubjects(); }
    catch { showAlert('Could not update subjects', 'Nothing was changed. Please try again.'); }
  }, [refreshSubjects]);

  const confirmDeleteSubject = useCallback((subject: SubjectWithCount) => {
    showAlert('Delete subject?', `“${subject.name}”, its notes, and its cards will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void updateSubjects(() => deleteSubject(subject.id)) },
    ]);
  }, [updateSubjects]);

  const persistEditor = useCallback(async (makeCards: boolean) => {
    if (!activeSubject || saving) return;
    setSaving(true);
    try {
      const cleanTitle = title.trim() || 'Untitled note';
      if (makeCards) {
        const generated = generateFlashcards(content);
        if (!generated.length) {
          showAlert('No cards found', 'Use “term :: definition”, “term: definition”, or Q:/A: lines in your note.');
          return;
        }
        const result = await saveNoteWithCards({ noteId: editing?.id, subjectId: activeSubject.id, subjectName: activeSubject.name, title: cleanTitle, content, cards: generated });
        showAlert(result.cardsCreated ? 'Cards created' : 'Cards already up to date', result.cardsCreated ? `${result.cardsCreated} cards added to ${activeSubject.name}.` : 'No duplicate cards were added.');
      } else if (editing?.id) {
        await updateNote(editing.id, { title: cleanTitle, content });
      } else {
        await createNote({ subject_id: activeSubject.id, title: cleanTitle, content });
      }
      setNotes(await listNotes(activeSubject.id));
      await refreshSubjects();
      setView('notes');
    } catch {
      showAlert('Could not save', 'Your note was not changed. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [activeSubject, content, editing, refreshSubjects, saving, title]);

  if (view === 'editor') {
    return (
      <Screen>
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Container className="flex-1 p-4">
            <View className="mb-3 flex-row items-center">
              <PressableScale onPress={leaveEditor} disabled={saving} accessibilityRole="button" accessibilityLabel="Back to notes" className="h-11 w-11 items-center justify-center">
                <Ionicons name="chevron-back" size={25} color={c.sub} />
              </PressableScale>
              <Text className="ml-1 flex-1 text-xl font-extrabold text-ink">{editing ? 'Edit note' : 'New note'}</Text>
            </View>
            <TextInput value={title} onChangeText={setTitle} editable={!saving} accessibilityLabel="Note title" placeholder="Note title" placeholderTextColor={c.muted} className="mb-3 rounded-card border border-bordersoft bg-surface px-4 py-3 text-lg font-bold text-ink" />
            <TextInput
              value={content}
              onChangeText={setContent}
              editable={!saving}
              accessibilityLabel="Note content"
              placeholder={'Write your notes...\n\nCard examples:\nTerm :: Definition\nQ: Question\nA: Answer'}
              placeholderTextColor={c.muted}
              multiline
              textAlignVertical="top"
              className="min-h-[120px] flex-1 rounded-card border border-bordersoft bg-surface p-4 text-md leading-6 text-ink"
            />
            <Text accessibilityLiveRegion="polite" className="mt-3 text-xs leading-5 text-sub">
              {generatedPreview.length ? `${generatedPreview.length} card pairs detected. Save + cards adds new pairs without duplicates.` : 'To make cards, write one Term :: Definition pair per line.'}
            </Text>
            <View className="mt-3 flex-row gap-2">
              <Button label={saving ? 'Saving...' : 'Save'} disabled={saving} onPress={() => void persistEditor(false)} className="flex-1" />
              <Button label="Save + cards" disabled={saving || !generatedPreview.length} variant="secondary" onPress={() => void persistEditor(true)} className="flex-1" />
            </View>
          </Container>
        </KeyboardAvoidingView>
      </Screen>
    );
  }

  if (view === 'notes' && activeSubject) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Container>
            <View className="mb-4 flex-row items-center">
              <PressableScale onPress={() => setView('subjects')} accessibilityRole="button" accessibilityLabel="Back to subjects" className="h-11 w-11 items-center justify-center">
                <Ionicons name="chevron-back" size={25} color={c.sub} />
              </PressableScale>
              <View className="ml-1 flex-1">
                <Text className="text-xl font-extrabold text-ink">{activeSubject.name}</Text>
                <Text className="text-sm text-sub">{notes.length} {notes.length === 1 ? 'note' : 'notes'}</Text>
              </View>
              <PressableScale onPress={() => openEditor(null)} accessibilityRole="button" accessibilityLabel="New note" className="h-11 w-11 items-center justify-center rounded-full bg-amber">
                <Ionicons name="add" size={24} color={c.bg} />
              </PressableScale>
            </View>
            <View className="mb-4 flex-row items-center rounded-card border border-bordersoft bg-surface px-3">
              <Ionicons name="search" size={18} color={c.muted} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Search notes" placeholderTextColor={c.muted} className="ml-2 min-h-11 flex-1 text-md text-ink" />
            </View>
            {filteredNotes.map((note) => (
              <Card key={note.id} className="mb-3">
                <View className="flex-row items-start">
                  <PressableScale onPress={() => openEditor(note)} accessibilityRole="button" accessibilityLabel={`Open ${note.title}`} className="flex-1">
                    <View>
                      <Text className="text-md font-bold text-ink" numberOfLines={1}>{note.title}</Text>
                      <Text className="mt-1 text-sm leading-5 text-sub" numberOfLines={3}>{note.content || 'Empty note'}</Text>
                    </View>
                  </PressableScale>
                  <View className="ml-2">
                    <PressableScale onPress={() => void updateNotes(() => togglePin(note.id))} accessibilityRole="button" accessibilityLabel={note.pinned ? 'Unpin note' : 'Pin note'} className="ml-2 h-11 w-11 items-center justify-center">
                      <Ionicons name={note.pinned ? 'bookmark' : 'bookmark-outline'} size={20} color={note.pinned ? c.amber : c.muted} />
                    </PressableScale>
                    <PressableScale onPress={() => showAlert('Delete note?', `“${note.title}” and its linked cards will be deleted.`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => void updateNotes(() => deleteNote(note.id)) },
                    ])} accessibilityRole="button" accessibilityLabel="Delete note" className="ml-2 h-11 w-11 items-center justify-center">
                      <Ionicons name="trash-outline" size={19} color={c.coral} />
                    </PressableScale>
                  </View>
                </View>
              </Card>
            ))}
            {!filteredNotes.length && <Text className="py-12 text-center text-sm text-muted">{query ? 'No notes match your search.' : 'No notes yet. Add your first one.'}</Text>}
          </Container>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Container>
          <Text className="text-2xl font-extrabold text-ink">Subjects</Text>
          <Text className="mb-5 mt-1 text-sm text-sub">Organize notes by class, course, or topic.</Text>
          {loadError && <Card className="mb-4"><Text className="text-sm text-coral">Subjects could not load.</Text><Button label="Try again" variant="secondary" onPress={() => void refreshSubjects()} className="mt-3" /></Card>}
          {subjects.map((subject) => (
            <Card key={subject.id} className="mb-3 flex-row items-center">
              <PressableScale onPress={() => void openSubject(subject)} accessibilityRole="button" accessibilityLabel={`Open ${subject.name}`} className="min-h-11 flex-1 flex-row items-center">
                <IconBadge name={safeIcon(subject.icon)} color={subject.color ?? c.teal} box={44} />
                <View className="ml-3 flex-1">
                  <Text className="text-md font-bold text-ink">{subject.name}</Text>
                  <Text className="mt-0.5 text-sm text-sub">{subject.note_count} {subject.note_count === 1 ? 'note' : 'notes'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={c.muted} />
              </PressableScale>
              <PressableScale onPress={() => confirmDeleteSubject(subject)} accessibilityRole="button" accessibilityLabel={`Delete ${subject.name}`} className="ml-2 h-11 w-11 items-center justify-center rounded-full">
                <Ionicons name="trash-outline" size={19} color={c.coral} />
              </PressableScale>
            </Card>
          ))}
          {addingSubject ? (
            <Card>
              <TextInput value={subjectName} onChangeText={setSubjectName} placeholder="Subject name" placeholderTextColor={c.muted} autoFocus editable={!subjectBusy} onSubmitEditing={() => void addSubject()} className="min-h-11 text-md text-ink" />
              <View className="mt-3 flex-row gap-2">
                <Button label={subjectBusy ? 'Adding...' : 'Add subject'} disabled={subjectBusy} onPress={() => void addSubject()} className="flex-1" />
                <Button label="Cancel" variant="secondary" onPress={() => { setAddingSubject(false); setSubjectName(''); }} className="flex-1" />
              </View>
            </Card>
          ) : !loading && !loadError ? (
            <PressableScale onPress={() => setAddingSubject(true)} accessibilityRole="button" accessibilityLabel="New subject" className="mt-1 flex-row items-center justify-center rounded-card border border-dashed border-border p-4">
              <Ionicons name="add" size={20} color={c.amber} />
              <Text className="ml-1 text-md font-semibold text-amber">New subject</Text>
            </PressableScale>
          ) : null}
        </Container>
      </ScrollView>
    </Screen>
  );
}
