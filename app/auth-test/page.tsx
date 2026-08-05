import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

export default function AuthTestPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-xl rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">Froto Authentication Test</h1>

        <p className="mt-3 text-slate-600">
          This page confirms that Clerk authentication is working.
        </p>

        <div className="mt-8 flex items-center gap-3">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded-lg border px-4 py-2 font-medium">
                Sign in
              </button>
            </SignInButton>

            <SignUpButton mode="modal">
              <button className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white">
                Create account
              </button>
            </SignUpButton>
          </Show>

          <Show when="signed-in">
            <div className="flex items-center gap-3">
              <span className="font-medium">You are signed in</span>
              <UserButton />
            </div>
          </Show>
        </div>
      </div>
    </main>
  );
}