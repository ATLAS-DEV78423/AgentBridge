import fs from 'node:fs/promises';
import path from 'node:path';
import { hashFile } from './hashing.js';

export async function atomicWrite(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  // If file exists, create backup first
  try {
    await fs.access(filePath);
    await backupFile(filePath);
  } catch {
    // File doesn't exist yet
  }

  // Write to temp file first, then rename (atomic on most systems)
  const tempPath = filePath + '.tmp.' + Date.now();
  try {
    await fs.writeFile(tempPath, content, 'utf-8');
    await fs.rename(tempPath, filePath);
  } catch (error) {
    try { await fs.unlink(tempPath); } catch { /* ignore */ }
    throw error;
  }
}

export async function backupFile(filePath: string): Promise<string> {
  const backupPath = filePath + '.bak';
  await fs.copyFile(filePath, backupPath);
  return backupPath;
}

export async function restoreBackup(filePath: string): Promise<void> {
  const backupPath = filePath + '.bak';
  try {
    await fs.access(backupPath);
  } catch {
    throw new Error(`Backup not found: ${backupPath}`);
  }
  await fs.copyFile(backupPath, filePath);
}

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
