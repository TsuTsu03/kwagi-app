import { showAlert } from '@/lib/alert';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  BackHandler,
  FlatList,
  Platform,
  ScrollView,
  Switch,
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
  getNote,
  listNoteSummaries,
  listSubjects,
  saveNoteWithCards,
  togglePin,
  updateNote,
  type Note,
  type NoteSummary,
  type SubjectWithCount,
} from '@/lib/db/notes';
import { generateFlashcards } from '@/lib/flashcardGenerator';
import { importFromFile, importFromPhotos, ImportError, importSupport, type ImportedNote } from '@/lib/import';
import { discardPending, keepOriginals, StorageFullError, supportsOriginals, sweepOrphanFiles, type PendingOriginal } from '@/lib/attachmentFiles';
import { AttachmentList } from '@/components/notes/AttachmentList';
import { useThemeColors } from '@/hooks/useTheme';

type NotesView = 'subjects' | 'notes' | 'editor';
type ImportSource = 'camera' | 'library' | 'file';

function importNoticeFor(note: ImportedNote): string {
  const origin = note.kind === 'image'
    ? `${note.sources} ${note.sources === 1 ? 'photo' : 'photos'}`
    : 'your file';
  const check = note.kind === 'image'
    ? 'Check names, numbers, and symbols; handwriting is often misread.'
    : 'Check that headings, tables, and symbols came through correctly.';
  const cut = note.truncated ? ' Only the first part was imported because the text is very long.' : '';
  if (!note.text) return `No text was found in ${origin}. The original will be kept with this note when you tap Save, so add your own notes here.`;
  const kept = note.originals.length ? ' The original is kept on this phone when you save.' : '';
  return `Read from ${origin} on this device. Nothing is saved until you tap Save. ${check}${cut}${kept}`;
}

const SUBJECT_COLORS = ['#2DD4BF', '#F5A623', '#A78BFA', '#60A5FA', '#F472B6', '#34D399'];

export default function NotesScreen() {
  const c = useThemeColors();
  const [view, setView] = useState<NotesView>('subjects');
  const [subjects, setSubjects] = useState<SubjectWithCount[]>([]);
  const [activeSubject, setActiveSubject] = useState<SubjectWithCount | null>(null);
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [results, setResults] = useState<{ query: string; notes: NoteSummary[] } | null>(null);
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
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState<ImportSource | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [keepFiles, setKeepFiles] = useState(supportsOriginals);
  const [pending, setPending] = useState<PendingOriginal[]>([]);
  const pendingRef = useRef<PendingOriginal[]>([]);
  /** Swap the files waiting to be kept, deleting the cached copies that are dropped. */
  const replacePending = useCallback((next: PendingOriginal[]) => {
    discardPending(pendingRef.current.filter((file) => !next.includes(file)));
    pendingRef.current = next;
    setPending(next);
  }, []);

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
      setNotes(await listNoteSummaries(subject.id));
      setQuery('');
      setImportOpen(false);
      setView('notes');
    } catch {
      showAlert('Could not open subject', 'Your notes are still on this device. Please try again.');
    }
  }, []);

  // Search in SQLite after typing pauses, so large libraries do not re-filter on every keystroke.
  const needle = query.trim();
  useEffect(() => {
    if (!needle || !activeSubject) return;
    let current = true;
    const timer = setTimeout(() => {
      listNoteSummaries(activeSubject.id, needle)
        .then((found) => { if (current) setResults({ query: needle, notes: found }); })
        .catch(() => { if (current) setResults({ query: needle, notes: [] }); });
    }, 200);
    return () => { current = false; clearTimeout(timer); };
  }, [activeSubject, notes, needle]);
  const searched = needle && results?.query === needle ? results.notes : null;
  const filteredNotes = searched ?? notes;

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

  const showEditor = useCallback((note: Note | null) => {
    setEditing(note);
    setTitle(note?.title ?? '');
    setContent(note?.content ?? '');
    setImportNotice(null);
    replacePending([]);
    setView('editor');
  }, [replacePending]);
  const openNote = useCallback(async (summary: NoteSummary) => {
    try {
      const note = await getNote(summary.id);
      if (note) showEditor(note);
      else showAlert('Note not found', 'It may have been deleted. Please refresh this subject.');
    } catch {
      showAlert('Could not open note', 'Your note is still on this device. Please try again.');
    }
  }, [showEditor]);

  const runImport = useCallback(async (source: ImportSource) => {
    if (importing) return;
    setImporting(source);
    try {
      const options = { keepOriginals: keepFiles };
      const imported = source === 'file' ? await importFromFile(options) : await importFromPhotos(source, options);
      if (!imported) return;
      replacePending(imported.originals);
      setEditing(null);
      setTitle(imported.title);
      setContent(imported.text);
      setImportNotice(importNoticeFor(imported));
      setImportOpen(false);
      setView('editor');
    } catch (error) {
      showAlert('Could not import', error instanceof ImportError ? error.message : 'Nothing was saved. Please try again.');
    } finally {
      setImporting(null);
    }
  }, [importing, keepFiles, replacePending]);

  const hasDraft = title !== (editing?.title ?? '') || content !== (editing?.content ?? '') || pending.length > 0;
  const generatedPreview = useMemo(() => generateFlashcards(content), [content]);
  const leaveEditor = useCallback(() => {
    if (saving) return;
    if (!hasDraft) { setView('notes'); return; }
    showAlert('Discard unsaved changes?', 'Save your note first if you want to keep these changes.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { replacePending([]); setView('notes'); } },
    ]);
  }, [hasDraft, replacePending, saving]);
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
      void sweepOrphanFiles().catch(() => undefined);
      setNotes(await listNoteSummaries(activeSubject.id));
      await refreshSubjects();
    } catch {
      showAlert('Could not update notes', 'Nothing was changed. Please try again.');
    }
  }, [activeSubject, refreshSubjects]);

  const updateSubjects = useCallback(async (action: () => Promise<void>) => {
    try { await action(); void sweepOrphanFiles().catch(() => undefined); await refreshSubjects(); }
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
      let noteId = editing?.id;
      if (makeCards) {
        const generated = generateFlashcards(content);
        if (!generated.length) {
          showAlert('No cards found', 'Use “term :: definition”, “term: definition”, or Q:/A: lines in your note.');
          return;
        }
        const result = await saveNoteWithCards({ noteId: editing?.id, subjectId: activeSubject.id, subjectName: activeSubject.name, title: cleanTitle, content, cards: generated });
        noteId = result.noteId;
        showAlert(result.cardsCreated ? 'Cards created' : 'Cards already up to date', result.cardsCreated ? `${result.cardsCreated} cards added to ${activeSubject.name}.` : 'No duplicate cards were added.');
      } else if (editing?.id) {
        await updateNote(editing.id, { title: cleanTitle, content });
      } else {
        noteId = await createNote({ subject_id: activeSubject.id, title: cleanTitle, content });
      }
      if (noteId && pending.length) {
        const files = pending;
        pendingRef.current = [];
        setPending([]);
        try {
          await keepOriginals(noteId, files);
        } catch (error) {
          showAlert('Original files not kept', error instanceof StorageFullError ? error.message : 'Your note text was saved, but the original files could not be kept on this phone.');
        }
      }
      setNotes(await listNoteSummaries(activeSubject.id));
      await refreshSubjects();
      setView('notes');
    } catch {
      showAlert('Could not save', 'Your note was not changed. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [activeSubject, content, editing, pending, refreshSubjects, saving, title]);

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
            {importNotice && (
              <View accessibilityLiveRegion="polite" className="mb-3 flex-row rounded-card border border-bordersoft bg-surface p-3">
                <Ionicons name="scan-outline" size={18} color={c.teal} />
                <Text className="ml-2 flex-1 text-xs leading-5 text-sub">{importNotice}</Text>
              </View>
            )}
            <AttachmentList noteId={editing?.id} pending={pending} disabled={saving} onRemovePending={(index) => replacePending(pending.filter((_, i) => i !== index))} />
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
        <FlatList
          data={filteredNotes}
          keyExtractor={(note) => note.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          initialNumToRender={12}
          windowSize={7}
          ListHeaderComponent={
          <Container>
            <View className="mb-4 flex-row items-center">
              <PressableScale onPress={() => setView('subjects')} accessibilityRole="button" accessibilityLabel="Back to subjects" className="h-11 w-11 items-center justify-center">
                <Ionicons name="chevron-back" size={25} color={c.sub} />
              </PressableScale>
              <View className="ml-1 flex-1">
                <Text className="text-xl font-extrabold text-ink">{activeSubject.name}</Text>
                <Text className="text-sm text-sub">{notes.length} {notes.length === 1 ? 'note' : 'notes'}</Text>
              </View>
              <PressableScale onPress={() => setImportOpen((open) => !open)} disabled={!!importing} accessibilityRole="button" accessibilityLabel="Import notes" accessibilityState={{ expanded: importOpen }} className="mr-2 h-11 w-11 items-center justify-center rounded-full border border-bordersoft bg-surface">
                <Ionicons name="document-text-outline" size={21} color={c.amber} />
              </PressableScale>
              <PressableScale onPress={() => showEditor(null)} accessibilityRole="button" accessibilityLabel="New note" className="h-11 w-11 items-center justify-center rounded-full bg-amber">
                <Ionicons name="add" size={24} color={c.bg} />
              </PressableScale>
            </View>
            {importOpen && (
              <Card className="mb-4">
                <Text className="text-md font-bold text-ink">Import notes</Text>
                <Text className="mt-1 text-sm leading-5 text-sub">
                  {importSupport.photos
                    ? 'Turn photos, PDFs, Word, PowerPoint, or text files into a note. Everything is read and stored on this phone, not in the cloud.'
                    : 'Turn Word, PowerPoint, text, or Markdown files into a note. Photo and PDF import work in the Android and iPhone app.'}
                </Text>
                {importing ? (
                  <View accessibilityLiveRegion="polite" className="mt-4 flex-row items-center">
                    <ActivityIndicator color={c.amber} />
                    <Text className="ml-3 text-sm text-sub">Reading your notes...</Text>
                  </View>
                ) : (
                  <View className="mt-4 gap-2">
                    {importSupport.photos && (
                      <View className="flex-row gap-2">
                        <Button label="Take photo" variant="secondary" onPress={() => void runImport('camera')} className="flex-1" />
                        <Button label="Choose photos" variant="secondary" onPress={() => void runImport('library')} className="flex-1" />
                      </View>
                    )}
                    <Button label="Choose file" variant="secondary" onPress={() => void runImport('file')} />
                    {supportsOriginals && (
                      <View className="mt-2 flex-row items-center">
                        <Text className="flex-1 text-sm leading-5 text-sub">Keep original photos and files on this phone</Text>
                        <Switch value={keepFiles} onValueChange={setKeepFiles} accessibilityLabel="Keep original photos and files on this phone" trackColor={{ true: c.amber, false: c.muted }} />
                      </View>
                    )}
                  </View>
                )}
              </Card>
            )}
            <View className="mb-4 flex-row items-center rounded-card border border-bordersoft bg-surface px-3">
              <Ionicons name="search" size={18} color={c.muted} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Search notes" placeholderTextColor={c.muted} className="ml-2 min-h-11 flex-1 text-md text-ink" />
            </View>
          </Container>
          }
          renderItem={({ item: note }) => (
            <Container>
              <Card className="mb-3">
                <View className="flex-row items-start">
                  <PressableScale onPress={() => void openNote(note)} accessibilityRole="button" accessibilityLabel={`Open ${note.title}`} className="flex-1">
                    <View>
                      <Text className="text-md font-bold text-ink" numberOfLines={1}>{note.title}</Text>
                      <Text className="mt-1 text-sm leading-5 text-sub" numberOfLines={3}>{note.preview || 'Empty note'}</Text>
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
            </Container>
          )}
          ListEmptyComponent={<Text className="py-12 text-center text-sm text-muted">{searched ? 'No notes match your search.' : 'No notes yet. Add your first one.'}</Text>}
        />
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
