import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { buildAuthParams } from '../services/fourover/client.js';

// Reference implementation matching 4over's documented scheme:
//   signature = HMAC-SHA256(method, SHA256(privateKey))
function expectedSignature(method, privateKey) {
  const hashedPrivate = crypto.createHash('sha256').update(privateKey).digest('hex');
  return crypto.createHmac('sha256', hashedPrivate).update(method).digest('hex');
}

describe('buildAuthParams', () => {
  it('returns the public key as apikey', () => {
    const { apikey } = buildAuthParams('GET', 'pub-123', 'priv-456');
    expect(apikey).toBe('pub-123');
  });

  it('computes HMAC-SHA256 over the HTTP method keyed by SHA256(privateKey)', () => {
    const { signature } = buildAuthParams('GET', 'pub', 'secret');
    expect(signature).toBe(expectedSignature('GET', 'secret'));
  });

  it('produces different signatures for different methods', () => {
    const get = buildAuthParams('GET', 'pub', 'secret').signature;
    const post = buildAuthParams('POST', 'pub', 'secret').signature;
    expect(get).not.toBe(post);
  });

  it('uppercases the method before signing', () => {
    const lower = buildAuthParams('get', 'pub', 'secret').signature;
    const upper = buildAuthParams('GET', 'pub', 'secret').signature;
    expect(lower).toBe(upper);
  });
});
