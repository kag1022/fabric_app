import { render, screen } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [],
    }),
  },
  writable: true,
});

import App from './App';

test('renders the sorting support screen without waiting for authentication', async () => {
  render(
    <HashRouter>
      <App />
    </HashRouter>,
  );

  expect(await screen.findByText('ぬの しわけ サポート')).toBeInTheDocument();
  expect(await screen.findByText('1. ぬのを撮る')).toBeInTheDocument();
});
