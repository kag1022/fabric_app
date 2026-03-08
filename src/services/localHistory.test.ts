import { beforeEach, describe, expect, test } from 'vitest';

import type { ColorAnalysisResult } from '../utils/colorUtils';
import type { LocalExportRecord, LocalFabricRecord } from '../types/fabric';
import {
  buildLocalHistoryExport,
  clearLocalHistory,
  importLocalHistoryExport,
  listLocalFabricRecords,
  MAX_HISTORY_RECORDS,
  saveLocalFabricRecord,
} from './localHistory';

const BASE_ANALYSIS: ColorAnalysisResult = {
  dominantRgb: { b: 56, g: 34, r: 12 },
  hsv: { h: 24, s: 0.5, v: 0.4 },
  hueInfo: { category: 1, name: '赤' },
  saturationInfo: { name: 'おだやか' },
  valueInfo: { category: 2, name: 'ふつう' },
};

function createRecord(index: number): LocalFabricRecord {
  return {
    ...BASE_ANALYSIS,
    createdAtMs: 1_700_000_000_000 + index,
    id: `record-${index}`,
    previewBlob: new Blob([`preview-${index}`], { type: 'image/jpeg' }),
  };
}

function createExportRecord(index: number): LocalExportRecord {
  return {
    ...BASE_ANALYSIS,
    createdAtMs: 1_700_000_000_000 + index,
    id: `export-${index}`,
    previewDataUrl: 'data:image/jpeg;base64,AA==',
  };
}

describe('localHistory', () => {
  beforeEach(async () => {
    await clearLocalHistory();
  });

  test('stores and returns the newest records first', async () => {
    await saveLocalFabricRecord(createRecord(1));
    await saveLocalFabricRecord(createRecord(2));

    const records = await listLocalFabricRecords();

    expect(records).toHaveLength(2);
    expect(records[0]?.id).toBe('record-2');
    expect(records[1]?.id).toBe('record-1');
  });

  test('prunes records after reaching the history limit', async () => {
    for (let index = 0; index < MAX_HISTORY_RECORDS + 1; index += 1) {
      await saveLocalFabricRecord(createRecord(index));
    }

    const records = await listLocalFabricRecords();

    expect(records).toHaveLength(MAX_HISTORY_RECORDS);
    expect(records.some((record) => record.id === 'record-0')).toBe(false);
    expect(records[0]?.id).toBe(`record-${MAX_HISTORY_RECORDS}`);
  });

  test('exports and imports version 2 history records', async () => {
    await saveLocalFabricRecord(createRecord(7));

    const exported = await buildLocalHistoryExport();
    await clearLocalHistory();

    const result = await importLocalHistoryExport(exported);
    const records = await listLocalFabricRecords();

    expect(exported.version).toBe(2);
    expect(result).toEqual({ importedCount: 1, skippedCount: 0 });
    expect(records).toHaveLength(1);
    expect(records[0]?.id).toBe('record-7');
    expect(records[0]?.previewBlob.type).toBe('image/jpeg');
  });

  test('imports legacy version 1 payloads and normalizes labels', async () => {
    const result = await importLocalHistoryExport({
      exportedAt: '2026-03-08T00:00:00.000Z',
      records: [
        {
          ...createExportRecord(1),
          group: 'C1-2',
          saturationInfo: { name: '鮮やか' },
          valueInfo: { category: 3, name: '明' },
        },
      ],
      version: 1,
    });

    const records = await listLocalFabricRecords();

    expect(result).toEqual({ importedCount: 1, skippedCount: 0 });
    expect(records[0]?.saturationInfo.name).toBe('はっきり');
    expect(records[0]?.valueInfo.name).toBe('明るい');
  });

  test('rejects invalid import payloads', async () => {
    await expect(
      importLocalHistoryExport({
        records: [],
        version: 3,
      }),
    ).rejects.toThrow('対応していない取り込みファイルです。');
  });
});
