/**
 * Scans operational catalog directories and writes apps/web/lib/demo-catalog/operational-ids.gen.json
 * Run from repo root: pnpm demo-catalog:generate
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_FILE = path.join(REPO_ROOT, 'apps/web/lib/demo-catalog/operational-ids.gen.json');

async function readDirSafe(dir: string) {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** Extract `id:` from a small YAML manifest (first occurrence). */
function parseYamlId(content: string): string | null {
  const m = content.match(/^id:\s*([^\s#]+|'[^']+'|"[^"]+")\s*$/m);
  if (!m) return null;
  let v = m[1].trim();
  if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
    v = v.slice(1, -1);
  }
  return v || null;
}

async function discoverAgentIds(): Promise<string[]> {
  const agentsDir = path.join(REPO_ROOT, 'catalog', 'agents');
  const entries = await readDirSafe(agentsDir);
  const ids: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(agentsDir, entry.name, 'manifest.yaml');
    try {
      const raw = await fs.readFile(manifestPath, 'utf8');
      const id = parseYamlId(raw);
      if (id) ids.push(id);
    } catch {
      // skip
    }
  }
  return [...new Set(ids)].sort();
}

async function discoverWorkflowIds(subdir: 'public' | 'planned'): Promise<string[]> {
  const dir = path.join(REPO_ROOT, 'workflows', subdir);
  const entries = await readDirSafe(dir);
  const ids: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(dir, entry.name, 'manifest.yaml');
    try {
      const raw = await fs.readFile(manifestPath, 'utf8');
      const id = parseYamlId(raw);
      if (id) ids.push(id);
    } catch {
      // skip
    }
  }
  return [...new Set(ids)].sort();
}

async function discoverPackIds(): Promise<string[]> {
  const packsDir = path.join(REPO_ROOT, 'catalog', 'packs');
  const entries = await readDirSafe(packsDir);
  const ids: string[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.yaml') && !entry.name.endsWith('.yml')) continue;
    try {
      const raw = await fs.readFile(path.join(packsDir, entry.name), 'utf8');
      const id = parseYamlId(raw);
      if (id) ids.push(id);
    } catch {
      // skip
    }
  }
  return [...new Set(ids)].sort();
}

async function main() {
  const [agents, workflowsPublic, workflowsPlanned, packs] = await Promise.all([
    discoverAgentIds(),
    discoverWorkflowIds('public'),
    discoverWorkflowIds('planned'),
    discoverPackIds(),
  ]);

  // Intentionally no timestamp so `pnpm demo-catalog:check` stays deterministic.
  const payload = {
    agents,
    workflowsPublic,
    workflowsPlanned,
    packs,
  };

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
