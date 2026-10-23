import { NextRequest, NextResponse } from "next/server";
import { loadAll } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Full item detail (the card's "Read Details"). */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const store = await loadAll();
  const item = store.items[params.id];
  if (!item) return NextResponse.json({ error: "Item not found (it may have been superseded or removed)." }, { status: 404 });
  return NextResponse.json({
    item: {
      ...item,
      corroborations: item.corroborations ?? [],
    },
    // careful cache hints: never present old data as fresh
    freshness: {
      publishedUnknown: !!item.publishedUnknown,
      fetchedAt: item.fetchedAt,
      expired: item.status === "expired",
    },
  });
}
