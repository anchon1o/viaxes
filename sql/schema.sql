-- ===========================================================
-- VIAXES · Esquema de base de datos para Supabase
-- Pega este ficheiro completo no SQL editor de Supabase
-- ===========================================================

create extension if not exists "pgcrypto";

-- ---------- TRIPS ----------
create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  end_date date,
  cover_color text default '#16324F',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- ---------- PARTICIPANTES ----------
create table if not exists trip_members (
  trip_id uuid references trips(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'editor',
  joined_at timestamptz default now(),
  primary key (trip_id, user_id)
);

-- ---------- LUGARES (para o mapa) ----------
create table if not exists places (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  name text not null,
  category text default 'parada', -- aloxamento | actividade | parada | restaurante | outro
  lat double precision not null,
  lng double precision not null,
  day date,
  time time,
  notes text,
  order_index int default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- ---------- ITINERARIO (timeline horizontal) ----------
create table if not exists itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  place_id uuid references places(id) on delete set null,
  day date not null,
  time time,
  title text not null,
  description text,
  order_index int default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- ---------- DIARIO DE BITÁCORA ----------
create table if not exists diary_entries (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  author_id uuid references auth.users(id),
  type text not null check (type in ('texto','foto','audio','debuxo')),
  content text,       -- texto libre, ou path de storage para foto/audio/debuxo
  caption text,
  entry_date date default current_date,
  created_at timestamptz default now()
);

-- ---------- LISTAS (maleta, compra, etc) ----------
create table if not exists lists (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  name text not null,
  icon text default '🧳',
  created_at timestamptz default now()
);

create table if not exists list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references lists(id) on delete cascade,
  text text not null,
  category text,
  checked boolean default false,
  added_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- ===========================================================
-- FUNCIÓN AUXILIAR: é o usuario membro da viaxe?
-- ===========================================================
create or replace function is_trip_member(_trip_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from trip_members
    where trip_id = _trip_id and user_id = auth.uid()
  );
$$;

-- ===========================================================
-- FUNCIÓN AUXILIAR: buscar o id dun usuario polo seu "username"
-- (necesaria para convidar participantes a unha viaxe)
-- ===========================================================
create or replace function get_user_id_by_username(_username text)
returns uuid
language sql
security definer
stable
as $$
  select id from auth.users where email = lower(trim(_username)) || '@viaxes.local' limit 1;
$$;

-- ===========================================================
-- RLS: activar en todas as táboas
-- ===========================================================
alter table trips enable row level security;
alter table trip_members enable row level security;
alter table places enable row level security;
alter table itinerary_items enable row level security;
alter table diary_entries enable row level security;
alter table lists enable row level security;
alter table list_items enable row level security;

-- TRIPS
create policy "membros ven a viaxe" on trips for select
  using (is_trip_member(id));
create policy "usuarios autenticados crean viaxes" on trips for insert
  with check (auth.uid() is not null);
create policy "membros editan a viaxe" on trips for update
  using (is_trip_member(id));
create policy "membros borran a viaxe" on trips for delete
  using (is_trip_member(id));

-- TRIP_MEMBERS
create policy "membros ven a lista de membros" on trip_members for select
  using (is_trip_member(trip_id));
create policy "membros engaden membros" on trip_members for insert
  with check (auth.uid() is not null);
create policy "membros saen da viaxe" on trip_members for delete
  using (user_id = auth.uid());

-- PLACES
create policy "membros ven lugares" on places for select using (is_trip_member(trip_id));
create policy "membros crean lugares" on places for insert with check (is_trip_member(trip_id));
create policy "membros editan lugares" on places for update using (is_trip_member(trip_id));
create policy "membros borran lugares" on places for delete using (is_trip_member(trip_id));

-- ITINERARY
create policy "membros ven itinerario" on itinerary_items for select using (is_trip_member(trip_id));
create policy "membros crean itinerario" on itinerary_items for insert with check (is_trip_member(trip_id));
create policy "membros editan itinerario" on itinerary_items for update using (is_trip_member(trip_id));
create policy "membros borran itinerario" on itinerary_items for delete using (is_trip_member(trip_id));

-- DIARY
create policy "membros ven diario" on diary_entries for select using (is_trip_member(trip_id));
create policy "membros crean diario" on diary_entries for insert with check (is_trip_member(trip_id));
create policy "membros editan diario" on diary_entries for update using (is_trip_member(trip_id));
create policy "membros borran diario" on diary_entries for delete using (is_trip_member(trip_id));

-- LISTS
create policy "membros ven listas" on lists for select using (is_trip_member(trip_id));
create policy "membros crean listas" on lists for insert with check (is_trip_member(trip_id));
create policy "membros editan listas" on lists for update using (is_trip_member(trip_id));
create policy "membros borran listas" on lists for delete using (is_trip_member(trip_id));

-- LIST_ITEMS (relación indirecta a través de lists)
create policy "membros ven items" on list_items for select
  using (exists (select 1 from lists where lists.id = list_items.list_id and is_trip_member(lists.trip_id)));
create policy "membros crean items" on list_items for insert
  with check (exists (select 1 from lists where lists.id = list_items.list_id and is_trip_member(lists.trip_id)));
create policy "membros editan items" on list_items for update
  using (exists (select 1 from lists where lists.id = list_items.list_id and is_trip_member(lists.trip_id)));
create policy "membros borran items" on list_items for delete
  using (exists (select 1 from lists where lists.id = list_items.list_id and is_trip_member(lists.trip_id)));

-- ===========================================================
-- STORAGE: bucket para fotos, audios e debuxos
-- (executa isto tamén; crea o bucket "trip-media" público para lectura)
-- ===========================================================
insert into storage.buckets (id, name, public)
values ('trip-media', 'trip-media', true)
on conflict (id) do nothing;

create policy "lectura publica trip-media" on storage.objects for select
  using (bucket_id = 'trip-media');
create policy "usuarios autenticados suben trip-media" on storage.objects for insert
  with check (bucket_id = 'trip-media' and auth.uid() is not null);
create policy "usuarios autenticados borran trip-media" on storage.objects for delete
  using (bucket_id = 'trip-media' and auth.uid() is not null);
