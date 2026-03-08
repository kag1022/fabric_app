import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import ColorAnalyzer from './ColorAnalyzer';
import { getDominantColors } from '../utils/colorClustering';

vi.mock('../services/localHistory', () => ({
  saveLocalFabricCapture: vi.fn().mockResolvedValue({ id: 'saved-record' }),
}));

vi.mock('../utils/colorClustering', () => ({
  getDominantColors: vi.fn(),
}));

class MockSpeechSynthesisUtterance {
  public lang = '';
  public pitch = 1;
  public rate = 1;
  public text: string;

  constructor(text: string) {
    this.text = text;
  }
}

function renderAnalyzer() {
  const view = render(
    <ColorAnalyzer
      autoReadEnabled
      canSaveHistory
      imageDataUrl="data:image/png;base64,fake"
      onRetake={vi.fn()}
      onSaved={vi.fn()}
    />,
  );

  const image = view.container.querySelector('img[alt="分析する布の写真"]') as HTMLImageElement | null;
  expect(image).not.toBeNull();

  Object.defineProperty(image as HTMLImageElement, 'complete', {
    configurable: true,
    value: true,
  });
  Object.defineProperty(image as HTMLImageElement, 'naturalHeight', {
    configurable: true,
    value: 240,
  });
  Object.defineProperty(image as HTMLImageElement, 'naturalWidth', {
    configurable: true,
    value: 320,
  });

  fireEvent.load(image as HTMLImageElement);
  return view;
}

describe('ColorAnalyzer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(getDominantColors).mockReset();

    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: MockSpeechSynthesisUtterance,
      writable: true,
    });

    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel: vi.fn(),
        speak: vi.fn(),
      },
      writable: true,
    });

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        ({
          drawImage: vi.fn(),
          getImageData: vi.fn(() => ({
            data: new Uint8ClampedArray(320 * 240 * 4),
          })),
        }) as unknown as CanvasRenderingContext2D,
    );
  });

  test('shows an expanded color name in the main result', async () => {
    vi.mocked(getDominantColors).mockReturnValue([{ r: 150, g: 95, b: 45, size: 12 }]);

    renderAnalyzer();

    expect(await screen.findByText('茶')).toBeInTheDocument();
    expect(screen.getByText('色は 茶 です')).toBeInTheDocument();
  });

  test('shows two candidates and reads both when cluster sizes are close', async () => {
    vi.mocked(getDominantColors).mockReturnValue([
      { r: 220, g: 50, b: 40, size: 10 },
      { r: 95, g: 20, b: 28, size: 9 },
    ]);

    renderAnalyzer();

    expect(await screen.findByText('候補: 赤 / えんじ')).toBeInTheDocument();
    expect(screen.getByText('色は 赤 か えんじ です')).toBeInTheDocument();

    await waitFor(() => {
      expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    });

    const spokenUtterance = vi.mocked(window.speechSynthesis.speak).mock.calls[0]?.[0] as {
      text: string;
    };
    expect(spokenUtterance.text).toContain('色は 赤 か えんじ です');
  });
});
