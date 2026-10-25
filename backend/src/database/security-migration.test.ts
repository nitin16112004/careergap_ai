import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const user = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const admin = "33333333-3333-4333-8333-333333333333";
const tables = ["profiles", "user_roles", "subscriptions", "payment_transactions", "usage_counters", "billing_webhook_events"];
const migration = readFileSync(resolve(process.cwd(), "../supabase/migrations/202610240001_security_authorization.sql"), "utf8");
let db: PGlite;

// Real PostgreSQL permission/RLS execution in WASM, not mocked query chains.
// Minimal Supabase Auth/Storage schemas; staging remains necessary for hosted
// PostgREST grants, managed Auth and actual Storage API integration.
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create schema storage;
    grant usage on schema public, auth, storage to anon, authenticated, service_role;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as
      $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create table auth.users (id uuid primary key, raw_app_meta_data jsonb, banned_until timestamptz);
    create table public.profiles (id uuid primary key, role text default 'user', full_name text,
      email_verified boolean default false, onboarding_completed boolean default false);
    insert into auth.users values ('${user}', '{"role":"user"}', null), ('${other}', '{"role":"user"}', null), ('${admin}', '{"role":"admin"}', null);
    insert into profiles(id,role) values ('${user}','user'), ('${other}','user'), ('${admin}','admin');
    create function public.is_admin() returns boolean language sql stable as
      $$ select coalesce(auth.jwt()->'app_metadata'->>'role','') = 'admin' $$;
  `);
  for (const table of tables.filter((name) => name !== "profiles")) {
    await db.exec(`create table public.${table} (id int generated always as identity primary key,
      user_id uuid, role text, plan_id text, status text, usage_count integer default 0);`);
  }
  // Install the original repository policies for these tables, then prove the
  // migration removes their permissive writes while preserving owner reads.
  const oldPolicies = readFileSync(resolve(process.cwd(), "../supabase/migrations/202606290002_rls_storage_policies.sql"), "utf8");
  for (const statement of oldPolicies.split(";")) {
    if (/create policy/i.test(statement) && tables.some((table) => new RegExp(`on public\\.${table}\\s`).test(statement))) {
      await db.exec(`${statement};`);
    }
  }
  await db.exec(`
    create policy "Users can view own roles" on user_roles for select to authenticated using (auth.uid() = user_id or public.is_admin());
    create policy "Admins can manage user roles" on user_roles for all to authenticated using (public.is_admin()) with check (public.is_admin());
    create policy "Admins can read billing webhook events" on billing_webhook_events for select to authenticated using (public.is_admin());
    create table public.job_roles (id int primary key, role_name text);
    insert into job_roles values (1, 'Developer');
    create policy admin_write on job_roles for all to authenticated using (public.is_admin()) with check (public.is_admin());
    alter table job_roles enable row level security;
    grant all on job_roles to authenticated;
    create table storage.objects (id int primary key, bucket_id text);
    insert into storage.objects values (1, 'knowledge-base-files');
    create policy admin_storage on storage.objects for all to authenticated using (public.is_admin()) with check (public.is_admin());
    alter table storage.objects enable row level security;
    grant all on storage.objects to authenticated;
  `);
  for (const table of tables) {
    await db.exec(`alter table ${table} enable row level security;
      grant all on ${table} to anon, authenticated;
      grant update(role) on ${table} to authenticated;`);
  }
  await db.exec(`grant usage on all sequences in schema public to authenticated, service_role;
    insert into subscriptions(user_id,plan_id,status) values ('${user}','free','active'),('${other}','pro','active');`);
  const prior = await asRole("authenticated", user, "update subscriptions set plan_id='pro' where user_id=auth.uid() returning plan_id");
  expect(prior.rows).toHaveLength(1);
  await db.exec(migration);
  await db.exec(migration); // safe to reapply; existing owner SELECT policies survive
}, 30000);

afterAll(async () => { await db?.close(); });

async function asRole(role: "authenticated" | "anon" | "service_role", id: string, sql: string, claimRole = "user") {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${role}`);
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [id]);
    await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ app_metadata: { role: claimRole } })]);
    return tx.query(sql);
  });
}

describe("server-owned authorization migration", () => {
  it.each(tables)("denies authenticated and anonymous writes to %s, including column grants", async (table) => {
    for (const role of ["authenticated", "anon"] as const) {
      await expect(asRole(role, user, `update ${table} set role='admin'`)).rejects.toThrow(/permission denied/);
      await expect(asRole(role, user, `delete from ${table}`)).rejects.toThrow(/permission denied/);
      await expect(asRole(role, user, `insert into ${table}(role) values ('admin')`)).rejects.toThrow(/permission denied/);
    }
  });

  it("denies paid entitlement changes, counter resets and profile security changes", async () => {
    for (const sql of [
      "update subscriptions set plan_id='premium',status='active'",
      "update usage_counters set usage_count=0",
      "update profiles set role='admin',email_verified=true,onboarding_completed=true",
    ]) await expect(asRole("authenticated", user, sql)).rejects.toThrow(/permission denied/);
  });

  it("preserves owner reads without exposing another user's billing/profile", async () => {
    expect((await asRole("authenticated", user, "select * from subscriptions")).rows).toHaveLength(1);
    expect((await asRole("authenticated", user, "select id from profiles")).rows).toEqual([{ id: user }]);
    expect((await asRole("authenticated", user, "select * from billing_webhook_events")).rows).toHaveLength(0);
  });

  it("allows the trusted service role to update billing and profile state", async () => {
    expect((await asRole("service_role", user, `update profiles set full_name='Reviewed user' where id='${user}' returning id`)).rows).toHaveLength(1);
    expect((await asRole("service_role", user, `update subscriptions set plan_id='premium' where user_id='${user}' returning plan_id`)).rows).toEqual([{ plan_id: "premium" }]);
  });

  it("does not trust forged admin claims from an ordinary account", async () => {
    expect((await asRole("authenticated", user, "select public.is_admin() as allowed", "admin")).rows).toEqual([{ allowed: false }]);
    expect((await asRole("authenticated", user, "update job_roles set role_name='Tampered' returning id", "admin")).rows).toHaveLength(0);
  });

  it("revokes stale admin JWT access to DB and Storage immediately after demotion", async () => {
    expect((await asRole("authenticated", admin, "select public.is_admin() as allowed", "admin")).rows).toEqual([{ allowed: true }]);
    await db.exec(`update auth.users set raw_app_meta_data='{"role":"user"}' where id='${admin}'`);
    try {
      expect((await asRole("authenticated", admin, "select public.is_admin() as allowed", "admin")).rows).toEqual([{ allowed: false }]);
      expect((await asRole("authenticated", admin, "update job_roles set role_name='Tampered' returning id", "admin")).rows).toHaveLength(0);
      expect((await asRole("authenticated", admin, "delete from storage.objects returning id", "admin")).rows).toHaveLength(0);
    } finally {
      await db.exec(`update auth.users set raw_app_meta_data='{"role":"admin"}' where id='${admin}'`);
    }
  });

  it("fails closed for a banned admin or inconsistent current profile role", async () => {
    await db.exec(`update auth.users set banned_until=now()+interval '1 day' where id='${admin}'`);
    expect((await asRole("authenticated", admin, "select public.is_admin() as allowed", "admin")).rows).toEqual([{ allowed: false }]);
    await db.exec(`update auth.users set banned_until=null where id='${admin}'; update profiles set role='user' where id='${admin}'`);
    expect((await asRole("authenticated", admin, "select public.is_admin() as allowed", "admin")).rows).toEqual([{ allowed: false }]);
    await db.exec(`update profiles set role='admin' where id='${admin}'`);
  });
});
