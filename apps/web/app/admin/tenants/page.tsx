import { Suspense } from 'react';

import { AdminTenantsPage } from '@/components/admin/admin-tenants-page';

export default function AdminTenantsRoutePage() {
  // The page reads filters from `useSearchParams`, which Next 16 requires to
  // be wrapped in <Suspense> at the top of the route subtree so the rest can
  // pre-render statically when there are no params.
  return (
    <Suspense fallback={null}>
      <AdminTenantsPage />
    </Suspense>
  );
}
