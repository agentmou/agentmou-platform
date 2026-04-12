'use client';

import type { ReactNode } from 'react';
import type { TenantShellKey } from '@agentmou/contracts';

import { ClinicShell } from '@/components/clinic/clinic-shell';
import { AgentmouShell } from '@/components/control-plane/app-shell';

type ShellComponent = (props: { children: ReactNode }) => ReactNode;

const SHELL_REGISTRY: Record<TenantShellKey, ShellComponent> = {
  clinic: ClinicShell,
  fisio: ClinicShell,
  platform_internal: AgentmouShell,
};

export function getShellComponent(shellKey: TenantShellKey): ShellComponent {
  return SHELL_REGISTRY[shellKey];
}
