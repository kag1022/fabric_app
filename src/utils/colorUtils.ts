/**
 * 色分析の結果を表す型定義
 */
export interface ColorAnalysisResult {
  dominantRgb: { r: number; g: number; b: number };
  hsv: { h: number; s: number; v: number };
  hueInfo: { category: number; name: string };
  valueInfo: { category: number; name: string };
  group: string;
}

/**
 * RGBをHSVに変換する
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns HSV object { h: 0-360, s: 0-1, v: 0-1 }
 */
export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, v = max;

  const d = max - min;
  s = max === 0 ? 0 : d / max;

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s, v: v };
}

const HUE_CATEGORIES: { [key: number]: string } = {
    1: '赤', 2: '赤橙', 3: '橙', 4: '黄橙', 5: '橙黄', 6: '黄',
    7: '黄緑', 8: '緑黄', 9: '若草', 10: '緑', 11: '青緑', 12: '緑青',
    13: 'シアン', 14: '空色', 15: '水色', 16: '青', 17: '青藍', 18: '藍',
    19: '紺青', 20: '青紫', 21: '紫', 22: '赤紫', 23: 'マゼンタ', 24: '紅',
    25: '赤', 26: '赤橙', 27: '橙', 28: '黄橙', 29: '橙黄', 30: '黄',
    31: '黄緑', 32: '緑黄', 33: '若草', 34: '緑', 35: '青緑', 36: '緑青'
};

/**
 * 色相(H)を36カテゴリに分類する
 * @param h - Hue (0-360)
 * @returns カテゴリ(1-36)と色名
 */
export function classifyHue(h: number): { category: number; name: string } {
  if (h >= 355 || h < 5) return { category: 1, name: '赤' }; // 赤 (Red) - Special case for wraparound
  const category = Math.floor((h - 5) / 10) + 2;
  const name = HUE_CATEGORIES[category] || '不明';
  return { category, name };
}

/**
 * 明度(V)を3段階に分類する
 * @param v - Value (0-1 from HSV)
 * @returns カテゴリ(1:暗, 2:中, 3:明)と名称
 */
export function classifyValue(v: number): { category: number; name: string } {
  const value255 = v * 255;
  if (value255 <= 85) return { category: 1, name: '暗' };
  if (value255 <= 170) return { category: 2, name: '中' };
  return { category: 3, name: '明' };
}

/**
 * グループ記号を生成する
 * @param hueInfo - 色相の分類結果
 * @param valueInfo - 明度の分類結果
 * @returns グループ記号 (例: C1-1)
 */
export function getGroupName(hueInfo: { category: number }, valueInfo: { category: number }): string {
  return `C${hueInfo.category}-${valueInfo.category}`;
}
