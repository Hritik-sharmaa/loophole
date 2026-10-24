'use client';

import type { PublicCertificate } from '@loophole/shared';
import { Check, Link2, MessageCircle, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { CrewLineup, Guide } from '@/components/guide';
import { Logo, LoopMark } from '@/components/logo';
import { primaryButton, secondaryButton } from '@/components/ui/buttons';
import { usePublicCertificate } from '@/lib/queries/use-certificates';
import { PageLoader } from '@/components/page-loader';

// FR-15: a finished course's certificate, public, no login needed, so it
// can go on a CV or LinkedIn. It shows only name, course and date.
export default function CertificatePage() {
  const { slug } = useParams<{ slug: string }>();
  const cert = usePublicCertificate(slug);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-4 py-12 sm:px-6">
      <Logo href="/" />

      {cert.isPending ? (
        <PageLoader label="Loading the certificate…" />
      ) : cert.isError ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-4 text-center"
        >
          <title>Certificate not found · Loophole</title>
          <Guide guide="priya" mood="oops" className="h-28 w-20" />
          <p className="font-display text-2xl font-semibold">
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
  // Rendered only in the browser (after the certificate loads).
  const href = window.location.href;
  const share = encodeURIComponent(href);
  const whatsapp = encodeURIComponent(
    `I finished ${cert.courseTitle} on Loophole! ${href}`,
  );

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
    } catch {
      // Clipboard blocked: the address bar still has the link.
    }
  }

  return (
    <>
      <title>{`${cert.username} · ${cert.courseTitle} · Loophole`}</title>
      {/* A paper certificate: a frame inside the edge, the name in the
          middle, and the date, the seal and the crew along the bottom. */}
      <article className="w-full rounded-[2rem] bg-paper p-3 shadow-sticker sm:p-4">
        <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-[1.5rem] border-2 border-violet-tint px-6 py-10 text-center sm:px-12 sm:py-12">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(#ede7ff_1.2px,transparent_1.3px)] [background-size:18px_18px] opacity-70"
          />
          <p className="relative font-mono text-xs font-semibold tracking-[0.25em] text-violet uppercase">
            Certificate of completion
          </p>
          <p className="relative mt-4 text-text-secondary">
            This certifies that
          </p>
          <h1 className="relative font-display text-4xl font-semibold break-all sm:text-6xl">
            {cert.username}
          </h1>
          <span
            aria-hidden
            className="relative -mt-1 h-1.5 w-40 rounded-full bg-sun sm:w-56"
          />
          <p className="relative mt-2 text-text-secondary">
            completed the course
          </p>
          <p className="relative font-display text-2xl font-semibold sm:text-3xl">
            {cert.courseTitle}
          </p>

          <div className="relative mt-8 grid w-full grid-cols-[1fr_auto_1fr] items-end gap-4">
            <div className="flex flex-col items-start gap-1 text-left">
              <span className="text-sm font-bold sm:text-base">{date}</span>
              <span className="w-full border-t border-border-muted pt-1 text-xs font-semibold text-text-secondary">
                Issued on
              </span>
            </div>
            <Seal />
            <div className="flex flex-col items-end gap-1 text-right">
              {/* Too wide for a phone: there the signature line is enough. */}
              <span className="hidden sm:block">
                <CrewLineup mood="happy" size="sm" className="-mb-1" />
              </span>
              <span className="w-full border-t border-border-muted pt-1 text-xs font-semibold text-text-secondary">
                The Loophole crew
              </span>
            </div>
          </div>
        </div>
      </article>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={copyLink} className={primaryButton}>
          {copied ? (
            <>
              <Check className="size-4" strokeWidth={3} aria-hidden /> Link
              copied
            </>
          ) : (
            <>
              <Link2 className="size-4" strokeWidth={3} aria-hidden /> Copy link
            </>
          )}
        </button>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${share}`}
          target="_blank"
          rel="noopener noreferrer"
          className={secondaryButton}
        >
          <Share2 className="size-4" strokeWidth={3} aria-hidden /> Share on
          LinkedIn
        </a>
        <a
          href={`https://wa.me/?text=${whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className={secondaryButton}
        >
          <MessageCircle className="size-4" strokeWidth={3} aria-hidden />{' '}
          WhatsApp
        </a>
      </div>
    </>
  );
}

// The seal: the loop logo on a scalloped Sunflower badge.
function Seal() {
  const bumps = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    return [50 + Math.cos(a) * 40, 50 + Math.sin(a) * 40];
  });
  return (
    <div
      aria-hidden
      className="relative grid size-24 place-items-center sm:size-28"
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 size-full -rotate-6"
      >
        {bumps.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="10" fill="#ffc21a" />
        ))}
        <circle cx="50" cy="50" r="40" fill="#ffc21a" />
        <circle
          cx="50"
          cy="50"
          r="32"
          fill="none"
          stroke="#1e1638"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
      </svg>
      <LoopMark className="relative size-11 sm:size-12" />
    </div>
  );
}
