import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Mock Firebase
jest.mock('firebase/auth', () => {
  const mockUnsubscribe = jest.fn();
  return {
    __esModule: true,
    getAuth: jest.fn(),
    onAuthStateChanged: jest.fn(() => mockUnsubscribe),
    signInAnonymously: jest.fn(),
  };
});

jest.mock('firebase/firestore', () => ({
  __esModule: true,
  getFirestore: jest.fn(),
  collection: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
  __esModule: true,
  getStorage: jest.fn(),
  ref: jest.fn(),
  uploadString: jest.fn(),
  getDownloadURL: jest.fn(),
}));

jest.mock('./firebase', () => ({
  __esModule: true,
  auth: {},
  db: {},
  storage: {},
}));

// Mock getUserMedia
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [],
    }),
  },
  writable: true,
});

test('renders app title', () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  const titleElement = screen.getByText(/Fabric Color Classifier/i);
  expect(titleElement).toBeInTheDocument();
});
