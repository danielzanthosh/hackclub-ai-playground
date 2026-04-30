-- Create users table
create table public.users (
  id uuid primary key default gen_random_uuid(),
  uuid text unique not null,
  name text,
  avatar_color text,
  accent_color text,
  api_key text,
  base_url text default 'https://ai.hackclub.com/proxy/v1',
  custom_models text[],
  default_chat_model text,
  default_image_model text,
  default_embedding_model text,
  created_at bigint default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint default (extract(epoch from now()) * 1000)::bigint
);

-- Create chats table
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  title text not null,
  model text not null,
  params jsonb,
  created_at bigint default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint default (extract(epoch from now()) * 1000)::bigint
);

-- Create messages table
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references public.chats(id) on delete cascade,
  role text check (role in ('user', 'assistant', 'system')),
  content text not null,
  timestamp bigint default (extract(epoch from now()) * 1000)::bigint
);

-- Create generations table
create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  mode text not null,
  prompt text not null,
  params jsonb,
  output_url text,
  output_text text,
  model text not null,
  created_at bigint default (extract(epoch from now()) * 1000)::bigint
);

-- Indexes
create index idx_users_uuid on public.users(uuid);
create index idx_chats_user_id on public.chats(user_id);
create index idx_messages_chat_id on public.messages(chat_id);
create index idx_generations_user_id on public.generations(user_id);

-- Enable RLS
alter table public.users enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.generations enable row level security;

-- Simple permissive policies for playground (can be tightened later)
create policy "Allow all on users" on public.users for all using (true) with check (true);
create policy "Allow all on chats" on public.chats for all using (true) with check (true);
create policy "Allow all on messages" on public.messages for all using (true) with check (true);
create policy "Allow all on generations" on public.generations for all using (true) with check (true);
