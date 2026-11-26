import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Share, Text, View } from 'react-native';

import { useToast } from '@/components/toast';
import { Button, Card, Field, Notice, Screen, SectionLabel } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { confirm } from '@/hooks/useAction';
import {
  type Backup,
  captureBackup,
  deleteBackup,
  diffBackup,
  exportText,
  listBackups,
  parseBackupText,
  readCurrent,
  restoreBackup,
  type RestoreResult,
  saveBackup,
  SECTION_LABELS,
} from '@/lib/backup';
import { currentHost } from '@/lib/client';
import { errorMessage, formatDateTime } from '@/lib/format';
import { space, useColors } from '@/theme';

function describeResult(result: RestoreResult): { tone: 'info' | 'warn' | 'danger'; text: string } {
  const lines: string[] = [];
  if (result.applied.length > 0) {
    lines.push(`Restored: ${result.applied.map((s) => SECTION_LABELS[s]).join(', ')}.`);
  }
  for (const skipped of result.skipped) {
    lines.push(`${SECTION_LABELS[skipped.section]} was not restored. ${skipped.reason}`);
  }
  if (result.failed) {
    lines.push(`${SECTION_LABELS[result.failed.section]} failed: ${result.failed.message}`);
  }
  if (result.applied.includes('wifi') || result.applied.includes('dhcp')) {
    lines.push('Devices, including this phone, may need to reconnect.');
  }
  return {
    tone: result.failed ? 'danger' : result.skipped.length > 0 ? 'warn' : 'info',
    text: lines.join('\n\n'),
  };
}

export default function BackupScreen() {
  const c = useColors();
  const toast = useToast();
  const auth = useAuth();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ReturnType<typeof describeResult> | null>(null);
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState('');

  const reload = useCallback(async () => setBackups(await listBackups()), []);
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  async function create() {
    setBusy('create');
    setOutcome(null);
    try {
      await saveBackup(await captureBackup(''));
      await reload();
      toast.success('Backup saved on this phone');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function startRestore(backup: Backup) {
    setBusy(backup.id);
    setOutcome(null);
    try {
      const current = await readCurrent();
      const sections = diffBackup(backup.data, current);
      if (sections.length === 0) {
        toast.success('The router already matches this backup');
        return;
      }
      const disruptive = sections.includes('wifi') || sections.includes('dhcp');
      confirm({
        title: 'Restore this backup?',
        message:
          `These settings will change:\n\n${sections.map((s) => `• ${SECTION_LABELS[s]}`).join('\n')}` +
          (disruptive ? '\n\nEvery device, including this phone, will be disconnected briefly.' : ''),
        confirmLabel: 'Restore',
        destructive: disruptive,
        onConfirm: async () => {
          setBusy(backup.id);
          try {
            const result = await restoreBackup(backup.data, sections, current);
            setOutcome(describeResult(result));
            // A LAN restore can move the router to a different address.
            auth.setHost(currentHost());
          } finally {
            setBusy(null);
          }
        },
      });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function share(backup: Backup) {
    try {
      await Share.share({ title: `MiFi backup ${backup.name}`, message: exportText(backup) });
    } catch {
      toast.error('Could not open the share sheet.');
    }
  }

  function remove(backup: Backup) {
    confirm({
      title: 'Delete this backup?',
      message: `“${backup.name}” will be removed from this phone.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        await deleteBackup(backup.id);
        await reload();
      },
    });
  }

  async function runImport() {
    const parsed = parseBackupText(importText);
    if (!parsed) {
      toast.error('That text is not a MiFi Manager backup.');
      return;
    }
    try {
      // A fresh id so an imported copy never overwrites an existing backup.
      await saveBackup({ ...parsed, id: Date.now().toString(36) });
      setImportText('');
      setImporting(false);
      await reload();
      toast.success('Backup imported');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Screen>
      <Text style={{ color: c.sub, fontSize: 14, lineHeight: 21 }}>
        A backup saves the Wi-Fi name and password, channel, APN choice, network mode, LAN and
        connection-check settings. After a factory reset, restore it to put everything back in one
        step.
      </Text>

      <Button title="Back up current settings" icon="save-outline" onPress={create} loading={busy === 'create'} />

      {outcome ? <Notice tone={outcome.tone}>{outcome.text}</Notice> : null}

      {backups.length > 0 ? <SectionLabel>Saved backups</SectionLabel> : null}
      {backups.map((backup) => (
        <Card key={backup.id} style={{ gap: space.md }}>
          <View style={{ gap: 2 }}>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>{backup.name}</Text>
            <Text style={{ color: c.sub, fontSize: 13 }}>
              {formatDateTime(backup.createdAt)} · Wi-Fi “{backup.data.wifi.wifissid}”
              {backup.data.apn ? ` · APN ${backup.data.apn.apnname}` : ''}
            </Text>
          </View>
          <Button
            title="Restore"
            onPress={() => startRestore(backup)}
            loading={busy === backup.id}
            disabled={busy !== null && busy !== backup.id}
          />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <Button title="Share" variant="secondary" icon="share-outline" onPress={() => share(backup)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Delete" variant="danger" icon="trash-outline" onPress={() => remove(backup)} />
            </View>
          </View>
        </Card>
      ))}

      <Notice tone="warn">
        Backups contain your Wi-Fi password. They are stored encrypted on this phone, but a shared
        copy is plain text, so only send it somewhere you trust.
      </Notice>

      {importing ? (
        <Card style={{ gap: space.lg }}>
          <Field
            label="Paste the backup text"
            value={importText}
            onChangeText={setImportText}
            multiline
            numberOfLines={5}
            placeholder='{ "version": 1, ... }'
          />
          <Button title="Import" onPress={runImport} disabled={importText.trim().length === 0} />
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => {
              setImporting(false);
              setImportText('');
            }}
          />
        </Card>
      ) : (
        <Button
          title="Import a shared backup"
          variant="secondary"
          icon="download-outline"
          onPress={() => setImporting(true)}
        />
      )}
    </Screen>
  );
}
