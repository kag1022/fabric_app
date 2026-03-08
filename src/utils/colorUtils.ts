export interface ColorAnalysisResult {
  dominantRgb: { r: number; g: number; b: number };
  hsv: { h: number; s: number; v: number };
  hueInfo: { category: number; name: string };
  saturationInfo: { name: string };
  valueInfo: { category: number; name: string };
}

export const HUE_CATEGORIES: Record<number, string> = {
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

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const normalizedRed = r / 255;
  const normalizedGreen = g / 255;
  const normalizedBlue = b / 255;

  const max = Math.max(normalizedRed, normalizedGreen, normalizedBlue);
  const min = Math.min(normalizedRed, normalizedGreen, normalizedBlue);
  const delta = max - min;

  let hue = 0;
  const saturation = max === 0 ? 0 : delta / max;
  const value = max;

  if (max !== min) {
    switch (max) {
      case normalizedRed:
        hue = (normalizedGreen - normalizedBlue) / delta + (normalizedGreen < normalizedBlue ? 6 : 0);
        break;
      case normalizedGreen:
        hue = (normalizedBlue - normalizedRed) / delta + 2;
        break;
      default:
        hue = (normalizedRed - normalizedGreen) / delta + 4;
        break;
    }

    hue /= 6;
  }

  return { h: hue * 360, s: saturation, v: value };
}

export function classifyHue(h: number): { category: number; name: string } {
  let category: number;

  if (h >= 345 || h < 15) {
    category = 1;
  } else if (h < 45) {
    category = 2;
  } else if (h < 75) {
    category = 3;
  } else if (h < 150) {
    category = 4;
  } else if (h < 210) {
    category = 5;
  } else if (h < 255) {
    category = 6;
  } else if (h < 300) {
    category = 7;
  } else {
    category = 8;
  }

  return { category, name: HUE_CATEGORIES[category] };
}

export function classifySaturation(s: number): { name: string } {
  if (s < 0.1) {
    return { name: '色が少ない' };
  }

  if (s < 0.6) {
    return { name: 'おだやか' };
  }

  return { name: 'はっきり' };
}

export function classifyValue(s: number, v: number): { category: number; name: string } {
  if (v < 0.2) {
    return { category: 0, name: '黒に近い' };
  }

  if (s < 0.1 && v > 0.9) {
    return { category: 4, name: '白に近い' };
  }

  if (v <= 0.4) {
    return { category: 1, name: '暗い' };
  }

  if (v <= 0.7) {
    return { category: 2, name: 'ふつう' };
  }

  return { category: 3, name: '明るい' };
}
