-- Copia este bloque DESPOIS do schema.sql orixinal
-- (ou pégao xunto ao final do schema.sql)

create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text default 'light',           -- 'light' | 'dark'
  accent text default '#007AFF',        -- cor hex
  font text default 'inter',            -- 'inter' | 'fraunces' | 'dm' | 'mono'
  updated_at timestamptz default now()
);

alter table user_settings enable row level security;
create policy "usuario ve os seus axustes" on user_settings for select using (auth.uid() = user_id);
create policy "usuario crea os seus axustes" on user_settings for insert with check (auth.uid() = user_id);
create policy "usuario edita os seus axustes" on user_settings for update using (auth.uid() = user_id);
