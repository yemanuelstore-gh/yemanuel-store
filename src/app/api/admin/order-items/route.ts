import { NextResponse } from "next/server";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { getOrderItemsForSelect } from "@/lib/admin/returns";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.sales.read)) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId." }, { status: 400 });
  }

  const items = await getOrderItemsForSelect(orderId);
  return NextResponse.json({ items });
}