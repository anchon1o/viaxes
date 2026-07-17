-- Engadir despois de v4.sql
-- Retos entre usuarios da viaxe

create table if not exists trip_challenges (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid references trips(id) on delete cascade,
  created_by  uuid references auth.users(id),
  assigned_to uuid references auth.users(id),
  title       text not null,
  description text,
  type        text default 'accion',  -- accion | foto | texto | lugar
  points      int default 10,
  deadline    date,
  status      text default 'pendente', -- pendente | aceptado | completado | rexeitado
  proof_text  text,   -- resposta en texto
  proof_url   text,   -- foto como proba
  completed_at timestamptz,
  created_at  timestamptz default now()
);

alter table trip_challenges enable row level security;
create policy "membros ven retos"    on trip_challenges for select using (is_trip_member(trip_id));
create policy "membros crean retos"  on trip_challenges for insert with check (is_trip_member(trip_id));
create policy "membros editan retos" on trip_challenges for update using (is_trip_member(trip_id));
create policy "membros borran retos" on trip_challenges for delete using (is_trip_member(trip_id));
