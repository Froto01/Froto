import Image from "next/image";
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

export default function AuthTestPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.10),_transparent_30%),#f8fafc] px-6 py-16">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm sm:p-10">
        <Image
          src="/brand/froto-logo.svg"
          alt="Froto. Connect. Match. Move."
          width={220}
          height={56}
          priority
          className="h-14 w-auto"
        />

        <h1 className="mt-8 text-3xl font-bold tracking-tight text-slate-950">
          Welcome to Froto
        </h1>

        <p className="mt-3 text-slate-600">
          Sign in or create your account to connect with logistics capacity,
          match opportunities and move business forward.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Show when="signed-out">
            <SignInButton mode="modal" forceRedirectUrl="/start">
              <button className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-800 transition-colors hover:bg-slate-50">
                Sign in
              </button>
            </SignInButton>

            <SignUpButton mode="modal" forceRedirectUrl="/start">
              <button className="rounded-xl bg-[#062856] px-5 py-2.5 font-medium text-white transition-colors hover:bg-[#0a356f]">
                Create account
              </button>
            </SignUpButton>
          </Show>

          <Show when="signed-in">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <span className="font-medium text-slate-800">You are signed in</span>
              <UserButton />
            </div>
          </Show>
        </div>

        <div className="mt-10 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
          <span className="text-blue-600">Connect.</span>
          <span className="text-cyan-600">Match.</span>
          <span className="text-emerald-600">Move.</span>
        </div>
      </div>
    </main>
  );
}