import { DEMO_WORKSPACE_ID } from '@/lib/providers/tenant';
import { getAppUrl } from '@/lib/runtime/public-origins';

export const PUBLIC_DEMO_CLINIC_HREF = getAppUrl(`/app/${DEMO_WORKSPACE_ID}/dashboard`);
export const PUBLIC_APP_LOGIN_HREF = getAppUrl('/login');
export const TECHNICAL_ENGINE_HREF = '/docs/engine';
