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

// 色相を8分類に変更
export const HUE_CATEGORIES: { [key: number]: string } = {
    1: '赤',       // Red
    2: 'オレンジ', // Orange
    3: '黄',       // Yellow
    4: '緑',       // Green
    5: 'シアン',   // Cyan
    6: '青',       // Blue
    7: '紫',   // Purple
    8: 'マゼンタ'  // Magenta
};



/**
 * 色相(H)を8カテゴリに分類する
 * @param h - Hue (0-360)
 * @returns カテゴリ(1-8)と色名
 */
export function classifyHue(h: number): { category: number; name: string } {
  const degree = h;
  let category: number;

  if (degree >= 337.5 || degree < 22.5) {
    category = 1; // 赤
  } else if (degree < 67.5) {
    category = 2; // オレンジ
  } else if (degree < 112.5) {
    category = 3; // 黄
  } else if (degree < 157.5) {
    category = 4; // 緑
  } else if (degree < 202.5) {
    category = 5; // シアン
  } else if (degree < 247.5) {
    category = 6; // 青
  } else if (degree < 292.5) {
    category = 7; // 紫
  } else {
    category = 8; // マゼンタ
  }

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