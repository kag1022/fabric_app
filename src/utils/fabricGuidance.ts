import type { ColorAnalysisResult } from './colorUtils';

export interface FabricGuidance {
  speechText: string;
  headline: string;
  instruction: string;
  supportCode: string;
}

function formatGroupForSpeech(group: string): string {
  return group
    .replace(/^C/, 'シー ')
    .replace(/^N/, 'エヌ ')
    .replace('-', ' の ');
}

export function buildFabricGuidance(result: ColorAnalysisResult): FabricGuidance {
  const supportCode = result.group;
  const headline = `${result.hueInfo.name} / ${result.valueInfo.name}`;
  const instruction = `グループ ${supportCode} の箱に入れてください。`;
  const speechText = `${result.hueInfo.name}、${result.valueInfo.name}です。グループ ${formatGroupForSpeech(
    supportCode,
  )} の箱に入れてください。`;

  return {
    speechText,
    headline,
    instruction,
    supportCode,
  };
}
