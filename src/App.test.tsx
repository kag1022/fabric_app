import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mock dexie-react-hooks
jest.mock('dexie-react-hooks', () => ({
  useLiveQuery: () => [],
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [],
      getVideoTracks: () => [{ stop: jest.fn() }],
    }),
  },
  writable: true,
});

test('renders app title', async () => {
  render(<App />);
  const titleElement = await screen.findByText(/Fabric Color Classifier/i);
  expect(titleElement).toBeInTheDocument();
});
