import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({ eyebrow, title, description, children }: AuthShellProps) {
  return (
    <main className="auth-page">
      <div className="auth-page-header">
        <Link className="auth-brand" href="/" aria-label="Back to BetterSelf home">
          <Image
            src="/betterself-mark-transparent.png"
            alt=""
            width={72}
            height={96}
            className="auth-brand-mark"
          />
          <span>
            <span className="auth-brand-name font-serif">BetterSelf</span>
            <span className="auth-brand-tagline">Home Aesthetics</span>
          </span>
        </Link>
        <Link className="auth-back-link" href="/">
          Back to site
        </Link>
      </div>

      <div className="auth-page-layout">
        <aside className="auth-visual-panel" aria-hidden="true">
          <Image
            src="/betterself-face-photo-v2.jpg"
            alt=""
            fill
            priority
            sizes="(min-width: 960px) 48vw, 0px"
            className="object-cover object-[50%_36%]"
          />
          <div className="auth-visual-wash" />
          <div className="auth-visual-copy">
            <p>Private, doctor-led care</p>
            <span>For the moments you choose for yourself.</span>
          </div>
        </aside>

        <section className="auth-form-panel">
          <div className="auth-form-intro">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-4 font-serif text-4xl leading-[0.96] text-[#1F1F1F] md:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-[#595550]">{description}</p>
          </div>
          <div className="auth-clerk-wrap">{children}</div>
          <p className="auth-privacy-note">
            Your booking and medical information stay private to you and the BetterSelf medical team.
          </p>
        </section>
      </div>
    </main>
  );
}
