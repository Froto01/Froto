import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function DashboardSection({ title, subtitle, count, icon, children, className = "" }: {
  title: string;
  subtitle: string;
  count: number;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return <details className={`group rounded-[1.75rem] border bg-white shadow-md shadow-froto-navy/5 ${className}`}>
    <summary className="flex cursor-pointer list-none items-center gap-3 rounded-[1.75rem] p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-froto-blue focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
      <span className="shrink-0 text-froto-blue" aria-hidden="true">{icon}</span>
      <span className="min-w-0 flex-1"><span className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{subtitle}</span><span className="mt-1 block text-lg font-semibold text-froto-navy">{title}</span></span>
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600" aria-label={`${count} recent entries`}>{count}</span>
      <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
    </summary>
    {children}
  </details>;
}
