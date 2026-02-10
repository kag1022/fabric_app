import Dexie, { Table } from 'dexie';
import { ColorAnalysisResult } from './utils/colorUtils';

export interface FabricItem extends ColorAnalysisResult {
  id?: number; // IndexedDBのオートインクリメントID
  imageBlob: Blob; // 画像データそのものをBlobとして保存
  createdAt: Date;
}

export class FabricDatabase extends Dexie {
  fabrics!: Table<FabricItem, number>;

  constructor() {
    super('FabricDatabase');
    this.version(1).stores({
      fabrics: '++id, createdAt, group'
    });
  }
}

export const db = new FabricDatabase();
