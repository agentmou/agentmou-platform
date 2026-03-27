import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT_CANDIDATES = ['../../../..', '../../../../..'] as const;

/**
 * Resolves the repository root for services that run from either `src/` or
 * compiled `dist/` directories.
 *
 * @param moduleDir - The current module directory (`import.meta.dirname`)
 * @param requiredPaths - Relative paths that must exist below the repo root
 * @returns The first candidate root that contains every required path
 */
export function resolveRepoRoot(moduleDir: string, requiredPaths: string[]): string {
  const candidates = [
    process.env.AGENTMOU_REPO_ROOT,
    ...REPO_ROOT_CANDIDATES.map((relativePath) => path.resolve(moduleDir, relativePath)),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (requiredPaths.every((requiredPath) => fs.existsSync(path.join(candidate, requiredPath)))) {
      return candidate;
    }
  }

  return path.resolve(moduleDir, REPO_ROOT_CANDIDATES.at(-1)!);
}
