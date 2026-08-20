"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton, useAuth } from "@clerk/nextjs";

export function PublicBrandHeader() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();

  return (
    <header className="relative z-50 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" aria-label="Froto home" className="shrink-0">
          <Image
            src="/brand/froto-logo.svg"
            alt="Froto. Connect. Match. Move."
            width={190}
            height={48}
            priority
            className={pathname === "/" ? "h-11 w-auto" : "h-9 w-auto"}
          />
        </Link>

        <nav className="ml-auto flex items-center gap-2 text-sm font-medium">
          {isSignedIn ? (
            <>
              <Link
                href="/platform/dashboard"
                className="rounded-xl px-3 py-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
              >
                Dashboard
              </Link>
              <SignOutButton>
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[#062856] transition-colors hover:bg-slate-50"
                >
                  Sign out
                </button>
              </SignOutButton>
            </>
          ) : (
            <>
              <Link
                href="/platform"
                className="rounded-xl px-3 py-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
              >
                Marketplace
              </Link>
              <Link
                href="/auth-test"
                className="rounded-xl bg-[#062856] px-4 py-2 text-white transition-colors hover:bg-[#0a356f]"
              >
                Join / Sign in
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
