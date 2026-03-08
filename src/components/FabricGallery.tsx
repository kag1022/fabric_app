import { startTransition, useEffect, useId, useState, type ChangeEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';

import {
  buildLocalHistoryExport,
  clearLocalHistory,
  deleteLocalFabricRecord,
  EXPORT_FILE_NAME,
  importLocalHistoryExport,
  isLocalHistorySupported,
  listLocalFabricRecords,
  MAX_IMPORT_FILE_BYTES,
  subscribeToLocalHistory,
} from '../services/localHistory';
import type { LocalFabricRecord } from '../types/fabric';

function formatCreatedAt(item: LocalFabricRecord): string {
  return new Date(item.createdAtMs).toLocaleString('ja-JP', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'numeric',
  });
}

function downloadExportFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function HistoryImage({ record }: { record: LocalFabricRecord }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof URL.createObjectURL !== 'function') {
      setPreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(record.previewBlob);
    setPreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [record.previewBlob]);

  if (!previewUrl) {
    return (
      <Box
        sx={{
          alignItems: 'center',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          minHeight: 200,
          p: 2,
        }}
      >
        <Typography color="text.secondary">画像を表示できません</Typography>
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={previewUrl}
      alt={`グループ ${record.group} の布`}
      sx={{
        display: 'block',
        height: '100%',
        maxHeight: { xs: 220, md: 280 },
        objectFit: 'cover',
        width: '100%',
      }}
    />
  );
}

type FeedbackState = {
  message: string;
  severity: 'error' | 'info' | 'success';
} | null;

function FabricGallery() {
  const canSaveHistory = isLocalHistorySupported();
  const [items, setItems] = useState<LocalFabricRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [itemToDelete, setItemToDelete] = useState<LocalFabricRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const importInputId = useId();

  useEffect(() => {
    if (!canSaveHistory) {
      setItems([]);
      setLoading(false);
      return;
    }

    let active = true;

    const loadItems = async () => {
      try {
        const nextItems = await listLocalFabricRecords();
        if (!active) {
          return;
        }

        startTransition(() => {
          setItems(nextItems);
          setFeedback((currentFeedback) =>
            currentFeedback?.severity === 'error' ? null : currentFeedback,
          );
          setLoading(false);
        });
      } catch (loadError) {
        console.error('Failed to load local history.', loadError);
        if (!active) {
          return;
        }
        setFeedback({
          message: '記録の読み込みに失敗しました。ブラウザの保存設定を確認してください。',
          severity: 'error',
        });
        setLoading(false);
      }
    };

    setLoading(true);
    void loadItems();

    const unsubscribe = subscribeToLocalHistory(() => {
      void loadItems();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [canSaveHistory]);

  const handleDeleteItem = async () => {
    if (!itemToDelete) {
      return;
    }

    try {
      setDeletingId(itemToDelete.id);
      await deleteLocalFabricRecord(itemToDelete.id);
      setItemToDelete(null);
      setFeedback({
        message: '記録を削除しました。',
        severity: 'info',
      });
    } catch (deleteError) {
      console.error('Failed to delete local history item.', deleteError);
      setFeedback({
        message: '削除に失敗しました。もう一度お試しください。',
        severity: 'error',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = async () => {
    try {
      const payload = await buildLocalHistoryExport();
      downloadExportFile(EXPORT_FILE_NAME, JSON.stringify(payload, null, 2));
      setFeedback({
        message: '履歴を書き出しました。',
        severity: 'success',
      });
    } catch (exportError) {
      console.error('Failed to export local history.', exportError);
      setFeedback({
        message: '履歴の書き出しに失敗しました。',
        severity: 'error',
      });
    }
  };

  const handleImportSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (file.size > MAX_IMPORT_FILE_BYTES) {
      setFeedback({
        message: '取り込みファイルが大きすぎます。20MB 以下の JSON を選んでください。',
        severity: 'error',
      });
      return;
    }

    try {
      const imported = await importLocalHistoryExport(JSON.parse(await file.text()) as unknown);
      setFeedback({
        message:
          imported.skippedCount > 0
            ? `${imported.importedCount}件を取り込み、${imported.skippedCount}件は重複のためスキップしました。`
            : `${imported.importedCount}件を取り込みました。`,
        severity: imported.importedCount > 0 ? 'success' : 'info',
      });
    } catch (importError) {
      console.error('Failed to import local history.', importError);
      setFeedback({
        message: '取り込みに失敗しました。正しい JSON ファイルを選んでください。',
        severity: 'error',
      });
    }
  };

  const handleClearAll = async () => {
    try {
      setIsClearingAll(true);
      await clearLocalHistory();
      setIsClearDialogOpen(false);
      setFeedback({
        message: 'この端末の履歴をすべて消しました。',
        severity: 'info',
      });
    } catch (clearError) {
      console.error('Failed to clear local history.', clearError);
      setFeedback({
        message: '履歴の一括削除に失敗しました。',
        severity: 'error',
      });
    } finally {
      setIsClearingAll(false);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 4 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={52} />
          <Typography variant="h3">記録を読み込んでいます</Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Paper sx={{ p: { xs: 2.5, md: 3.5 } }}>
        <Stack spacing={1}>
          <Typography variant="h2">最近の記録</Typography>
          <Typography color="text.secondary">
            主機能はしわけ支援です。ここでは直近の保存結果だけを大きく確認できます。
          </Typography>
        </Stack>
      </Paper>

      {feedback && (
        <Alert severity={feedback.severity} sx={{ borderRadius: 3 }}>
          {feedback.message}
        </Alert>
      )}

      {!canSaveHistory && (
        <Paper sx={{ p: 4 }}>
          <Typography variant="h3">記録保存は使えません</Typography>
          <Typography color="text.secondary" sx={{ mt: 1.5 }}>
            このブラウザでは IndexedDB が使えないため、仕分け案内だけ利用できます。
          </Typography>
        </Paper>
      )}

      {canSaveHistory && (
        <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <Button
              disabled={items.length === 0}
              onClick={handleExport}
              startIcon={<DownloadOutlinedIcon />}
              variant="contained"
            >
              履歴を書き出す
            </Button>
            <Button
              component="label"
              htmlFor={importInputId}
              startIcon={<UploadFileOutlinedIcon />}
              variant="outlined"
            >
              履歴を読み込む
            </Button>
            <Button
              color="error"
              disabled={items.length === 0}
              onClick={() => setIsClearDialogOpen(true)}
              startIcon={<DeleteSweepOutlinedIcon />}
              variant="outlined"
            >
              この端末の履歴を全部消す
            </Button>
          </Stack>
          <input accept="application/json,.json" hidden id={importInputId} onChange={handleImportSelected} type="file" />
        </Paper>
      )}

      {canSaveHistory && items.length === 0 ? (
        <Paper sx={{ p: 4 }}>
          <Typography variant="h3">まだ記録はありません</Typography>
          <Typography color="text.secondary" sx={{ mt: 1.5 }}>
            しわけ画面から写真を撮って「この端末に保存」を押すと、ここに最近の記録が表示されます。
          </Typography>
        </Paper>
      ) : canSaveHistory ? (
        <Stack spacing={2}>
          {items.map((item) => (
            <Paper key={item.id} sx={{ overflow: 'hidden' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} sx={{ minHeight: { md: 240 } }}>
                <Box
                  sx={{
                    backgroundColor: '#dbe3e7',
                    minWidth: { md: 280 },
                    width: { xs: '100%', md: 280 },
                  }}
                >
                  <HistoryImage record={item} />
                </Box>

                <Stack spacing={2} sx={{ flexGrow: 1, p: { xs: 2.5, md: 3 } }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
                  >
                    <Box>
                      <Typography color="text.secondary" fontWeight={700}>
                        保存日時
                      </Typography>
                      <Typography sx={{ fontSize: '1.15rem', fontWeight: 800 }}>
                        {formatCreatedAt(item)}
                      </Typography>
                    </Box>
                    <Paper
                      sx={{
                        backgroundColor: 'secondary.main',
                        color: '#21313c',
                        px: 2,
                        py: 1,
                        width: 'fit-content',
                      }}
                    >
                      <Typography sx={{ fontSize: '1.5rem', fontWeight: 900 }}>{item.group}</Typography>
                    </Paper>
                  </Stack>

                  <Stack spacing={1}>
                    <Typography sx={{ fontSize: '1.2rem' }}>
                      色の名前: <strong>{item.hueInfo.name}</strong>
                    </Typography>
                    <Typography sx={{ fontSize: '1.2rem' }}>
                      明るさ: <strong>{item.valueInfo.name}</strong>
                    </Typography>
                    <Typography sx={{ fontSize: '1.2rem' }}>
                      鮮やかさ: <strong>{item.saturationInfo.name}</strong>
                    </Typography>
                  </Stack>

                  <Button
                    color="error"
                    onClick={() => setItemToDelete(item)}
                    startIcon={<DeleteOutlineOutlinedIcon />}
                    sx={{ alignSelf: 'flex-start' }}
                    variant="outlined"
                  >
                    この記録を削除
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : null}

      <Dialog onClose={() => setItemToDelete(null)} open={Boolean(itemToDelete)}>
        <DialogTitle>記録を削除しますか</DialogTitle>
        <DialogContent>
          <DialogContentText>
            グループ {itemToDelete?.group} の記録を削除します。この操作は元に戻せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setItemToDelete(null)} variant="outlined">
            やめる
          </Button>
          <Button
            color="error"
            disabled={deletingId === itemToDelete?.id}
            onClick={handleDeleteItem}
            variant="contained"
          >
            {deletingId === itemToDelete?.id ? '削除しています' : '削除する'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog onClose={() => setIsClearDialogOpen(false)} open={isClearDialogOpen}>
        <DialogTitle>この端末の履歴をすべて削除しますか</DialogTitle>
        <DialogContent>
          <DialogContentText>
            保存した履歴をすべて削除します。この操作は元に戻せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setIsClearDialogOpen(false)} variant="outlined">
            やめる
          </Button>
          <Button color="error" disabled={isClearingAll} onClick={handleClearAll} variant="contained">
            {isClearingAll ? '削除しています' : 'すべて削除する'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export default FabricGallery;
