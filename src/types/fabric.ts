import type { ColorAnalysisResult } from '../utils/colorUtils';

export interface LocalFabricRecord extends ColorAnalysisResult {
  id: string;
  createdAtMs: number;
  previewBlob: Blob;
}

export interface LocalExportRecord extends Omit<LocalFabricRecord, 'previewBlob'> {
  previewDataUrl: string;
}

export interface FabricHistoryExport {
  version: 1;
  exportedAt: string;
  records: LocalExportRecord[];
}
