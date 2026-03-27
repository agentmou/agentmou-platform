import Link from 'next/link';
import { Logo } from '@/components/brand';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center px-6">
        <Link href="/" className="flex items-center group">
          <Logo variant="header" />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center bg-muted/30 px-4 py-12 pb-16">
        {children}
      </main>
    </div>
  );
}
