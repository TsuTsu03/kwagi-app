import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { KwagiOwl } from '@/components/kwagi/KwagiOwl';
import { KwagiSpeech } from '@/components/kwagi/KwagiSpeech';
import { Screen } from '@/components/ui/Screen';
import { Container } from '@/components/ui/Container';
import { FadeIn } from '@/components/ui/FadeIn';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PressableScale } from '@/components/ui/PressableScale';
import { IconBadge, safeIcon, type IconName } from '@/components/ui/IconBadge';
import {
  listSubjects,
  listNotes,
  createSubject,
  createNote,
  updateNote,
  deleteNote,
  deleteSubject,
  type SubjectWithCount,
  type Note,
} from '@/lib/db/notes';
import { useAppStore } from '@/lib/store';
import { BOARDS } from '@/constants/boards';
import { useThemeColors } from '@/hooks/useTheme';
import { useTablet } from '@/hooks/useTablet';

type NotesView = 'subjects' | 'notes' | 'editor';

export default function NotesScreen() {
  const { settings } = useAppStore();
  const c = useThemeColors();
  const { isTablet } = useTablet();
  const [view, setView] = useState<NotesView>('subjects');
  const [subjects, setSubjects] = useState<SubjectWithCount[]>([]);
  const [activeSubject, setActiveSubject] = useState<SubjectWithCount | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [editing, setEditing] = useState<Note | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [composingSubject, setComposingSubject] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const refreshSubjects = useCallback(async () => {
    setSubjects(await listSubjects());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshSubjects();
    }, [refreshSubjects]),
  );

  const openSubject = useCallback(async (subject: SubjectWithCount) => {
    setActiveSubject(subject);
    setNotes(await listNotes(subject.id));
    setView('notes');
  }, []);

  const addSubject = useCallback(async () => {
    const name = newSubjectName.trim();
    if (!name) return;
    await createSubject({
      name,
      board: settings.activeBoard,
      color: BOARDS[settings.activeBoard].color,
      icon: BOARDS[settings.activeBoard].icon,
    });
    setNewSubjectName('');
    setComposingSubject(false);
    await refreshSubjects();
  }, [newSubjectName, settings.activeBoard, refreshSubjects]);

  const openEditor = useCallback((note: Note | null) => {
    setEditing(note);
    setTitle(note?.title ?? '');
    setContent(note?.content ?? '');
    setView('editor');
  }, []);

  const saveEditor = useCallback(async () => {
    if (!activeSubject) return;
    const t = title.trim() || 'Untitled';
    if (editing) {
      await updateNote(editing.id, { title: t, content });
    } else {
      await createNote({ subject_id: activeSubject.id, title: t, content });
    }
    setNotes(await listNotes(activeSubject.id));
    await refreshSubjects();
    setView('notes');
  }, [activeSubject, editing, title, content, refreshSubjects]);

  const removeNote = useCallback(
    async (id: string) => {
      if (!activeSubject) return;
      await deleteNote(id);
      setNotes(await listNotes(activeSubject.id));
      await refreshSubjects();
    },
    [activeSubject, refreshSubjects],
  );

  // -------- Editor view --------
  if (view === 'editor') {
    return (
      <Screen>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <View className="flex-row items-center justify-between border-b border-bordersoft p-4">
            <Pressable onPress={() => setView('notes')} accessibilityRole="button" accessibilityLabel="Back" className="h-10 w-10 items-center justify-center">
              <Ionicons name="chevron-back" size={26} color={c.sub} />
            </Pressable>
            <Text className="text-md font-bold tracking-tight text-ink">{editing ? 'Edit Note' : 'New Note'}</Text>
            <Pressable onPress={saveEditor} accessibilityRole="button" accessibilityLabel="Save note" className="h-10 w-10 items-center justify-center">
              <Ionicons name="checkmark" size={26} color={c.amber} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            <Container>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Note title..."
                placeholderTextColor={c.muted}
                className="text-2xl font-bold tracking-tight text-ink"
              />
              <View className="my-3 h-px bg-bordersoft" />
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="Write your notes here... (#tags supported)"
                placeholderTextColor={c.muted}
                multiline
                textAlignVertical="top"
                className="min-h-[300px] text-md text-ink leading-6"
              />
            </Container>
          </ScrollView>
        </KeyboardAvoidingView>
      </Screen>
    );
  }

  // -------- Note list view --------
  if (view === 'notes' && activeSubject) {
    return (
      <Screen>
        <View className="flex-row items-center justify-between border-b border-bordersoft p-4">
          <Pressable onPress={() => setView('subjects')} accessibilityRole="button" accessibilityLabel="Back to subjects" className="h-10 w-10 items-center justify-center">
            <Ionicons name="chevron-back" size={26} color={c.sub} />
          </Pressable>
          <Ionicons name={safeIcon(activeSubject.icon)} size={18} color={activeSubject.color ?? c.amber} />
          <Text className="ml-2 flex-1 text-md font-bold tracking-tight text-ink" numberOfLines={1}>
            {activeSubject.name}
          </Text>
        </View>

        {notes.length === 0 ? (
          <View className="flex-1 items-center justify-center p-6">
            <KwagiOwl mood="happy" size={120} animate={settings.kwagiAnimations} />
            <View className="mt-3 w-full max-w-[280px]">
              <KwagiSpeech text="Wala pang notes dito! Mag-create tayo ng una." tail="none" />
            </View>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
            <Container>
            {notes.map((n, i) => (
              <FadeIn key={n.id} index={i}>
                <PressableScale
                  onPress={() => openEditor(n)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open note ${n.title}`}
                  className="mb-3 rounded-card border border-bordersoft bg-surface p-4"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 flex-row items-center">
                      {!!n.pinned && (
                        <Ionicons name="bookmark" size={14} color={c.amber} style={{ marginRight: 6 }} />
                      )}
                      <Text className="flex-1 text-md font-bold tracking-tight text-ink" numberOfLines={1}>
                        {n.title}
                      </Text>
                    </View>
                    <Pressable onPress={() => removeNote(n.id)} accessibilityRole="button" accessibilityLabel="Delete note" hitSlop={10} className="ml-2">
                      <Ionicons name="trash-outline" size={18} color={c.muted} />
                    </Pressable>
                  </View>
                  {!!n.content && (
                    <Text className="mt-1 text-sm text-sub leading-5" numberOfLines={2}>
                      {n.content}
                    </Text>
                  )}
                  {n.tags.length > 0 && (
                    <View className="mt-2 flex-row flex-wrap gap-1.5">
                      {n.tags.map((t) => (
                        <Badge key={t} label={`#${t}`} color={c.purple} />
                      ))}
                    </View>
                  )}
                </PressableScale>
              </FadeIn>
            ))}
            </Container>
          </ScrollView>
        )}

        <PressableScale
          onPress={() => openEditor(null)}
          pressedScale={0.9}
          accessibilityRole="button"
          accessibilityLabel="New note"
          className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-amber"
          style={{
            shadowColor: c.amber,
            shadowOpacity: 0.5,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 4 },
            elevation: 10,
          }}
        >
          <Ionicons name="add" size={30} color={c.bg} />
        </PressableScale>
      </Screen>
    );
  }

  // -------- Subjects view --------
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Container>
        <FadeIn index={0}>
          <Text className="mb-1 text-2xl font-extrabold tracking-tighter text-ink">My Notes</Text>
          <Text className="mb-5 text-sm text-sub">Organize your reviewer by subject.</Text>
        </FadeIn>

        <View className="flex-row flex-wrap gap-3">
          {subjects.map((s, i) => (
            <FadeIn key={s.id} index={i + 1} className={isTablet ? 'basis-[48%] grow' : 'w-full'}>
              <PressableScale
                onPress={() => openSubject(s)}
                onLongPress={() => deleteSubject(s.id).then(refreshSubjects)}
                accessibilityRole="button"
                accessibilityLabel={`Open subject ${s.name}`}
                className="h-full flex-row items-center rounded-card border border-bordersoft bg-surface p-4"
              >
                <IconBadge name={(s.icon as IconName) || 'book'} color={s.color ?? c.amber} box={44} />
                <View className="ml-3 flex-1">
                  <Text className="text-md font-bold tracking-tight text-ink" numberOfLines={1}>{s.name}</Text>
                  <Text className="text-xs text-sub">{s.note_count} notes</Text>
                </View>
                {s.board && <Badge label={s.board} color={s.color ?? c.amber} />}
                <Ionicons name="chevron-forward" size={20} color={c.muted} />
              </PressableScale>
            </FadeIn>
          ))}
        </View>

        <View className="mt-3">
        {composingSubject ? (
          <View className="rounded-card border border-amber bg-surface p-4">
            <TextInput
              value={newSubjectName}
              onChangeText={setNewSubjectName}
              placeholder="Subject name..."
              placeholderTextColor={c.muted}
              autoFocus
              className="text-md text-ink"
              onSubmitEditing={addSubject}
            />
            <Text className="mt-1 text-xs text-muted">Board: {BOARDS[settings.activeBoard].name}</Text>
            <View className="mt-3 flex-row gap-2">
              <Button label="Add" onPress={addSubject} className="flex-1" />
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => {
                  setComposingSubject(false);
                  setNewSubjectName('');
                }}
                className="flex-1"
              />
            </View>
          </View>
        ) : (
          <PressableScale
            onPress={() => setComposingSubject(true)}
            accessibilityRole="button"
            accessibilityLabel="New subject"
            className="flex-row items-center justify-center rounded-card border border-dashed border-border p-4"
          >
            <Ionicons name="add" size={20} color={c.amber} />
            <Text className="ml-1 text-md font-semibold text-amber">New Subject</Text>
          </PressableScale>
        )}
        </View>
        </Container>
      </ScrollView>
    </Screen>
  );
}
