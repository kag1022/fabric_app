import { describe, expect, test } from 'vitest';

import vercelConfig from '../vercel.json';

type HeaderEntry = {
  key: string;
  value: string;
};

function findHeader(key: string): HeaderEntry | undefined {
  return vercelConfig.headers
    .flatMap((entry) => entry.headers)
    .find((header) => header.key.toLowerCase() === key.toLowerCase());
}

describe('vercel security headers', () => {
  test('blocks framing via CSP and X-Frame-Options', () => {
    const cspHeader = findHeader('Content-Security-Policy');
    const xFrameOptionsHeader = findHeader('X-Frame-Options');

    expect(cspHeader?.value).toContain("frame-ancestors 'none'");
    expect(xFrameOptionsHeader?.value).toBe('DENY');
  });
});
