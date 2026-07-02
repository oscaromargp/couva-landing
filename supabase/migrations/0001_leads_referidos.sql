-- COUVA 6x6 - PardeSantos | Esquema de captacion (blindado)
-- RLS activado: INSERT publico (rol anon, via n8n), SELECT/UPDATE/DELETE bloqueados.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text, email text, telefono text,
  idioma text default 'es',
  tipo_interes text, cta text, mensaje text,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  referrer text, landing_path text,
  consentimiento boolean not null default false,
  estado text not null default 'nuevo',
  notas text
);
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_estado_idx on public.leads (estado);

create table if not exists public.referidos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text, email text, telefono text,
  tipo text, zona text, mensaje text, idioma text default 'es',
  utm_source text, utm_campaign text,
  consentimiento boolean not null default false,
  estado text not null default 'nuevo',
  notas text
);
create index if not exists referidos_created_at_idx on public.referidos (created_at desc);

alter table public.leads enable row level security;
alter table public.referidos enable row level security;

create policy "anon_insert_leads" on public.leads for insert to anon with check (true);
create policy "anon_insert_referidos" on public.referidos for insert to anon with check (true);
