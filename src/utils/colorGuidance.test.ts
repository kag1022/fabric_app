import { expect, test } from 'vitest';

import { AMBIGUOUS_COLOR_RATIO_THRESHOLD, buildColorGuidance } from './colorGuidance';
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

test('maps dark red colors to えんじ', () => {
  const guidance = buildColorGuidance({
    ...sampleResult,
    hsv: { h: 5, s: 0.62, v: 0.4 },
    hueInfo: { category: 1, name: '赤' },
  });

  expect(guidance.headline).toBe('えんじ');
});

test('maps dark orange-yellow colors to 茶', () => {
  const guidance = buildColorGuidance({
    ...sampleResult,
    hsv: { h: 32, s: 0.58, v: 0.5 },
    hueInfo: { category: 2, name: 'オレンジ' },
  });

  expect(guidance.headline).toBe('茶');
});

test('maps bright low-saturation orange-yellow colors to ベージュ', () => {
  const guidance = buildColorGuidance({
    ...sampleResult,
    hsv: { h: 38, s: 0.24, v: 0.82 },
    hueInfo: { category: 2, name: 'オレンジ' },
  });

  expect(guidance.headline).toBe('ベージュ');
});

test('maps yellowish green colors to 黄緑', () => {
  const guidance = buildColorGuidance({
    ...sampleResult,
    hsv: { h: 92, s: 0.48, v: 0.62 },
    hueInfo: { category: 4, name: '緑' },
  });

  expect(guidance.headline).toBe('黄緑');
});

test('maps dark blue colors to 紺', () => {
  const guidance = buildColorGuidance({
    ...sampleResult,
    hsv: { h: 228, s: 0.72, v: 0.36 },
    hueInfo: { category: 6, name: '青' },
  });

  expect(guidance.headline).toBe('紺');
});

test('keeps existing base color names when no extra rule applies', () => {
  expect(
    buildColorGuidance({
      ...sampleResult,
      hsv: { h: 58, s: 0.86, v: 0.94 },
      hueInfo: { category: 3, name: '黄' },
    }).headline,
  ).toBe('黄');

  expect(
    buildColorGuidance({
      ...sampleResult,
      hsv: { h: 184, s: 0.6, v: 0.8 },
      hueInfo: { category: 5, name: '水色' },
    }).headline,
  ).toBe('水色');
});

test('shows two candidate colors only when the second cluster is close enough', () => {
  const guidance = buildColorGuidance(
    {
      ...sampleResult,
      hsv: { h: 2, s: 0.78, v: 0.73 },
      hueInfo: { category: 1, name: '赤' },
    },
    {
      secondaryResult: {
        ...sampleResult,
        hsv: { h: 6, s: 0.62, v: 0.38 },
        hueInfo: { category: 1, name: '赤' },
      },
      secondaryWeightRatio: AMBIGUOUS_COLOR_RATIO_THRESHOLD,
    },
  );

  expect(guidance.isAmbiguous).toBe(true);
  expect(guidance.secondaryHeadline).toBe('えんじ');
  expect(guidance.speechText).toContain('色は 赤 か えんじ です');
});

test('does not show a second candidate when the secondary cluster is too small', () => {
  const guidance = buildColorGuidance(
    {
      ...sampleResult,
      hsv: { h: 32, s: 0.58, v: 0.5 },
      hueInfo: { category: 2, name: 'オレンジ' },
    },
    {
      secondaryResult: {
        ...sampleResult,
        hsv: { h: 38, s: 0.24, v: 0.82 },
        hueInfo: { category: 2, name: 'オレンジ' },
      },
      secondaryWeightRatio: 0.79,
    },
  );

  expect(guidance.isAmbiguous).toBe(false);
  expect(guidance.secondaryHeadline).toBeUndefined();
  expect(guidance.speechText).toContain('色は 茶 です');
});

test('does not show a second candidate when both clusters map to the same color name', () => {
  const guidance = buildColorGuidance(
    {
      ...sampleResult,
      hsv: { h: 182, s: 0.52, v: 0.72 },
      hueInfo: { category: 5, name: '水色' },
    },
    {
      secondaryResult: {
        ...sampleResult,
        hsv: { h: 190, s: 0.41, v: 0.66 },
        hueInfo: { category: 5, name: '水色' },
      },
      secondaryWeightRatio: 0.92,
    },
  );

  expect(guidance.isAmbiguous).toBe(false);
  expect(guidance.secondaryHeadline).toBeUndefined();
  expect(guidance.speechText).toContain('色は 水色 です');
});
