/**
 * Legacy helpers for loading catalog-shaped data from the API or filesystem.
 * Marketing homepage cards use `featured-from-demo.ts` + `/api/public-catalog` instead.
 */
import 'server-only';

import * as fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import * as path from 'node:path';

const DEFAULT_API_BASE_URL = 'https://api.agentmou.io';

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
  /** Present on `/api/public-catalog` responses built from `featured-from-demo.ts`. */
  gaInventoryCounts?: {
    agents: number;
    workflows: number;
    packs: number;
  };
}

type MarketingCatalogSource = 'api' | 'filesystem' | 'empty';

export interface MarketingCatalogResult {
  payload: MarketingCatalogPayload;
  source: MarketingCatalogSource;
  degraded: boolean;
  reason?: string;
}

interface ApiAgentManifest {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  category?: unknown;
  domain?: unknown;
  catalogGroup?: unknown;
}

interface ApiWorkflowManifest {
  id?: unknown;
  name?: unknown;
  summary?: unknown;
  description?: unknown;
  trigger?: unknown;
}

interface ApiPackManifest {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  agents?: unknown;
  workflows?: unknown;
  includedAgents?: unknown;
  includedWorkflows?: unknown;
}

const EMPTY_CATALOG: MarketingCatalogPayload = {
  agents: [],
  workflows: [],
  packs: [],
};

export async function getPublicMarketingCatalog(): Promise<MarketingCatalogPayload> {
  const result = await getPublicMarketingCatalogResult();
  return result.payload;
}

export async function getPublicMarketingCatalogResult(): Promise<MarketingCatalogResult> {
  const fromApi = await loadCatalogFromApi();
  if (fromApi) {
    return {
      payload: fromApi,
      source: 'api',
      degraded: false,
    };
  }

  const fromFilesystem = await loadCatalogFromFilesystem();
  if (fromFilesystem) {
    return {
      payload: fromFilesystem,
      source: 'filesystem',
      degraded: true,
      reason: 'api_unavailable',
    };
  }

  return {
    payload: EMPTY_CATALOG,
    source: 'empty',
    degraded: true,
    reason: 'api_and_filesystem_unavailable',
  };
}

async function loadCatalogFromApi(): Promise<MarketingCatalogPayload | null> {
  const apiBaseUrl = resolveApiBaseUrl();
  const timeoutSignal = AbortSignal.timeout(5000);

  try {
    const [agentsResponse, workflowsResponse, packsResponse] = await Promise.all([
      fetch(catalogUrl(apiBaseUrl, '/api/v1/catalog/agents'), { signal: timeoutSignal }),
      fetch(catalogUrl(apiBaseUrl, '/api/v1/catalog/workflows'), { signal: timeoutSignal }),
      fetch(catalogUrl(apiBaseUrl, '/api/v1/catalog/packs'), { signal: timeoutSignal }),
    ]);

    if (!agentsResponse.ok || !workflowsResponse.ok || !packsResponse.ok) {
      throw new Error(
        `Catalog API HTTP status mismatch: agents=${agentsResponse.status}, workflows=${workflowsResponse.status}, packs=${packsResponse.status}`
      );
    }

    const [agentsBody, workflowsBody, packsBody] = await Promise.all([
      agentsResponse.json() as Promise<{ agents?: ApiAgentManifest[] }>,
      workflowsResponse.json() as Promise<{ workflows?: ApiWorkflowManifest[] }>,
      packsResponse.json() as Promise<{ packs?: ApiPackManifest[] }>,
    ]);

    return {
      agents: mapApiAgents(agentsBody.agents),
      workflows: mapApiWorkflows(workflowsBody.workflows),
      packs: mapApiPacks(packsBody.packs),
    };
  } catch (error) {
    console.warn(`[public-catalog] api source failed: ${toErrorMessage(error)}`);
    return null;
  }
}

async function loadCatalogFromFilesystem(): Promise<MarketingCatalogPayload | null> {
  const repoRoot = await resolveRepoRoot();
  if (!repoRoot) {
    return null;
  }

  try {
    const [agents, workflows, packs] = await Promise.all([
      loadAgents(path.join(repoRoot, 'catalog', 'agents')),
      loadWorkflows(path.join(repoRoot, 'workflows', 'public')),
      loadPacks(path.join(repoRoot, 'catalog', 'packs')),
    ]);

    return { agents, workflows, packs };
  } catch (error) {
    console.warn(`[public-catalog] filesystem source failed: ${toErrorMessage(error)}`);
    return null;
  }
}

function resolveApiBaseUrl(): string {
  const candidate = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || DEFAULT_API_BASE_URL;
  return candidate.replace(/\/+$/, '');
}

function catalogUrl(baseUrl: string, catalogPath: string): string {
  return `${baseUrl}${catalogPath}`;
}

async function resolveRepoRoot(): Promise<string | null> {
  const candidates = new Set<string>([
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), '../..'),
    path.resolve(process.cwd(), '../../..'),
  ]);

  for (let level = 0; level <= 7; level += 1) {
    const parentChain = Array.from({ length: level }, () => '..');
    candidates.add(path.resolve(import.meta.dirname, ...parentChain));
  }

  for (const candidate of candidates) {
    const hasCatalog = await pathExists(path.join(candidate, 'catalog'));
    const hasWorkflows = await pathExists(path.join(candidate, 'workflows', 'public'));
    if (hasCatalog && hasWorkflows) {
      return candidate;
    }
  }

  return null;
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

function mapApiAgents(agents: ApiAgentManifest[] | undefined): MarketingAgent[] {
  return asArray(agents).map((agent) => {
    const id = toStringValue(agent.id) || 'unknown-agent';
    const name = toStringValue(agent.name) || humanizeId(id);
    const description = toStringValue(agent.description) || 'AI agent for operational automation';
    const category = normalizeMarketingCategory(
      toStringValue(agent.catalogGroup) ??
        toStringValue(agent.category) ??
        toStringValue(agent.domain)
    );

    return {
      id,
      name,
      category,
      description,
      timeSaved: 'Live',
      accuracy: 'Real',
    };
  });
}

function mapApiWorkflows(workflows: ApiWorkflowManifest[] | undefined): MarketingWorkflow[] {
  return asArray(workflows).map((workflow) => {
    const id = toStringValue(workflow.id) || 'unknown-workflow';
    const name = toStringValue(workflow.name) || humanizeId(id);
    const description = toStringValue(workflow.summary) ?? toStringValue(workflow.description);
    const trigger = readWorkflowTrigger(workflow.trigger) || 'manual';

    return {
      id,
      name,
      trigger,
      action: deriveWorkflowAction(description),
    };
  });
}

function mapApiPacks(packs: ApiPackManifest[] | undefined): MarketingPack[] {
  return asArray(packs).map((pack) => {
    const id = toStringValue(pack.id) || 'unknown-pack';
    const name = toStringValue(pack.name) || humanizeId(id);
    const description = toStringValue(pack.description) || 'Curated bundle for automation outcomes';
    const agents = toStringArray(pack.includedAgents ?? pack.agents);
    const workflows = toStringArray(pack.includedWorkflows ?? pack.workflows);

    return {
      id,
      name,
      description,
      agents: agents.length,
      workflows: workflows.length,
      outcome: derivePackOutcome(description),
    };
  });
}

function readWorkflowTrigger(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && value !== null) {
    return toStringValue((value as { type?: unknown }).type);
  }

  return undefined;
}

function asArray<T>(value: T[] | undefined): T[] {
  if (!Array.isArray(value)) return [];
  return value;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => toStringValue(item)).filter((item): item is string => Boolean(item));
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
