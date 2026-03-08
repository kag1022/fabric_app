import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

if (typeof window !== 'undefined') {
  globalThis.Blob = window.Blob;
  globalThis.File = window.File;
  globalThis.FileReader = window.FileReader;

  if (typeof URL.createObjectURL !== 'function') {
    URL.createObjectURL = () => 'blob:test-url';
  }

  if (typeof URL.revokeObjectURL !== 'function') {
    URL.revokeObjectURL = () => undefined;
  }
}
