import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

import type { FabricHistoryExport, LocalExportRecord, LocalFabricRecord } from '../types/fabric';
import type { ColorAnalysisResult } from '../utils/colorUtils';

const DB_NAME = 'fabric-local-history';
const DB_VERSION = 1;
const STORE_NAME = 'records';
const CHANGE_EVENT_NAME = 'fabric-history-changed';

export const MAX_HISTORY_RECORDS = 100;
export const MAX_IMPORT_FILE_BYTES = 20 * 1024 * 1024;
export const EXPORT_FILE_NAME = 'fabric-history.v2.json';

const CANONICAL_HUE_NAMES: Record<number, string> = {
  0: 'グレー系',
  1: '赤',
  2: 'オレンジ',
  3: '黄',
  4: '緑',
  5: '水色',
  6: '青',
  7: '紫',
  8: 'ピンク',
};

const LEGACY_HUE_NAMES = new Set(['無彩色', '赤', 'オレンジ', '黄', '緑', 'シアン', '青', '紫', 'マゼンタ']);
const CANONICAL_SATURATION_NAMES = new Set(['色が少ない', 'おだやか', 'はっきり']);
const LEGACY_SATURATION_NAMES = new Set(['無彩色', '鈍い', '鮮やか']);
const CANONICAL_VALUE_NAMES: Record<number, string> = {
  0: '黒に近い',
  1: '暗い',
  2: 'ふつう',
  3: '明るい',
  4: '白に近い',
};
const LEGACY_VALUE_NAMES = new Set(['黒', '暗', '中', '明', '白']);

interface FabricHistoryDatabase extends DBSchema {
  records: {
    key: string;
    value: StoredFabricRecord;
    indexes: {
      'by-created-at': number;
    };
  };
}

interface StoredFabricRecord extends Omit<LocalFabricRecord, 'previewBlob'> {
  previewBytes: ArrayBuffer;
  previewType: string;
}

export interface ImportSummary {
  importedCount: number;
  skippedCount: number;
}

let databasePromise: Promise<IDBPDatabase<FabricHistoryDatabase>> | null = null;
const fallbackEventTarget = new EventTarget();

function getChangeEventTarget(): EventTarget {
  return typeof window !== 'undefined' ? window : fallbackEventTarget;
}

function notifyHistoryChanged() {
  getChangeEventTarget().dispatchEvent(new Event(CHANGE_EVENT_NAME));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isByte(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0 && value <= 255;
}

function isHsv(value: unknown): value is { h: number; s: number; v: number } {
  if (!isRecord(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const h = candidate.h;
  const s = candidate.s;
  const v = candidate.v;

  return (
    isFiniteNumber(h) &&
    h >= 0 &&
    h <= 360 &&
    isFiniteNumber(s) &&
    s >= 0 &&
    s <= 1 &&
    isFiniteNumber(v) &&
    v >= 0 &&
    v <= 1
  );
}

function isHueInfo(value: unknown): value is { category: number; name: string } {
  if (!isRecord(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const category = candidate.category;
  const name = candidate.name;

  return (
    isFiniteNumber(category) &&
    Number.isInteger(category) &&
    category >= 0 &&
    category <= 8 &&
    typeof name === 'string' &&
    (name === CANONICAL_HUE_NAMES[category] || LEGACY_HUE_NAMES.has(name))
  );
}

function isSaturationInfo(value: unknown): value is { name: string } {
  if (!isRecord(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === 'string' &&
    (CANONICAL_SATURATION_NAMES.has(candidate.name) || LEGACY_SATURATION_NAMES.has(candidate.name))
  );
}

function isValueInfo(value: unknown): value is { category: number; name: string } {
  if (!isRecord(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const category = candidate.category;
  const name = candidate.name;

  return (
    isFiniteNumber(category) &&
    Number.isInteger(category) &&
    category >= 0 &&
    category <= 4 &&
    typeof name === 'string' &&
    (name === CANONICAL_VALUE_NAMES[category] || LEGACY_VALUE_NAMES.has(name))
  );
}

function isDominantRgb(value: unknown): value is { r: number; g: number; b: number } {
  if (!isRecord(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return isByte(candidate.r) && isByte(candidate.g) && isByte(candidate.b);
}

function canonicalizeHueInfo(value: { category: number; name: string }): { category: number; name: string } {
  return {
    category: value.category,
    name: CANONICAL_HUE_NAMES[value.category],
  };
}

function canonicalizeSaturationInfo(value: { name: string }): { name: string } {
  const saturationNameMap: Record<string, string> = {
    はっきり: 'はっきり',
    無彩色: '色が少ない',
    色が少ない: '色が少ない',
    鈍い: 'おだやか',
    おだやか: 'おだやか',
    鮮やか: 'はっきり',
  };

  return {
    name: saturationNameMap[value.name],
  };
}

function canonicalizeValueInfo(value: { category: number; name: string }): { category: number; name: string } {
  return {
    category: value.category,
    name: CANONICAL_VALUE_NAMES[value.category],
  };
}

function normalizeAnalysis(value: unknown): ColorAnalysisResult {
  if (!isRecord(value)) {
    throw new Error('解析結果の形式が不正です。');
  }

  const { dominantRgb, hsv, hueInfo, saturationInfo, valueInfo } = value;

  if (!isDominantRgb(dominantRgb)) {
    throw new Error('dominantRgb が不正です。');
  }

  if (!isHsv(hsv)) {
    throw new Error('hsv が不正です。');
  }

  if (!isHueInfo(hueInfo)) {
    throw new Error('hueInfo が不正です。');
  }

  if (!isSaturationInfo(saturationInfo)) {
    throw new Error('saturationInfo が不正です。');
  }

  if (!isValueInfo(valueInfo)) {
    throw new Error('valueInfo が不正です。');
  }

  return {
    dominantRgb: {
      b: dominantRgb.b,
      g: dominantRgb.g,
      r: dominantRgb.r,
    },
    hsv: {
      h: hsv.h,
      s: hsv.s,
      v: hsv.v,
    },
    hueInfo: canonicalizeHueInfo(hueInfo),
    saturationInfo: canonicalizeSaturationInfo(saturationInfo),
    valueInfo: canonicalizeValueInfo(valueInfo),
  };
}

function validateRecordId(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 128) {
    throw new Error('id が不正です。');
  }
}

function validateCreatedAtMs(value: unknown): asserts value is number {
  if (!isFiniteNumber(value) || value <= 0) {
    throw new Error('createdAtMs が不正です。');
  }
}

function isBlobLike(value: unknown): value is Blob {
  return (
    value instanceof Blob ||
    (isRecord(value) &&
      typeof value.size === 'number' &&
      typeof value.type === 'string' &&
      typeof value.arrayBuffer === 'function')
  );
}

function assertBlob(value: unknown): asserts value is Blob {
  if (!isBlobLike(value) || value.type !== 'image/jpeg' || value.size === 0) {
    throw new Error('previewBlob が不正です。');
  }
}

function toArrayBuffer(value: unknown): ArrayBuffer | null {
  if (value instanceof ArrayBuffer) {
    return value;
  }

  if (ArrayBuffer.isView(value)) {
    const bytes = new Uint8Array(value.byteLength);
    bytes.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
    return bytes.buffer;
  }

  if (Object.prototype.toString.call(value) === '[object ArrayBuffer]') {
    return value as ArrayBuffer;
  }

  return null;
}

function normalizePersistedRecord(value: unknown): StoredFabricRecord {
  if (!isRecord(value)) {
    throw new Error('記録の形式が不正です。');
  }

  validateRecordId(value.id);
  validateCreatedAtMs(value.createdAtMs);
  const analysis = normalizeAnalysis(value);
  const previewBytes = toArrayBuffer(value.previewBytes);
  const previewType = value.previewType;

  if (!previewBytes || previewBytes.byteLength === 0) {
    throw new Error('previewBytes が不正です。');
  }

  if (previewType !== 'image/jpeg') {
    throw new Error('previewType が不正です。');
  }

  return {
    ...analysis,
    createdAtMs: value.createdAtMs,
    id: value.id,
    previewBytes,
    previewType,
  };
}

function normalizeRecordForStorage(value: unknown): LocalFabricRecord {
  if (!isRecord(value)) {
    throw new Error('記録の形式が不正です。');
  }

  validateRecordId(value.id);
  validateCreatedAtMs(value.createdAtMs);
  const analysis = normalizeAnalysis(value);
  assertBlob(value.previewBlob);

  return {
    ...analysis,
    createdAtMs: value.createdAtMs,
    id: value.id,
    previewBlob: value.previewBlob,
  };
}

async function serializeRecord(record: LocalFabricRecord): Promise<StoredFabricRecord> {
  return {
    createdAtMs: record.createdAtMs,
    dominantRgb: record.dominantRgb,
    hsv: record.hsv,
    hueInfo: record.hueInfo,
    id: record.id,
    previewBytes: await blobToArrayBuffer(record.previewBlob),
    previewType: record.previewBlob.type,
    saturationInfo: record.saturationInfo,
    valueInfo: record.valueInfo,
  };
}

function deserializeRecord(record: StoredFabricRecord): LocalFabricRecord {
  return {
    createdAtMs: record.createdAtMs,
    dominantRgb: record.dominantRgb,
    hsv: record.hsv,
    hueInfo: record.hueInfo,
    id: record.id,
    previewBlob: new Blob([record.previewBytes], { type: record.previewType }),
    saturationInfo: record.saturationInfo,
    valueInfo: record.valueInfo,
  };
}

function assertSupported(): void {
  if (!isLocalHistorySupported()) {
    throw new Error('このブラウザでは端末内の記録保存に対応していません。');
  }
}

async function getDatabase(): Promise<IDBPDatabase<FabricHistoryDatabase>> {
  assertSupported();

  if (!databasePromise) {
    databasePromise = openDB<FabricHistoryDatabase>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        const store = database.createObjectStore(STORE_NAME, {
          keyPath: 'id',
        });

        store.createIndex('by-created-at', 'createdAtMs');
      },
    });
  }

  return databasePromise;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('画像データの変換に失敗しました。'));
        return;
      }

      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error('画像データの変換に失敗しました。'));
    reader.readAsDataURL(blob);
  });
}

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return await blob.arrayBuffer();
  }

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (!(reader.result instanceof ArrayBuffer)) {
        reject(new Error('画像データの変換に失敗しました。'));
        return;
      }

      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error('画像データの変換に失敗しました。'));
    reader.readAsArrayBuffer(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:(image\/jpeg);base64,(.+)$/);
  if (!match) {
    throw new Error('previewDataUrl が不正です。');
  }

  const bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: match[1] });
}

async function loadImage(source: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('画像の読み込みに失敗しました。'));
    image.src = source;
  });
}

async function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('画像の縮小保存に失敗しました。'));
          return;
        }

        resolve(blob);
      },
      'image/jpeg',
      0.82,
    );
  });
}

export function isLocalHistorySupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof indexedDB !== 'undefined' &&
    typeof Blob !== 'undefined' &&
    typeof FileReader !== 'undefined'
  );
}

export async function createPreviewBlob(imageDataUrl: string): Promise<Blob> {
  const image = await loadImage(imageDataUrl);
  const maxSide = 640;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('画像の縮小保存に失敗しました。');
  }

  context.drawImage(image, 0, 0, width, height);
  return await canvasToJpegBlob(canvas);
}

export async function saveLocalFabricRecord(record: LocalFabricRecord): Promise<void> {
  await saveLocalFabricRecordInternal(record, true);
}

async function saveLocalFabricRecordInternal(
  record: LocalFabricRecord,
  notifyOnComplete: boolean,
): Promise<void> {
  const normalizedRecord = normalizeRecordForStorage(record);
  const serializedRecord = await serializeRecord(normalizedRecord);
  const database = await getDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  await store.put(serializedRecord);
  const count = await store.count();

  if (count > MAX_HISTORY_RECORDS) {
    let overflow = count - MAX_HISTORY_RECORDS;
    let cursor = await store.index('by-created-at').openCursor();

    while (cursor && overflow > 0) {
      await cursor.delete();
      overflow -= 1;
      cursor = await cursor.continue();
    }
  }

  await transaction.done;

  if (notifyOnComplete) {
    notifyHistoryChanged();
  }
}

export async function saveLocalFabricCapture(
  imageDataUrl: string,
  analysis: ColorAnalysisResult,
): Promise<{ id: string }> {
  const record: LocalFabricRecord = {
    ...analysis,
    createdAtMs: Date.now(),
    id: crypto.randomUUID(),
    previewBlob: await createPreviewBlob(imageDataUrl),
  };

  await saveLocalFabricRecord(record);
  return { id: record.id };
}

export async function listLocalFabricRecords(): Promise<LocalFabricRecord[]> {
  const database = await getDatabase();
  const records = await database.getAll(STORE_NAME);

  return records
    .map((record) => deserializeRecord(normalizePersistedRecord(record)))
    .sort((left, right) => right.createdAtMs - left.createdAtMs);
}

export async function deleteLocalFabricRecord(recordId: string): Promise<void> {
  validateRecordId(recordId);
  const database = await getDatabase();
  await database.delete(STORE_NAME, recordId);
  notifyHistoryChanged();
}

export async function clearLocalHistory(): Promise<void> {
  const database = await getDatabase();
  await database.clear(STORE_NAME);
  notifyHistoryChanged();
}

export function subscribeToLocalHistory(listener: () => void): () => void {
  const target = getChangeEventTarget();
  target.addEventListener(CHANGE_EVENT_NAME, listener);

  return () => {
    target.removeEventListener(CHANGE_EVENT_NAME, listener);
  };
}

export async function buildLocalHistoryExport(): Promise<FabricHistoryExport> {
  const records = await listLocalFabricRecords();
  const exportedRecords = await Promise.all(
    records.map(async (record): Promise<LocalExportRecord> => ({
      createdAtMs: record.createdAtMs,
      dominantRgb: record.dominantRgb,
      hsv: record.hsv,
      hueInfo: record.hueInfo,
      id: record.id,
      previewDataUrl: await blobToDataUrl(record.previewBlob),
      saturationInfo: record.saturationInfo,
      valueInfo: record.valueInfo,
    })),
  );

  return {
    exportedAt: new Date().toISOString(),
    records: exportedRecords,
    version: 2,
  };
}

function normalizeImportRecord(value: unknown): LocalFabricRecord {
  if (!isRecord(value)) {
    throw new Error('取り込みデータの形式が不正です。');
  }

  validateRecordId(value.id);
  validateCreatedAtMs(value.createdAtMs);
  const analysis = normalizeAnalysis(value);

  if (typeof value.previewDataUrl !== 'string') {
    throw new Error('previewDataUrl が不正です。');
  }

  return {
    ...analysis,
    createdAtMs: value.createdAtMs,
    id: value.id,
    previewBlob: dataUrlToBlob(value.previewDataUrl),
  };
}

export async function importLocalHistoryExport(payload: unknown): Promise<ImportSummary> {
  if (!isRecord(payload)) {
    throw new Error('取り込みファイルの形式が不正です。');
  }

  if (payload.version !== 1 && payload.version !== 2) {
    throw new Error('対応していない取り込みファイルです。');
  }

  if (!Array.isArray(payload.records)) {
    throw new Error('records が不正です。');
  }

  if (payload.records.length > MAX_HISTORY_RECORDS) {
    throw new Error('取り込み件数が多すぎます。');
  }

  const records = payload.records.map((record) => normalizeImportRecord(record));
  const existingRecords = await listLocalFabricRecords();
  const existingIds = new Set(existingRecords.map((record) => record.id));

  let importedCount = 0;
  let skippedCount = 0;

  for (const record of records) {
    if (existingIds.has(record.id)) {
      skippedCount += 1;
      continue;
    }

    await saveLocalFabricRecordInternal(record, false);
    existingIds.add(record.id);
    importedCount += 1;
  }

  if (importedCount > 0) {
    notifyHistoryChanged();
  }

  return {
    importedCount,
    skippedCount,
  };
}
