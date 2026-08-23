"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Bell, CheckCheck, Circle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationPayload = {
  unreadCount: number;
  homeHref?: string;
  notifications: NotificationItem[];
  error?: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationPayload>({ unreadCount: 0, notifications: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const payload = (await response.json()) as NotificationPayload;
      if (!response.ok) throw new Error(payload.error ?? "Notifications could not be loaded.");
      setData(payload);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Notifications could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    await load();
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white pb-16">
      <header className="border-b border-froto-blue/10 bg-white/95 shadow-sm shadow-froto-navy/5">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-froto-navy text-white shadow-md shadow-froto-navy/15">
              <Bell className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-froto-blue">Froto alerts</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-froto-navy">Notifications</h1>
              <p className="mt-1 text-sm text-slate-500">{data.unreadCount} unread</p>
            </div>
          </div>
          <div className="flex gap-2">
            {data.unreadCount > 0 ? (
              <Button type="button" variant="outline" onClick={() => void markAllRead()} className="gap-2 border-froto-blue/15 text-froto-navy">
                <CheckCheck className="h-4 w-4" />Mark all read
              </Button>
            ) : null}
            <Button asChild variant="outline" className="gap-2 border-froto-blue/15 text-froto-navy">
              <Link href={data.homeHref ?? "/platform"}><ArrowLeft className="h-4 w-4" />Dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 pt-7">
        {isLoading ? <p className="text-sm text-slate-500">Loading notifications...</p> : null}
        {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        {!isLoading && !error && data.notifications.length === 0 ? (
          <Card className="rounded-[1.7rem] border-froto-blue/10 bg-white shadow-sm shadow-froto-navy/5">
            <CardContent className="p-8 text-center">
              <Bell className="mx-auto h-8 w-8 text-froto-blue" />
              <h2 className="mt-4 text-lg font-semibold text-froto-navy">You’re all caught up</h2>
              <p className="mt-2 text-sm text-slate-500">Bid, tender, job and opportunity alerts will appear here as activity happens.</p>
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-3">
          {data.notifications.map((item) => (
            <Card key={item.id} className={`rounded-[1.5rem] border shadow-sm shadow-froto-navy/5 ${item.readAt ? "border-slate-200 bg-white" : "border-froto-blue/20 bg-blue-50/35"}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <Circle className={`mt-1 h-3 w-3 fill-current ${item.readAt ? "text-slate-300" : "text-froto-blue"}`} />
                    <div>
                      <CardTitle className="text-base text-froto-navy">{item.title}</CardTitle>
                      <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
                    </div>
                  </div>
                  {!item.readAt ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => void markRead(item.id)} className="text-xs text-froto-blue">Mark read</Button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="pl-10">
                <p className="text-sm leading-6 text-slate-600">{item.message}</p>
                {item.href ? (
                  <Button asChild size="sm" className="mt-4 bg-froto-navy hover:bg-[#0a356f]">
                    <Link href={item.href} onClick={() => { if (!item.readAt) void markRead(item.id); }}>Open</Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
