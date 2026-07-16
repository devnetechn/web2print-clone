// 4over API configuration.
// Credentials come from environment variables (never commit them).
//   FOUROVER_PUBLIC_KEY   - apikey (public key)
//   FOUROVER_PRIVATE_KEY  - secret (private key)
//   FOUROVER_ENV          - "sandbox" (default) or "live"

const BASE_URLS = {
  sandbox: 'https://sandbox-api.4over.com',
  live: 'https://api.4over.com',
};

export function getFouroverConfig() {
  const environment = (process.env.FOUROVER_ENV || 'sandbox').toLowerCase();
  const baseUrl = BASE_URLS[environment] || BASE_URLS.sandbox;

  return {
    environment,
    baseUrl,
    publicKey: process.env.FOUROVER_PUBLIC_KEY || '',
    privateKey: process.env.FOUROVER_PRIVATE_KEY || '',
  };
}

export function assertCredentials(config) {
  if (!config.publicKey || !config.privateKey) {
    throw new Error(
      'Missing 4over credentials. Set FOUROVER_PUBLIC_KEY and FOUROVER_PRIVATE_KEY.'
    );
  }
}
