-- ───────────────────────────────────────────────────────────────
--  W-7 · Esquema de la red
-- ───────────────────────────────────────────────────────────────
--  Ejecutar con: supabase db push  (o pegarlo en el SQL editor)
--
--  Idea general: la identidad vive acá, no en el router. El nodo sólo sabe
--  abrir y cerrar la puerta para una MAC; quién es esa MAC y si pagó el mes
--  se decide en esta base.

create extension if not exists postgis;
create extension if not exists pgcrypto;

-- ── Nodos ──────────────────────────────────────────────────────
-- Un nodo es el router de un host. `fas_key` y `clave_ticket` son los dos
-- secretos que comparte con la API (ver api/_shared/ticket.js): NUNCA se
-- exponen al navegador, por eso la tabla no tiene policy de lectura pública.
create table if not exists public.nodos (
  id            text primary key,                 -- 'A1043', el gatewayname de openNDS
  alias         text not null,
  host_id       uuid references auth.users (id) on delete set null,
  ubicacion     geography(point, 4326),
  cobertura_m   integer not null default 90,
  fas_key       text not null,
  clave_ticket  text not null,
  activo        boolean not null default true,
  visto_en      timestamptz,                      -- último heartbeat del router
  creado_en     timestamptz not null default now()
);

create index if not exists nodos_ubicacion_idx on public.nodos using gist (ubicacion);

-- ── Suscripciones ──────────────────────────────────────────────
-- Un mes de acceso a toda la red, no un paquete de datos.
create table if not exists public.suscripciones (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     uuid not null references auth.users (id) on delete cascade,
  estado         text not null default 'activa' check (estado in ('activa', 'vencida', 'cancelada')),
  vence_en       timestamptz not null,
  precio_usd     numeric(6, 2) not null,
  billetera      text,
  pago_token     text,                            -- token que devuelve la billetera; no guardamos datos de tarjeta
  activacion     jsonb,                           -- nodo y zona del alta: trazabilidad, no límite de cobertura
  creado_en      timestamptz not null default now()
);

create index if not exists suscripciones_usuario_idx on public.suscripciones (usuario_id, vence_en desc);

-- ── Dispositivos ───────────────────────────────────────────────
-- La MAC que ata la sesión local del router con el usuario que pagó.
-- Es lo que permite el roaming sin volver a pedir nada en el nodo siguiente.
create table if not exists public.dispositivos (
  mac         macaddr primary key,
  usuario_id  uuid not null references auth.users (id) on delete cascade,
  alias       text,
  visto_en    timestamptz not null default now()
);

-- ── Sesiones ───────────────────────────────────────────────────
-- Lo que el nodo reporta: quién estuvo conectado, dónde y cuánto.
-- Es también el registro que cubre al host frente a un pedido judicial.
create table if not exists public.sesiones (
  id            uuid primary key default gen_random_uuid(),
  nodo_id       text not null references public.nodos (id) on delete cascade,
  mac           macaddr not null,
  usuario_id    uuid references auth.users (id) on delete set null,
  metodo        text not null default 'suscripcion',
  inicio        timestamptz not null default now(),
  fin           timestamptz,
  motivo_fin    text,                             -- timeout, quota, ndsctl, shutdown
  bytes_subida  bigint not null default 0,
  bytes_bajada  bigint not null default 0
);

create index if not exists sesiones_nodo_idx on public.sesiones (nodo_id, inicio desc);
create index if not exists sesiones_mac_idx on public.sesiones (mac, inicio desc);

-- ── RLS ────────────────────────────────────────────────────────
-- Todo cerrado por defecto. Las Edge Functions entran con service_role, que
-- salta RLS; el navegador sólo ve lo suyo.
alter table public.nodos          enable row level security;
alter table public.suscripciones  enable row level security;
alter table public.dispositivos   enable row level security;
alter table public.sesiones       enable row level security;

drop policy if exists "cada uno ve su suscripcion" on public.suscripciones;
create policy "cada uno ve su suscripcion" on public.suscripciones
  for select using (auth.uid() = usuario_id);

drop policy if exists "cada uno ve sus dispositivos" on public.dispositivos;
create policy "cada uno ve sus dispositivos" on public.dispositivos
  for select using (auth.uid() = usuario_id);

drop policy if exists "cada uno ve sus sesiones" on public.sesiones;
create policy "cada uno ve sus sesiones" on public.sesiones
  for select using (auth.uid() = usuario_id);

drop policy if exists "el host ve las sesiones de su nodo" on public.sesiones;
create policy "el host ve las sesiones de su nodo" on public.sesiones
  for select using (
    exists (select 1 from public.nodos n where n.id = sesiones.nodo_id and n.host_id = auth.uid())
  );

-- Los nodos se leen por RPC, nunca directo: así el navegador jamás ve las
-- claves. `security definer` + `search_path` fijo para que la función no
-- herede el search_path del que la llama.
create or replace function public.nodos_cercanos(p_lat double precision, p_lng double precision, p_radio integer)
returns table (id text, alias text, lat double precision, lng double precision, cobertura_m integer, en_linea boolean)
language sql
security definer
set search_path = public, pg_catalog
as $$
  select n.id,
         n.alias,
         st_y(n.ubicacion::geometry),
         st_x(n.ubicacion::geometry),
         n.cobertura_m,
         n.visto_en > now() - interval '10 minutes'
  from public.nodos n
  where n.activo
    and st_dwithin(n.ubicacion, st_point(p_lng, p_lat)::geography, p_radio)
  order by n.ubicacion <-> st_point(p_lng, p_lat)::geography
  limit 20;
$$;

revoke all on function public.nodos_cercanos(double precision, double precision, integer) from public;
grant execute on function public.nodos_cercanos(double precision, double precision, integer) to anon, authenticated;
