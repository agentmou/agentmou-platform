import { Suspense } from 'react';
import { AuthForm } from '@/components/auth';
import { Spinner } from '@/components/ui/spinner';

function AuthLoading() {
  return (
    <div
      className="flex min-h-[280px] w-full max-w-md mx-auto items-center justify-center"
      aria-busy="true"
      aria-label="Loading"
    >
      <Spinner className="size-8 text-muted-foreground" />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AuthForm defaultTab="register" />
    </Suspense>
  );
}
