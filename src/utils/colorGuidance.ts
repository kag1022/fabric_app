import type { ColorAnalysisResult } from './colorUtils';

export interface ColorGuidance {
  headline: string;
  detailLine: string;
  isAmbiguous: boolean;
  secondaryHeadline?: string;
  speechText: string;
}

interface ColorGuidanceOptions {
  secondaryResult?: ColorAnalysisResult;
  secondaryWeightRatio?: number;
}

export const AMBIGUOUS_COLOR_RATIO_THRESHOLD = 0.8;

function getReadableColorName(result: ColorAnalysisResult): string {
  if (result.hueInfo.category !== 0) {
    const { h, s, v } = result.hsv;

    if ((h >= 345 || h < 20) && s >= 0.35 && v <= 0.45) {
      return 'えんじ';
    }

    if (h >= 20 && h < 50 && s >= 0.35 && v > 0.2 && v <= 0.6) {
      return '茶';
    }

    if (h >= 20 && h < 60 && s < 0.35 && v >= 0.75) {
      return 'ベージュ';
    }

    if (h >= 75 && h < 105 && s >= 0.2 && v > 0.35) {
      return '黄緑';
    }

    if (h >= 210 && h < 255 && v <= 0.4) {
      return '紺';
    }

    return result.hueInfo.name;
  }

  if (result.valueInfo.category === 0) {
    return '黒';
  }

  if (result.valueInfo.category === 4) {
    return '白';
  }

  return 'グレー';
}

export function buildColorGuidance(
  result: ColorAnalysisResult,
  options: ColorGuidanceOptions = {},
): ColorGuidance {
  const colorName = getReadableColorName(result);
  const secondaryColorName = options.secondaryResult
    ? getReadableColorName(options.secondaryResult)
    : undefined;
  const isAmbiguous =
    Boolean(secondaryColorName) &&
    typeof options.secondaryWeightRatio === 'number' &&
    options.secondaryWeightRatio >= AMBIGUOUS_COLOR_RATIO_THRESHOLD &&
    secondaryColorName !== colorName;
  const detailLine = `明るさは ${result.valueInfo.name} です。色のつよさは ${result.saturationInfo.name} です。`;
  const speechText = isAmbiguous
    ? `色は ${colorName} か ${secondaryColorName} です。${detailLine}`
    : `色は ${colorName} です。${detailLine}`;

  return {
    headline: colorName,
    detailLine,
    isAmbiguous,
    secondaryHeadline: isAmbiguous ? secondaryColorName : undefined,
    speechText,
  };
}
