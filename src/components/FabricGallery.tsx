import { startTransition, useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
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
  FormControlLabel,
  Paper,
  Stack,
  Switch,
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
import { buildColorGuidance } from '../utils/colorGuidance';

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
  const guidance = buildColorGuidance(record);

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
      alt={`${guidance.headline} の記録写真`}
      component="img"
      src={previewUrl}
      sx={{
        display: 'block',
        height: '100%',
        maxHeight: { xs: 240, md: 300 },
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

interface FabricGalleryProps {
  autoReadEnabled: boolean;
  onAutoReadEnabledChange: (autoReadEnabled: boolean) => void;
}

function FabricGallery({ autoReadEnabled, onAutoReadEnabledChange }: FabricGalleryProps) {
  const canSaveHistory = isLocalHistorySupported();
  const [items, setItems] = useState<LocalFabricRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [itemToDelete, setItemToDelete] = useState<LocalFabricRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
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
          message: '記録を読みこめませんでした。ブラウザの設定を確認してください。',
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
        message: '記録を消しました。',
        severity: 'info',
      });
    } catch (deleteError) {
      console.error('Failed to delete local history item.', deleteError);
      setFeedback({
        message: '消せませんでした。もう一度押してください。',
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
        message: '記録を書き出しました。',
        severity: 'success',
      });
    } catch (exportError) {
      console.error('Failed to export local history.', exportError);
      setFeedback({
        message: '書き出しに失敗しました。',
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
        message: 'ファイルが大きすぎます。20MB以下のJSONをえらんでください。',
        severity: 'error',
      });
      return;
    }

    try {
      const imported = await importLocalHistoryExport(JSON.parse(await file.text()) as unknown);
      setFeedback({
        message:
          imported.skippedCount > 0
            ? `${imported.importedCount}件を読みこみ、${imported.skippedCount}件は同じため入れませんでした。`
            : `${imported.importedCount}件を読みこみました。`,
        severity: imported.importedCount > 0 ? 'success' : 'info',
      });
    } catch (importError) {
      console.error('Failed to import local history.', importError);
      setFeedback({
        message: '読みこみに失敗しました。正しいJSONをえらんでください。',
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
        message: 'この端末の記録をすべて消しました。',
        severity: 'info',
      });
    } catch (clearError) {
      console.error('Failed to clear local history.', clearError);
      setFeedback({
        message: '全部は消せませんでした。',
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
          <CircularProgress aria-hidden="true" size={52} />
          <Typography variant="h3">記録を読みこんでいます</Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Paper component="section" sx={{ p: { xs: 2.5, md: 3.5 } }}>
        <Stack spacing={0.5}>
          <Typography component="h2" variant="h2">
            職員向け 記録管理
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: '1rem' }}>
            本人向け画面とは分けて、記録と端末設定を管理します。
          </Typography>
        </Stack>
      </Paper>

      {feedback && <Alert severity={feedback.severity}>{feedback.message}</Alert>}

      <Paper component="section" sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack spacing={1.5}>
          <Typography variant="h3">音声設定</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={autoReadEnabled}
                onChange={(_event, checked) => {
                  onAutoReadEnabledChange(checked);
                }}
              />
            }
            label="結果を自動で読む"
            sx={{ alignItems: 'center', m: 0 }}
          />
          <Typography color="text.secondary">
            本人向け画面で結果を開いたとき、自動で読み上げるかどうかを端末ごとに決められます。
          </Typography>
        </Stack>
      </Paper>

      {!canSaveHistory && (
        <Paper sx={{ p: 4 }}>
          <Typography variant="h3">記録の保存は使えません</Typography>
          <Typography color="text.secondary" sx={{ mt: 1.5 }}>
            このブラウザでは保存できません。色を読むことはできます。
          </Typography>
        </Paper>
      )}

      {canSaveHistory && (
        <Paper component="section" sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={1.5}>
            <Typography variant="h3">記録の移動</Typography>
            <Typography color="text.secondary">
              記録の書き出しと読み込みを行います。日常の確認よりも、引き継ぎや端末交換のときに使います。
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <Button
                disabled={items.length === 0}
                fullWidth
                onClick={handleExport}
                startIcon={<DownloadOutlinedIcon />}
                variant="contained"
              >
                記録を書き出す
              </Button>
              <Button
                fullWidth
                onClick={() => importInputRef.current?.click()}
                startIcon={<UploadFileOutlinedIcon />}
                variant="outlined"
              >
                記録を読みこむ
              </Button>
            </Stack>
          </Stack>
          <input
            accept="application/json,.json"
            hidden
            id={importInputId}
            onChange={handleImportSelected}
            ref={importInputRef}
            type="file"
          />
        </Paper>
      )}

      {canSaveHistory && (
        <Paper component="section" sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={1.5}>
            <Typography variant="h3">危険な操作</Typography>
            <Typography color="text.secondary">
              すべて消す操作は元に戻せません。必要なときだけ使ってください。
            </Typography>
            <Button
              color="error"
              disabled={items.length === 0}
              fullWidth
              onClick={() => setIsClearDialogOpen(true)}
              startIcon={<DeleteSweepOutlinedIcon />}
              variant="outlined"
            >
              すべて消す
            </Button>
          </Stack>
        </Paper>
      )}

      {canSaveHistory && items.length === 0 ? (
        <Paper sx={{ p: 4 }}>
          <Typography variant="h3">まだありません</Typography>
          <Typography color="text.secondary" sx={{ mt: 1.5 }}>
            本人向け画面で「保存して次へ」を押すと、ここに出ます。
          </Typography>
        </Paper>
      ) : canSaveHistory ? (
        <Stack spacing={2}>
          {items.map((item) => {
            const guidance = buildColorGuidance(item);

            return (
              <Paper key={item.id} sx={{ overflow: 'hidden' }}>
                <Stack direction={{ xs: 'column', lg: 'row' }} sx={{ minHeight: { lg: 260 } }}>
                  <Box
                    sx={{
                      backgroundColor: '#E4EBF0',
                      minWidth: { lg: 300 },
                      width: { xs: '100%', lg: 300 },
                    }}
                  >
                    <HistoryImage record={item} />
                  </Box>

                  <Stack spacing={2.25} sx={{ flexGrow: 1, p: { xs: 2.5, md: 3 } }}>
                    <Stack
                      direction={{ xs: 'column', md: 'row' }}
                      spacing={1.5}
                      sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
                    >
                      <Box>
                        <Typography color="text.secondary" fontWeight={700}>
                          保存した日時
                        </Typography>
                        <Typography sx={{ fontSize: '1.15rem', fontWeight: 800 }}>
                          {formatCreatedAt(item)}
                        </Typography>
                      </Box>

                      <Paper
                        sx={{
                          backgroundColor: '#E3F3ED',
                          boxShadow: 'none',
                          color: 'primary.dark',
                          p: 1.5,
                          width: 'fit-content',
                        }}
                      >
                        <Typography sx={{ fontSize: '0.95rem', fontWeight: 800 }}>色</Typography>
                        <Typography sx={{ fontSize: '2rem', fontWeight: 900 }}>
                          {guidance.headline}
                        </Typography>
                      </Paper>
                    </Stack>

                    <Typography sx={{ fontSize: '1.2rem', fontWeight: 700 }}>
                      色は {guidance.headline} です
                    </Typography>

                    <Box component="dl" sx={{ display: 'grid', gap: 1.25, m: 0 }}>
                      <Box
                        sx={{
                          alignItems: 'center',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 2,
                        }}
                      >
                        <Typography component="dt" sx={{ fontWeight: 700, m: 0 }}>
                          明るさ
                        </Typography>
                        <Typography component="dd" sx={{ fontSize: '1.15rem', fontWeight: 800, m: 0 }}>
                          {item.valueInfo.name}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          alignItems: 'center',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 2,
                        }}
                      >
                        <Typography component="dt" sx={{ fontWeight: 700, m: 0 }}>
                          色のつよさ
                        </Typography>
                        <Typography component="dd" sx={{ fontSize: '1.15rem', fontWeight: 800, m: 0 }}>
                          {item.saturationInfo.name}
                        </Typography>
                      </Box>
                    </Box>

                    <Button
                      color="error"
                      onClick={() => setItemToDelete(item)}
                      startIcon={<DeleteOutlineOutlinedIcon />}
                      sx={{ alignSelf: 'flex-start' }}
                      variant="outlined"
                    >
                      この記録を消す
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      ) : null}

      <Dialog onClose={() => setItemToDelete(null)} open={Boolean(itemToDelete)}>
        <DialogTitle>この記録を消しますか</DialogTitle>
        <DialogContent>
          <DialogContentText>
            この操作は元に戻せません。消してよいときだけ「消す」を押してください。
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
            {deletingId === itemToDelete?.id ? '消しています' : '消す'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog onClose={() => setIsClearDialogOpen(false)} open={isClearDialogOpen}>
        <DialogTitle>この端末の記録をすべて消しますか</DialogTitle>
        <DialogContent>
          <DialogContentText>
            保存した記録をすべて消します。この操作は元に戻せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setIsClearDialogOpen(false)} variant="outlined">
            やめる
          </Button>
          <Button color="error" disabled={isClearingAll} onClick={handleClearAll} variant="contained">
            {isClearingAll ? '消しています' : 'すべて消す'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export default FabricGallery;
