"use client";

import Link from "next/link";
import { Megaphone, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

 type OpportunityTarget = {
  kind: "listing" | "tender";
  id: string;
  apiPath: string;
};

function getTarget(pathname: string): OpportunityTarget | null {
  const listingMatch = pathname.match(/^\/platform\/listing\/([^/]+)$/);
  if (listingMatch) {
    return {
      kind: "listing",
      id: listingMatch[1],
      apiPath: `/api/listings/${listingMatch[1]}`,
    };
  }

  const tenderMatch = pathname.match(/^\/platform\/tenders\/([^/]+)$/);
  if (tenderMatch && tenderMatch[1] !== "new" && tenderMatch[1] !== "manage") {
    return {
      kind: "tender",
      id: tenderMatch[1],
      apiPath: `/api/tenders/${tenderMatch[1]}`,
    };
  }

  return null;
}

export function OwnerPromotionEntry() {
  const pathname = usePathname();
  const target = useMemo(() => getTarget(pathname), [pathname]);
  const [isOwner, setIsOwner] = useState(false);
  const [checkedTarget, setCheckedTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!target) {
      setIsOwner(false);
      setCheckedTarget(null);
      return;
    }

    let cancelled = false;
    const targetKey = `${target.kind}:${target.id}`;

    void fetch(target.apiPath, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { isOwner?: boolean };
      })
      .then((data) => {
        if (cancelled) return;
        setIsOwner(Boolean(data?.isOwner));
        setCheckedTarget(targetKey);
      })
      .catch(() => {
        if (cancelled) return;
        setIsOwner(false);
        setCheckedTarget(targetKey);
      });

    return () => {
      cancelled = true;
    };
  }, [target]);

  if (!target || checkedTarget !== `${target.kind}:${target.id}` || !isOwner) {
    return null;
  }

  const label = target.kind === "tender" ? "tender" : "listing";
  const href = `/platform/promotions?type=${target.kind}&id=${encodeURIComponent(target.id)}`;

  return (
    <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 via-white to-froto-ice px-4 py-3">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-froto-navy">Want more visibility for this {label}?</p>
              <Badge className="border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">Optional</Badge>
            </div>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              Preview Froto promotion options. Normal marketplace participation remains free and pricing is not active yet.
            </p>
          </div>
        </div>

        <Button asChild variant="outline" className="shrink-0 gap-2 border-amber-200 bg-white text-froto-navy hover:bg-amber-50">
          <Link href={href}>
            <Megaphone className="h-4 w-4 text-amber-700" />
            Promote this opportunity
          </Link>
        </Button>
      </div>
    </div>
  );
}
