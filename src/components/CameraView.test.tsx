import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest';

import CameraView from './CameraView';

vi.mock('./ColorAnalyzer', () => ({
  default: ({ onRetake, onSaved }: { onRetake: () => void; onSaved: () => void }) => (
    <div>
      <p>結果確認</p>
      <button onClick={onRetake} type="button">
        撮り直す
      </button>
      <button onClick={onSaved} type="button">
        保存して次へ
      </button>
    </div>
  ),
}));

class MockFileReader {
  public result: string | ArrayBuffer | null = null;
  public onerror: (() => void) | null = null;
  public onload: (() => void) | null = null;

  readAsDataURL() {
    this.result = 'data:image/jpeg;base64,ZmFrZQ==';
    this.onload?.();
  }
}

beforeAll(() => {
  Object.defineProperty(globalThis, 'FileReader', {
    value: MockFileReader,
    writable: true,
  });
});

beforeEach(() => {
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [],
      }),
    },
    writable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('does not request camera access until the user chooses it', async () => {
  const getUserMedia = vi.fn(
    () =>
      new Promise<MediaStream>(() => {
        // Keep the request pending so the test only verifies the trigger timing.
      }),
  );

  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
      getUserMedia,
    },
    writable: true,
  });

  render(<CameraView autoReadEnabled canSaveHistory />);

  expect(screen.getByRole('button', { name: 'カメラを使う' })).toBeInTheDocument();
  expect(getUserMedia).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'カメラを使う' }));

  expect(getUserMedia).toHaveBeenCalledTimes(1);
});

test('shows photo selection as the primary fallback when camera access fails', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn().mockRejectedValue(new Error('denied')),
    },
    writable: true,
  });

  render(<CameraView autoReadEnabled canSaveHistory />);

  fireEvent.click(screen.getByRole('button', { name: 'カメラを使う' }));

  expect(await screen.findByText('カメラを使えません。必要なときは写真をえらんでください。')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '写真をとる' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '写真をえらぶ' })).toBeInTheDocument();
});

test('returns to the camera screen after saving', async () => {
  const { container } = render(<CameraView autoReadEnabled canSaveHistory />);

  const fileInput = container.querySelector('input[type="file"]');

  expect(fileInput).not.toBeNull();
  expect(await screen.findByText('カメラを使う')).toBeInTheDocument();

  fireEvent.change(fileInput as HTMLInputElement, {
    target: {
      files: [new File(['cloth'], 'cloth.jpg', { type: 'image/jpeg' })],
    },
  });

  expect(await screen.findByText('結果確認')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '保存して次へ' }));

  expect(await screen.findByText('保存しました。次のぬのを見られます。')).toBeInTheDocument();
  expect(await screen.findByText('カメラを使う')).toBeInTheDocument();
  expect(screen.queryByText('結果確認')).not.toBeInTheDocument();
});
