import { render, screen } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { axe } from 'vitest-axe';

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [],
    }),
  },
  writable: true,
});

import App from './App';

beforeEach(() => {
  window.location.hash = '#/';
});

test('renders the color reading screen without waiting for authentication', async () => {
  render(
    <HashRouter>
      <App />
    </HashRouter>,
  );

  expect(await screen.findByText('ぬの 色よみ サポート')).toBeInTheDocument();
  expect(await screen.findByText('カメラを使う')).toBeInTheDocument();
  expect(await screen.findByText('写真をえらぶ')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: '記録' })).not.toBeInTheDocument();
  expect(
    screen.queryByText(
      '写真をとると、色の名前を大きく表示します。音でも読めるので、スマホやタブレットで 使いやすい画面です。',
    ),
  ).not.toBeInTheDocument();
  expect(screen.queryByText('手順 1')).not.toBeInTheDocument();
  expect(screen.queryByText('見やすくするコツ')).not.toBeInTheDocument();
});

test('keeps the main camera screen free from basic accessibility violations', async () => {
  const { container } = render(
    <HashRouter>
      <App />
    </HashRouter>,
  );

  await screen.findByText('ぬの 色よみ サポート');

  const results = await axe(container);

  expect(results.violations).toHaveLength(0);
});

test('keeps the history screen free from basic accessibility violations', async () => {
  window.location.hash = '#/staff/history';

  const { container } = render(
    <HashRouter>
      <App />
    </HashRouter>,
  );

  await screen.findByText('職員向け 記録管理');

  const results = await axe(container);

  expect(results.violations).toHaveLength(0);
});

test('redirects the legacy history route to the staff history screen', async () => {
  window.location.hash = '#/history';

  render(
    <HashRouter>
      <App />
    </HashRouter>,
  );

  expect(await screen.findByText('職員向け 記録管理')).toBeInTheDocument();
  expect(window.location.hash).toBe('#/staff/history');
});
