import 'dotenv/config';

export function assertLocalDatabase() {
  const configuredUrl = process.env.DATABASE_URL;
  if (!configuredUrl) throw new Error('DATABASE_URL is required for permission database tests.');
  const hostname = new URL(configuredUrl).hostname.toLowerCase();
  if (!['localhost', '127.0.0.1', '::1', 'postgres'].includes(hostname)) {
    throw new Error('Permission database tests are restricted to a local Docker database.');
  }
}

assertLocalDatabase();
