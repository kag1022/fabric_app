import { expect, test } from 'vitest';

import { buildFabricGuidance } from './fabricGuidance';
import type { ColorAnalysisResult } from './colorUtils';

const sampleResult: ColorAnalysisResult = {
  dominantRgb: { r: 120, g: 30, b: 20 },
  group: 'C1-3',
  hsv: { h: 4, s: 0.83, v: 0.47 },
  hueInfo: { category: 1, name: '赤' },
  saturationInfo: { name: '鮮やか' },
  valueInfo: { category: 3, name: '明' },
};

test('builds a human-friendly instruction and speech text', () => {
  const guidance = buildFabricGuidance(sampleResult);

  expect(guidance.supportCode).toBe('C1-3');
  expect(guidance.headline).toBe('赤 / 明');
  expect(guidance.instruction).toContain('グループ C1-3');
  expect(guidance.speechText).toContain('赤、明です');
});
