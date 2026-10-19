'use client';

import type { PublicCertificate } from '@loophole/shared';
import { Award, Check, Link2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Byte } from '@/components/byte';
import { Logo } from '@/components/logo';
import { primaryButton, secondaryButton } from '@/components/ui/buttons';
import { usePublicCertificate } from '@/lib/queries/use-certificates';

// FR-15: a finished course's certificate, public, no login needed, so it
// can go on a CV or LinkedIn. It shows only name, course and date.
export default function CertificatePage() {
  const { slug } = useParams<{ slug: string }>();
  const cert = usePublicCertificate(slug);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-4 py-12 sm:px-6">
      <Logo href="/" />

      {cert.isPending ? (
        <p className="text-text-secondary">Loading the certificate…</p>
      ) : cert.isError ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-4 text-center"
        >
          <title>Certificate not found · Loophole</title>
          <Byte mood="oops" className="size-20" />
          <p className="font-display text-2xl font-extrabold">
            Certificate not found
          </p>
          <p className="text-text-secondary">
            Check the link, or ask its owner to share it again.
          </p>
        </div>
      ) : (
        <Certificate cert={cert.data} />
      )}

      <Link href="/" className={secondaryButton}>
        Learn to code on Loophole
      </Link>
    </main>
  );
}

function Certificate({ cert }: { cert: PublicCertificate }) {
  const [copied, setCopied] = useState(false);
  const date = new Date(cert.issuedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      // Clipboard blocked: the address bar still has the link.
    }
  }

  return (
    <>
      <title>{`${cert.username} · ${cert.courseTitle} · Loophole`}</title>
      <article className="relative flex w-full flex-col items-center gap-4 rounded-card border-4 border-ink bg-paper px-6 py-12 text-center shadow-sticker">
        <div className="flex items-end gap-3">
          <Byte mood="happy" className="size-20" />
          <span className="flex size-14 rotate-6 items-center justify-center rounded-node border-2 border-ink bg-lemon text-ink shadow-sticker-sm">
            <Award className="size-8" strokeWidth={2.5} aria-hidden />
          </span>
        </div>
        <p className="text-xs font-bold tracking-widest text-text-secondary uppercase">
          Certificate of completion
        </p>
        <p className="text-text-secondary">This certifies that</p>
        <h1 className="font-display text-4xl font-extrabold break-all">
          {cert.username}
        </h1>
        <p className="text-text-secondary">completed every lesson of</p>
        <p className="font-display text-2xl font-extrabold">
          {cert.courseTitle}
        </p>
        <p className="font-bold">on {date}</p>
      </article>

      <button type="button" onClick={copyLink} className={primaryButton}>
        {copied ? (
          <>
            <Check className="size-4" strokeWidth={3} aria-hidden /> Link copied
          </>
        ) : (
          <>
            <Link2 className="size-4" strokeWidth={3} aria-hidden /> Copy link
          </>
        )}
      </button>
    </>
  );
}
