import Link from "next/link";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Building2, LockKeyhole, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function StartPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/auth-test");
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { companies: true },
  });

  if (!user) {
    redirect("/user-sync");
  }

  if (user.companies.length > 0) {
    redirect("/platform/dashboard");
  }

  if (user.accountType === "PERSONAL") {
    redirect("/platform/guest-auctions");
  }

  async function continueAsGuest() {
    "use server";

    const { userId: activeUserId } = await auth();
    if (!activeUserId) {
      redirect("/auth-test");
    }

    await prisma.user.update({
      where: { clerkId: activeUserId },
      data: { accountType: "PERSONAL" },
    });

    redirect("/platform/guest-auctions");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <Image
            src="/brand/froto-logo.svg"
            alt="Froto. Connect. Match. Move."
            width={220}
            height={56}
            priority
            className="mx-auto h-14 w-auto"
          />
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-froto-blue">
            Welcome to Froto
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-froto-navy sm:text-4xl">
            How would you like to use Froto?
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Post a transport job as an individual customer, or create a company profile to list capacity,
            bid on work, respond to tenders and manage logistics jobs.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Card className="rounded-[1.75rem] border-froto-teal/10 bg-white shadow-md shadow-froto-navy/5">
            <CardHeader>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 ring-1 ring-teal-100">
                <UserRound className="h-5 w-5 text-froto-teal" />
              </span>
              <CardTitle className="mt-3 text-xl text-froto-navy">I need something moved</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm leading-6 text-slate-600">
                Continue as an individual guest customer. Post a transport requirement, receive private sealed bids
                from Froto companies, compare their reputation and choose the provider you prefer.
              </p>
              <form action={continueAsGuest}>
                <Button type="submit" className="w-full gap-2 bg-froto-navy hover:bg-[#0a356f]">
                  <LockKeyhole className="h-4 w-4" />
                  Post a guest job
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-froto-blue/10 bg-white shadow-md shadow-froto-navy/5">
            <CardHeader>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 ring-1 ring-blue-100">
                <Building2 className="h-5 w-5 text-froto-blue" />
              </span>
              <CardTitle className="mt-3 text-xl text-froto-navy">I represent a company</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm leading-6 text-slate-600">
                Set up your business profile so your company can create listings and tenders, bid on guest jobs,
                submit responses and manage awarded work.
              </p>
              <Button asChild variant="outline" className="w-full gap-2 border-froto-blue/20 text-froto-navy">
                <Link href="/company/new">
                  <Building2 className="h-4 w-4 text-froto-blue" />
                  Create company
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
