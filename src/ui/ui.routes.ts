import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import type { FastifyInstance, FastifyRequest } from 'fastify';

const frontendDir = resolve(process.cwd(), 'frontend', 'out');

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function requestPath(request: FastifyRequest): string {
  return request.url.split('?')[0] || '/';
}

function isInsideFrontend(filePath: string): boolean {
  const root = frontendDir.endsWith('\\') ? frontendDir : `${frontendDir}\\`;
  return filePath === frontendDir || filePath.startsWith(root);
}

async function existingFile(filePath: string): Promise<string | null> {
  if (!isInsideFrontend(filePath)) return null;
  try {
    const details = await stat(filePath);
    return details.isFile() ? filePath : null;
  } catch {
    return null;
  }
}

async function resolveFrontendFile(pathname: string): Promise<string | null> {
  let decodedPath: string;
  try { decodedPath = decodeURIComponent(pathname); }
  catch { return null; }

  const relativePath = decodedPath.replace(/^[/\\]+/, '');
  const direct = join(frontendDir, relativePath);
  const candidates = [direct];
  if (!extname(relativePath)) {
    candidates.push(join(frontendDir, `${relativePath}.html`));
    candidates.push(join(direct, 'index.html'));
  }
  for (const candidate of candidates) {
    const file = await existingFile(candidate);
    if (file) return file;
  }
  return existingFile(join(frontendDir, '404.html'));
}

export async function registerUiRoutes(app: FastifyInstance) {
  app.get('/*', async (request, reply) => {
    const filePath = await resolveFrontendFile(requestPath(request));
    if (!filePath) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Frontend build not found' });
    const extension = extname(filePath).toLowerCase();
    const cacheControl = extension === '.html' ? 'no-store' : 'public, max-age=31536000, immutable';
    return reply.header('cache-control', cacheControl).type(contentTypes[extension] ?? 'application/octet-stream').send(await readFile(filePath));
  });
}
