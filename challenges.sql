-- ============================================================
-- VIAXES v4 — Táboas novas
-- Executa isto no SQL Editor de Supabase (despois do schema.sql)
-- ============================================================

-- Configuración por viaxe (destino, moneda, coordenadas, etc.)
create table if not exists trip_config (
  trip_id     uuid primary key references trips(id) on delete cascade,
  dest_name   text,                        -- "Lisboa, Portugal"
  dest_lat    double precision,
  dest_lng    double precision,
  currency    text   default 'EUR',        -- código ISO: EUR, USD, GBP...
  currency_to text   default 'EUR',        -- moneda destino para conversión
  budget      numeric default 0,
  timezone    text   default 'Europe/Madrid',
  public_slug text   unique,               -- para link de lectura pública
  updated_at  timestamptz default now()
);

-- Banda sonora do viaxe
create table if not exists trip_songs (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid references trips(id) on delete cascade,
  title       text not null,
  artist      text,
  day         date,
  note        text,
  youtube_id  text,
  added_by    uuid references auth.users(id),
  created_at  timestamptz default now()
);

-- Presuposto por categoría
create table if not exists trip_budget (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid references trips(id) on delete cascade,
  category    text not null,    -- aloxamento, comida, transporte, ocio, compras, outro
  amount      numeric default 0,
  note        text,
  paid_by     uuid references auth.users(id),
  entry_date  date default current_date,
  created_at  timestamptz default now()
);

-- Layout dos widgets por usuario+viaxe
create table if not exists widget_layout (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  trip_id     uuid references trips(id) on delete cascade,
  widgets     jsonb default '[]',   -- [{id, enabled, order}]
  updated_at  timestamptz default now(),
  unique(user_id, trip_id)
);

-- User settings (se non existe xa da v3)
create table if not exists user_settings (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  theme       text    default 'light',
  accent      text    default '#007AFF',
  font        text    default 'inter',
  updated_at  timestamptz default now()
);

-- RLS
alter table trip_config     enable row level security;
alter table trip_songs      enable row level security;
alter table trip_budget     enable row level security;
alter table widget_layout   enable row level security;
alter table user_settings   enable row level security;

-- trip_config: acceso público para slug (lectura), membros para todo
create policy "membros ven config"    on trip_config for select using (is_trip_member(trip_id));
create policy "config publica slug"   on trip_config for select using (public_slug is not null);
create policy "membros crean config"  on trip_config for insert with check (is_trip_member(trip_id));
create policy "membros editan config" on trip_config for update using (is_trip_member(trip_id));

-- trip_songs
create policy "membros ven cancions"    on trip_songs for select using (is_trip_member(trip_id));
create policy "membros crean cancions"  on trip_songs for insert with check (is_trip_member(trip_id));
create policy "membros borran cancions" on trip_songs for delete using (is_trip_member(trip_id));

-- trip_budget
create policy "membros ven budget"    on trip_budget for select using (is_trip_member(trip_id));
create policy "membros crean budget"  on trip_budget for insert with check (is_trip_member(trip_id));
create policy "membros borran budget" on trip_budget for delete using (is_trip_member(trip_id));

-- widget_layout
create policy "usuario ve layout"    on widget_layout for select using (auth.uid() = user_id);
create policy "usuario crea layout"  on widget_layout for insert with check (auth.uid() = user_id);
create policy "usuario edita layout" on widget_layout for update using (auth.uid() = user_id);

-- user_settings
create policy "usuario ve settings"    on user_settings for select using (auth.uid() = user_id);
create policy "usuario crea settings"  on user_settings for insert with check (auth.uid() = user_id);
create policy "usuario edita settings" on user_settings for update using (auth.uid() = user_id);

-- Lectura pública por slug (para viaxe compartida)
create or replace function get_trip_by_slug(_slug text)
returns setof trips
language sql security definer stable as $$
  select t.* from trips t
  join trip_config c on c.trip_id = t.id
  where c.public_slug = _slug;
$$;
