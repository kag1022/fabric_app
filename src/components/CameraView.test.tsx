import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, beforeEach, expect, test, vi } from 'vitest';

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

test('returns to the camera screen after saving', async () => {
  const { container } = render(<CameraView canSaveHistory />);

  const fileInput = container.querySelector('input[type="file"]');

  expect(fileInput).not.toBeNull();
  expect(await screen.findByText('写真をとる')).toBeInTheDocument();

  fireEvent.change(fileInput as HTMLInputElement, {
    target: {
      files: [new File(['cloth'], 'cloth.jpg', { type: 'image/jpeg' })],
    },
  });

  expect(await screen.findByText('結果確認')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '保存して次へ' }));

  expect(await screen.findByText('保存しました。次のぬのを撮れます。')).toBeInTheDocument();
  expect(await screen.findByText('写真をとる')).toBeInTheDocument();
  expect(screen.queryByText('結果確認')).not.toBeInTheDocument();
});
