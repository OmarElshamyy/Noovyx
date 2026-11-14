/**
 * Provisions or promotes a Supabase Auth user to Noovyx Admin via protected `app_metadata`.
 *
 * Usage:
 *   npx tsx scripts/etl/set-admin-role.ts <admin-email> [initial-password-if-creating]
 *
 * Requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` (in shell or `.env.local`).
 */
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./load-env";

async function main() {
  loadLocalEnv();

  const email = (process.argv[2] || "").trim().toLowerCase();
  const password = process.argv[3] || "";
  if (!email || !email.includes("@")) {
    throw new Error("Usage: npx tsx scripts/etl/set-admin-role.ts <admin-email> [password]");
  }

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const secret = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !secret) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in environment or .env.local.");
  }

  const supabase = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Find existing user by email via paginated admin listUsers
  let existingUserId: string | null = null;
  let existingAppMeta: Record<string, unknown> = {};
  let page = 1;
  while (!existingUserId) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Failed listing auth users: ${error.message}`);
    const match = data.users.find((u) => (u.email || "").toLowerCase() === email);
    if (match) {
      existingUserId = match.id;
      existingAppMeta = (match.app_metadata || {}) as Record<string, unknown>;
      break;
    }
    if (data.users.length < 200) break;
    page += 1;
  }

  if (existingUserId) {
    const { error } = await supabase.auth.admin.updateUserById(existingUserId, {
      app_metadata: { ...existingAppMeta, role: "admin", is_admin: true },
    });
    if (error) throw new Error(`Failed updating app_metadata: ${error.message}`);
    const { error: profErr } = await supabase
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", existingUserId);
    if (profErr) throw new Error(`Failed updating profile role: ${profErr.message}`);
    console.log(`[ADMIN] Promoted existing Auth user ${email} (${existingUserId}) to admin.`);
    return;
  }

  if (password.length < 8) {
    throw new Error(
      `User ${email} does not exist yet in Supabase Auth. Pass an initial password (>= 8 chars) as the second argument, or create the user in Supabase Auth first.`,
    );
  }

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "admin", is_admin: true },
  });
  if (createErr || !created.user) {
    throw new Error(`Failed creating admin user: ${createErr?.message || "unknown error"}`);
  }

  console.log(`[ADMIN] Created confirmed Auth admin user ${email} (${created.user.id}).`);
}

main().catch((err) => {
  console.error("[ADMIN] Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
