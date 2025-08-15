/**
 * 色分析の結果を表す型定義
 */
export interface ColorAnalysisResult {
  dominantRgb: { r: number; g: number; b: number };
  hsv: { h: number; s: number; v: number };
  hueInfo: { category: number; name: string };
  saturationInfo: { name: string }; // 彩度情報を追加
  valueInfo: { category: number; name: string };
  group: string;
}

/**
 * RGBをHSVに変換する
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

// 色相の分類カテゴリ（無彩色を追加）
export const HUE_CATEGORIES: { [key: number]: string } = {
    0: '無彩色', // Achromatic
    1: '赤',       // Red
    2: 'オレンジ', // Orange
    3: '黄',       // Yellow
    4: '緑',       // Green
    5: 'シアン',   // Cyan
    6: '青',       // Blue
    7: '紫',       // Purple
    8: 'マゼンタ'  // Magenta
};

/**
 * 色相(H)を人間が知覚しやすいように8カテゴリに分類する
 * @param h - Hue (0-360)
 * @returns カテゴリ(1-8)と色名
 */
export function classifyHue(h: number): { category: number; name: string } {
    let category: number;

    if (h >= 345 || h < 15) {
        category = 1; // 赤
    } else if (h < 45) {
        category = 2; // オレンジ
    } else if (h < 75) {
        category = 3; // 黄
    } else if (h < 150) {
        category = 4; // 緑 (範囲を広げる)
    } else if (h < 210) {
        category = 5; // シアン
    } else if (h < 255) {
        category = 6; // 青
    } else if (h < 300) {
        category = 7; // 紫
    } else { // h < 345
        category = 8; // マゼンタ
    }

    return { category, name: HUE_CATEGORIES[category] };
}

/**
 * 彩度(S)に基づいて色の種類を分類する（鮮やか / 鈍い / 無彩色）
 * @param s - Saturation (0-1 from HSV)
 * @returns 彩度の名称
 */
export function classifySaturation(s: number): { name: string } {
    if (s < 0.1) return { name: '無彩色' };
    if (s < 0.6) return { name: '鈍い' };
    return { name: '鮮やか' };
}


/**
 * 明度(V)を5段階に分類する (黒、暗、中、明、白)
 * @param s - Saturation (0-1 from HSV)
 * @param v - Value (0-1 from HSV)
 * @returns カテゴリ(0:黒, 1:暗, 2:中, 3:明, 4:白)と名称
 */
export function classifyValue(s: number, v: number): { category: number; name: string } {
  if (v < 0.2) return { category: 0, name: '黒' };
  if (s < 0.1 && v > 0.9) return { category: 4, name: '白' };
  if (v <= 0.4) return { category: 1, name: '暗' };
  if (v <= 0.7) return { category: 2, name: '中' };
  return { category: 3, name: '明' };
}


/**
 * グループ記号を生成する
 * @param hueInfo - 色相の分類結果
 * @param valueInfo - 明度の分類結果
 * @returns グループ記号 (例: C1-3, N-0)
 */
export function getGroupName(
    hueInfo: { category: number },
    valueInfo: { category: number },
    saturationInfo: { name: string }
): string {
  // 無彩色の場合は特別なグループ名 "N" (Neutral) を使用
  if (saturationInfo.name === '無彩色') {
    return `N-${valueInfo.category}`;
  }
  return `C${hueInfo.category}-${valueInfo.category}`;
}