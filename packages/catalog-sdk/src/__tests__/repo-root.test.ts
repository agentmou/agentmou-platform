import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { resolveRepoRoot } from '../repo-root';

const tempDirs: string[] = [];

afterEach(() => {
  delete process.env.AGENTMOU_REPO_ROOT;

  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('resolveRepoRoot', () => {
  it('resolves /prod when the service runs from dist inside a container', () => {
    const fixtureRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'agentmou-repo-root-dist-'),
    );
    tempDirs.push(fixtureRoot);

    const prodRoot = path.join(fixtureRoot, 'prod');
    const moduleDir = path.join(prodRoot, 'api', 'dist', 'modules', 'catalog');

    fs.mkdirSync(path.join(prodRoot, 'catalog', 'agents'), { recursive: true });
    fs.mkdirSync(path.join(prodRoot, 'workflows', 'public'), {
      recursive: true,
    });
    fs.mkdirSync(moduleDir, { recursive: true });

    expect(
      resolveRepoRoot(moduleDir, ['catalog/agents', 'workflows/public']),
    ).toBe(prodRoot);
  });

  it('resolves the repo root when the service runs directly from src', () => {
    const fixtureRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'agentmou-repo-root-src-'),
    );
    tempDirs.push(fixtureRoot);

    const repoRoot = path.join(fixtureRoot, 'repo');
    const moduleDir = path.join(
      repoRoot,
      'services',
      'api',
      'src',
      'modules',
      'catalog',
    );

    fs.mkdirSync(path.join(repoRoot, 'catalog', 'agents'), { recursive: true });
    fs.mkdirSync(path.join(repoRoot, 'workflows', 'public'), {
      recursive: true,
    });
    fs.mkdirSync(moduleDir, { recursive: true });

    expect(
      resolveRepoRoot(moduleDir, ['catalog/agents', 'workflows/public']),
    ).toBe(repoRoot);
  });

  it('honors AGENTMOU_REPO_ROOT when it points at a valid asset root', () => {
    const fixtureRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'agentmou-repo-root-env-'),
    );
    tempDirs.push(fixtureRoot);

    const overrideRoot = path.join(fixtureRoot, 'override');
    const moduleDir = path.join(
      fixtureRoot,
      'prod',
      'api',
      'dist',
      'modules',
      'catalog',
    );

    fs.mkdirSync(path.join(overrideRoot, 'catalog', 'agents'), {
      recursive: true,
    });
    fs.mkdirSync(path.join(overrideRoot, 'workflows', 'public'), {
      recursive: true,
    });
    fs.mkdirSync(moduleDir, { recursive: true });

    process.env.AGENTMOU_REPO_ROOT = overrideRoot;

    expect(
      resolveRepoRoot(moduleDir, ['catalog/agents', 'workflows/public']),
    ).toBe(overrideRoot);
  });
});
