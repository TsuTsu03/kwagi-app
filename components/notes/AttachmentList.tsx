import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '@/components/ui/PressableScale';
import { showAlert } from '@/lib/alert';
import { attachmentUri, deleteAttachmentFiles, openAttachment, type PendingOriginal } from '@/lib/attachmentFiles';
import { deleteAttachment, formatBytes, listAttachments, type Attachment, type AttachmentKind } from '@/lib/db/attachments';
import { useThemeColors } from '@/hooks/useTheme';

const ICONS: Record<AttachmentKind, keyof typeof Ionicons.glyphMap> = {
  image: 'image-outline',
  pdf: 'document-outline',
  document: 'document-text-outline',
  audio: 'mic-outline',
};

interface Props {
  /** Saved note whose kept files to show. */
  noteId?: string;
  /** Files from an import that will be kept when the note is saved. */
  pending: PendingOriginal[];
  onRemovePending: (index: number) => void;
  disabled?: boolean;
}

/** Original files kept on this phone for a note. */
export function AttachmentList({ noteId, pending, onRemovePending, disabled = false }: Props) {
  const c = useThemeColors();
  const [loaded, setLoaded] = useState<{ noteId: string; rows: Attachment[] } | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!noteId) return;
    let current = true;
    listAttachments(noteId)
      .then((rows) => { if (current) setLoaded({ noteId, rows }); })
      .catch(() => { if (current) setLoaded({ noteId, rows: [] }); });
    return () => { current = false; };
  }, [noteId, version]);
  const saved = noteId && loaded?.noteId === noteId ? loaded.rows : [];

  const open = async (attachment: Attachment) => {
    try {
      if (!(await openAttachment(attachment.file_name, attachment.mime_type))) {
        showAlert('Cannot open file', 'This device has no app available to open it.');
      }
    } catch {
      showAlert('Cannot open file', 'The file could not be opened. It may have been removed.');
    }
  };
  const remove = (attachment: Attachment) => {
    showAlert('Remove file?', `“${attachment.name}” will be deleted from this phone. The note text stays.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: () => void (async () => {
          try {
            const row = await deleteAttachment(attachment.id);
            if (row) deleteAttachmentFiles([row.file_name]);
            setVersion((value) => value + 1);
          } catch {
            showAlert('Could not remove file', 'Nothing was changed. Please try again.');
          }
        })(),
      },
    ]);
  };

  if (!saved.length && !pending.length) return null;
  const rows = [
    ...saved.map((attachment) => ({ key: attachment.id, kind: attachment.kind, name: attachment.name, size: attachment.size, uri: attachment.kind === 'image' ? attachmentUri(attachment.file_name) : null, status: 'Kept on this phone', onOpen: () => void open(attachment), onRemove: () => remove(attachment) })),
    ...pending.map((file, index) => ({ key: file.uri, kind: file.kind, name: file.name, size: file.size, uri: file.kind === 'image' ? file.uri : null, status: 'Kept when you save', onOpen: undefined, onRemove: () => onRemovePending(index) })),
  ];

  return (
    <View className="mb-3 rounded-card border border-bordersoft bg-surface p-2">
      {rows.map((row) => (
        <View key={row.key} className="flex-row items-center py-1">
          {row.uri
            ? <Image source={{ uri: row.uri }} accessibilityIgnoresInvertColors style={{ width: 40, height: 40, borderRadius: 6 }} />
            : <View className="h-10 w-10 items-center justify-center rounded-md bg-card"><Ionicons name={ICONS[row.kind]} size={20} color={c.teal} /></View>}
          <PressableScale onPress={row.onOpen} disabled={!row.onOpen || disabled} accessibilityRole="button" accessibilityLabel={row.onOpen ? `Open ${row.name}` : row.name} className="ml-2 min-h-11 flex-1 justify-center">
            <View>
              <Text className="text-sm font-semibold text-ink" numberOfLines={1}>{row.name}</Text>
              <Text className="text-xs text-sub">{formatBytes(row.size)} · {row.status}</Text>
            </View>
          </PressableScale>
          <PressableScale onPress={row.onRemove} disabled={disabled} accessibilityRole="button" accessibilityLabel={`Remove ${row.name}`} className="h-11 w-11 items-center justify-center">
            <Ionicons name="close" size={20} color={c.muted} />
          </PressableScale>
        </View>
      ))}
    </View>
  );
}
