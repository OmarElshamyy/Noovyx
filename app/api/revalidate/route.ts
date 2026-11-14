import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAuthenticatedServerUser } from "../../../lib/supabase/server";

export async function POST() {
  try {
    const { user, isAdmin } = await getAuthenticatedServerUser();
    if (user && isAdmin) {
      revalidatePath("/");
      return NextResponse.json({ revalidated: true }, { status: 200 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } catch {
    return NextResponse.json({ revalidated: false }, { status: 500 });
  }
}
