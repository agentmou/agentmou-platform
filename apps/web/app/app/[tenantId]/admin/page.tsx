'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function AdminIndexPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;

  React.useEffect(() => {
    router.replace(`/app/${tenantId}/admin/tenants`);
  }, [router, tenantId]);

  return null;
}
