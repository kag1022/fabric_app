import { expect, test } from 'vitest';

import { buildColorGuidance } from './colorGuidance';
import type { ColorAnalysisResult } from './colorUtils';

const sampleResult: ColorAnalysisResult = {
  dominantRgb: { r: 120, g: 30, b: 20 },
  hsv: { h: 4, s: 0.83, v: 0.47 },
  hueInfo: { category: 1, name: '赤' },
  saturationInfo: { name: 'はっきり' },
  valueInfo: { category: 3, name: '明るい' },
};

test('builds a color-first message without sorting instructions', () => {
  const guidance = buildColorGuidance(sampleResult);

  expect(guidance.headline).toBe('赤');
  expect(guidance.detailLine).toContain('明るさは 明るい です');
  expect(guidance.detailLine).toContain('色のつよさは はっきり です');
  expect(guidance.speechText).toContain('色は 赤 です');
  expect(guidance.speechText).not.toContain('グループ');
  expect(guidance.speechText).not.toContain('箱');
});

test('maps achromatic results to a simple color name', () => {
  const guidance = buildColorGuidance({
    ...sampleResult,
    hueInfo: { category: 0, name: 'グレー系' },
    saturationInfo: { name: '色が少ない' },
    valueInfo: { category: 4, name: '白に近い' },
  });

  expect(guidance.headline).toBe('白');
});
