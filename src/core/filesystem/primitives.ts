import path from 'node:path';

export function safePath(root: string, relativePath: string): string {
  if (path.isAbsolute(relativePath)) {
    throw new Error('Absolute path not allowed');
  }
  const resolved = path.resolve(root, relativePath);
  const normalizedRoot = path.resolve(root);
  if (!resolved.startsWith(normalizedRoot + path.sep) && resolved !== normalizedRoot) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}
