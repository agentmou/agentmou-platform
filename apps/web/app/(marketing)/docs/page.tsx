import { redirect } from 'next/navigation';
import { TECHNICAL_ENGINE_HREF } from '@/lib/marketing/public-links';

export default function DocsAliasPage() {
  redirect(TECHNICAL_ENGINE_HREF);
}
