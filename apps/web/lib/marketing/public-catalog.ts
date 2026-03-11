import 'server-only';

import * as fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import * as path from 'node:path';

export interface MarketingAgent {
  id: string;
  name: string;
  category: string;
  description: string;
  timeSaved: string;
  accuracy: string;
}

export interface MarketingWorkflow {
  id: string;
  name: string;
  trigger: string;
  action: string;
}

export interface MarketingPack {
  id: string;
  name: string;
  description: string;
  agents: number;
  workflows: number;
  outcome: string;
}

export interface MarketingCatalogPayload {
  agents: MarketingAgent[];
  workflows: MarketingWorkflow[];
  packs: MarketingPack[];
}

export async function getPublicMarketingCatalog(): Promise<MarketingCatalogPayload> {
  const repoRoot = await resolveRepoRoot();
  const [agents, workflows, packs] = await Promise.all([
    loadAgents(path.join(repoRoot, 'catalog', 'agents')),
    loadWorkflows(path.join(repoRoot, 'workflows', 'public')),
    loadPacks(path.join(repoRoot, 'catalog', 'packs')),
  ]);

  return { agents, workflows, packs };
}

async function resolveRepoRoot(): Promise<string> {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), '../..'),
    path.resolve(process.cwd(), '../../..'),
  ];

  for (const candidate of candidates) {
    const hasCatalog = await pathExists(path.join(candidate, 'catalog'));
    const hasWorkflows = await pathExists(path.join(candidate, 'workflows'));
    if (hasCatalog && hasWorkflows) {
      return candidate;
    }
  }

  throw new Error('Unable to resolve monorepo root for marketing catalog');
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function loadAgents(agentsDir: string): Promise<MarketingAgent[]> {
  const entries = await safeReadDir(agentsDir);
  const agents: MarketingAgent[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(agentsDir, entry.name, 'manifest.yaml');
    if (!(await pathExists(manifestPath))) continue;

    const manifest = parseManifest(await fs.readFile(manifestPath, 'utf8'));
    agents.push({
      id: manifest.id || entry.name,
      name: manifest.name || humanizeId(entry.name),
      category: normalizeMarketingCategory(manifest.category),
      description: manifest.description || 'AI agent for operational automation',
      timeSaved: 'Live',
      accuracy: 'Real',
    });
  }

  return agents;
}

async function loadWorkflows(workflowsDir: string): Promise<MarketingWorkflow[]> {
  const entries = await safeReadDir(workflowsDir);
  const workflows: MarketingWorkflow[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(workflowsDir, entry.name, 'manifest.yaml');
    if (!(await pathExists(manifestPath))) continue;

    const manifest = parseManifest(await fs.readFile(manifestPath, 'utf8'));
    workflows.push({
      id: manifest.id || entry.name,
      name: manifest.name || humanizeId(entry.name),
      trigger: manifest.triggerType || 'manual',
      action: deriveWorkflowAction(manifest.description),
    });
  }

  return workflows;
}

async function loadPacks(packsDir: string): Promise<MarketingPack[]> {
  const entries = await safeReadDir(packsDir);
  const packs: MarketingPack[] = [];

  for (const entry of entries) {
    if (!entry.name.endsWith('.yaml') && !entry.name.endsWith('.yml')) continue;
    const packPath = path.join(packsDir, entry.name);
    const raw = await fs.readFile(packPath, 'utf8');
    const manifest = parseManifest(raw);

    packs.push({
      id: manifest.id || entry.name.replace(/\.(ya?ml)$/, ''),
      name: manifest.name || humanizeId(entry.name.replace(/\.(ya?ml)$/, '')),
      description: manifest.description || 'Curated bundle for automation outcomes',
      agents: extractYamlList(raw, 'agents').length,
      workflows: extractYamlList(raw, 'workflows').length,
      outcome: derivePackOutcome(manifest.description),
    });
  }

  return packs;
}

async function safeReadDir(dirPath: string): Promise<Dirent[]> {
  try {
    return await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

interface ParsedManifest {
  id?: string;
  name?: string;
  description?: string;
  category?: string;
  triggerType?: string;
}

function parseManifest(raw: string): ParsedManifest {
  const lines = raw.split('\n');
  let inTriggerBlock = false;
  let triggerIndent = -1;
  const parsed: ParsedManifest = {};

  for (const line of lines) {
    const triggerStartMatch = line.match(/^(\s*)trigger:\s*$/);
    if (triggerStartMatch) {
      inTriggerBlock = true;
      triggerIndent = triggerStartMatch[1]?.length ?? 0;
      continue;
    }

    if (inTriggerBlock) {
      const indent = line.match(/^(\s*)/)?.[1]?.length ?? 0;
      if (line.trim().length === 0) continue;
      if (indent <= triggerIndent) {
        inTriggerBlock = false;
      } else {
        const triggerTypeMatch = line.match(/^\s*type:\s*(.+)\s*$/);
        if (triggerTypeMatch) {
          parsed.triggerType = cleanYamlValue(triggerTypeMatch[1]);
          continue;
        }
      }
    }

    const scalarMatch = line.match(/^([a-zA-Z0-9_]+):\s*(.+)\s*$/);
    if (!scalarMatch) continue;
    const key = scalarMatch[1];
    const value = cleanYamlValue(scalarMatch[2]);

    if (key === 'id') parsed.id = value;
    if (key === 'name') parsed.name = value;
    if (key === 'description') parsed.description = value;
    if (key === 'category') parsed.category = value;
  }

  return parsed;
}

function cleanYamlValue(value: string): string {
  return value.replace(/^['"]|['"]$/g, '').trim();
}

function extractYamlList(raw: string, key: string): string[] {
  const lines = raw.split('\n');
  const items: string[] = [];
  let inSection = false;
  let sectionIndent = -1;

  for (const line of lines) {
    const sectionMatch = line.match(/^(\s*)([a-zA-Z0-9_]+):\s*$/);
    if (sectionMatch) {
      inSection = sectionMatch[2] === key;
      sectionIndent = sectionMatch[1]?.length ?? 0;
      continue;
    }

    if (!inSection) continue;
    if (line.trim().length === 0) continue;

    const indent = line.match(/^(\s*)/)?.[1]?.length ?? 0;
    if (indent <= sectionIndent) {
      inSection = false;
      continue;
    }

    const itemMatch = line.match(/^\s*-\s*(.+)\s*$/);
    if (itemMatch) {
      items.push(cleanYamlValue(itemMatch[1]));
    }
  }

  return items;
}

function humanizeId(value: string): string {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeMarketingCategory(value?: string): string {
  if (!value) return 'Core';
  if (value.toLowerCase() === 'productivity') return 'Personal';
  return humanizeId(value);
}

function deriveWorkflowAction(description?: string): string {
  if (!description) return 'Automated run';
  const words = description.split(/\s+/).slice(0, 3).join(' ');
  return words || 'Automated run';
}

function derivePackOutcome(description?: string): string {
  if (!description) return 'Streamline operations';
  return description.split('.').at(0)?.trim() || 'Streamline operations';
}
