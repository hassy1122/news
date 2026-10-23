import { NextRequest, NextResponse } from "next/server";
import { loadPrefs, savePrefs } from "@/lib/prefs-store";
import type { NotificationRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Pending-deliveries endpoint.
 * GET  → records awaiting a live browser (status "generated").
 * POST → (a) mark a record with its ACTUAL delivery outcome, or
 *        (b) type:"test" → create + return a test notification immediately.
 *
 * If nothing picks a record up, the history honestly keeps saying
 * "generated — not delivered to any client".
 */
export async function GET() {
  const prefs = await loadPrefs();
  const records = prefs.notificationHistory.filter((n) => n.delivery === "generated").slice(0, 5);
  return NextResponse.json({ records, permissionAsked: prefs.notifications.permissionAsked });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    id?: string; status?: string; note?: string; permissionAsked?: boolean;
    type?: "test";
  };

  if (body.type === "test") {
    const record: NotificationRecord = {
      id: `t_${Date.now()}`,
      createdAt: new Date().toISOString(),
      title: "Test notification",
      body: "Notifications are working. This is how alerts will look.",
      url: "/",
      topic: "Test",
      delivery: "delivered-live",
      note: "Test requested from Notification Settings.",
    };
    const next = await savePrefs((p) => {
      p.notificationHistory = [record, ...p.notificationHistory].slice(0, 120);
      if (body.permissionAsked !== undefined) p.notifications.permissionAsked = body.permissionAsked;
      return p;
    });
    return NextResponse.json({ ok: true, record, prefs: next });
  }

  const next = await savePrefs((p) => {
    p.notificationHistory = p.notificationHistory.map((n) =>
      n.id === body.id ? { ...n, delivery: (body.status ?? "delivered-live") as NotificationRecord["delivery"], note: body.note ?? n.note } : n
    );
    if (body.permissionAsked !== undefined) p.notifications.permissionAsked = body.permissionAsked;
    return p;
  });
  return NextResponse.json({ ok: true, prefs: next });
}
