import type { ColorAnalysisResult } from './colorUtils';

export interface ColorGuidance {
  headline: string;
  detailLine: string;
  speechText: string;
}

function getReadableColorName(result: ColorAnalysisResult): string {
  if (result.hueInfo.category !== 0) {
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

export function buildColorGuidance(result: ColorAnalysisResult): ColorGuidance {
  const colorName = getReadableColorName(result);
  const detailLine = `明るさは ${result.valueInfo.name} です。色のつよさは ${result.saturationInfo.name} です。`;

  return {
    headline: colorName,
    detailLine,
    speechText: `色は ${colorName} です。${detailLine}`,
  };
}
