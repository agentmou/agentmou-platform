import { redirect } from 'next/navigation';
import { PUBLIC_DEMO_CLINIC_HREF } from '@/lib/marketing/public-links';

export default function PlatformPage() {
  redirect(PUBLIC_DEMO_CLINIC_HREF);
}
