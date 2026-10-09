-- Minimal emulation of the Supabase platform objects that our migrations and
-- RLS policies depend on. Mirrors Supabase's definitions where it matters:
--   * roles anon / authenticated / service_role (service_role bypasses RLS)
--   * auth.uid() reads the JWT `sub` claim from request.jwt.claims
--   * default privileges: Supabase grants ALL on new public tables to the API roles
--   * storage.buckets / storage.objects with RLS, storage.foldername()
-- NOT emulated: the Storage API's size/MIME enforcement, PostgREST, GoTrue.

CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

-- ─── auth ───────────────────────────────────────────────────────────────────
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

CREATE TABLE auth.users (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email               text UNIQUE,
  raw_user_meta_data  jsonb DEFAULT '{}'::jsonb,
  raw_app_meta_data   jsonb DEFAULT '{}'::jsonb,
  created_at          timestamptz DEFAULT now()
);

CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ),
    ''
  )::uuid
$$;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;

-- ─── storage ────────────────────────────────────────────────────────────────
CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;

CREATE TABLE storage.buckets (
  id                  text PRIMARY KEY,
  name                text NOT NULL,
  public              boolean DEFAULT false,
  file_size_limit     bigint,
  allowed_mime_types  text[],
  created_at          timestamptz DEFAULT now()
);

CREATE TABLE storage.objects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id   text REFERENCES storage.buckets(id),
  name        text NOT NULL,
  owner       uuid,
  metadata    jsonb,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (bucket_id, name)
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT ALL ON storage.objects, storage.buckets TO anon, authenticated, service_role;

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  _parts text[];
BEGIN
  SELECT string_to_array(name, '/') INTO _parts;
  RETURN _parts[1:array_length(_parts, 1) - 1];
END;
$$;
GRANT EXECUTE ON FUNCTION storage.foldername(text) TO anon, authenticated, service_role;

-- ─── Supabase's event-trigger helper as it exists on the hosted project ────
-- Recreated as a callable SECURITY DEFINER function with the same default
-- (callable by API roles) exposure the advisor flagged.
CREATE FUNCTION public.rls_auto_enable() RETURNS void
LANGUAGE sql SECURITY DEFINER
AS $$ SELECT $$;
