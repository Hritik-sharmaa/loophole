'use client';

import Link from 'next/link';
import { useSession } from '@/lib/use-session';
import { primaryButton, secondaryButton } from '@/components/ui/buttons';

// The nav button: "Log in" for visitors, "Open app" once signed in.
export function NavAuthButton() {
  const { session } = useSession();

  return session ? (
    <Link href="/profile" className={`${primaryButton} px-4 py-2 text-sm`}>
      Open app
    </Link>
  ) : (
    <Link href="/login" className={`${secondaryButton} px-4 py-2 text-sm`}>
      Log in
    </Link>
  );
}
