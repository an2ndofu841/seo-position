-- Reset Policies
drop policy if exists "Allow public read access on keywords" on keywords;
drop policy if exists "Allow public insert on keywords" on keywords;
drop policy if exists "Allow public update on keywords" on keywords;
drop policy if exists "Allow public delete on keywords" on keywords;

drop policy if exists "Allow public read access on rankings" on rankings;
drop policy if exists "Allow public insert on rankings" on rankings;
drop policy if exists "Allow public update on rankings" on rankings;
drop policy if exists "Allow public delete on rankings" on rankings;

-- エラー回避のため、テーブルが存在する場合のみポリシーを削除
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'groups') then
    drop policy if exists "Allow public access on groups" on groups;
  end if;
  
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'group_members') then
    drop policy if exists "Allow public access on group_members" on group_members;
  end if;
end $$;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Keywords Table
create table if not exists keywords (
  id uuid default uuid_generate_v4() primary key,
  keyword text not null unique,
  volume integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Rankings Table
create table if not exists rankings (
  id uuid default uuid_generate_v4() primary key,
  keyword_id uuid references keywords(id) on delete cascade not null,
  ranking_date date not null,
  position integer,
  url text,
  is_ai_overview boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(keyword_id, ranking_date)
);

-- 3. Groups Table (プレイリスト) - 名称統一: groups
create table if not exists groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Group Members Table (中間テーブル) - 名称統一: group_members
create table if not exists group_members (
  group_id uuid references groups(id) on delete cascade not null,
  keyword_id uuid references keywords(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (group_id, keyword_id)
);

-- Indexes
create index if not exists idx_keywords_text on keywords(keyword);
create index if not exists idx_rankings_keyword_id on rankings(keyword_id);
create index if not exists idx_rankings_date on rankings(ranking_date);
create index if not exists idx_group_members_group_id on group_members(group_id);
create index if not exists idx_group_members_keyword_id on group_members(keyword_id);

-- RLS Policies
alter table keywords enable row level security;
alter table rankings enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;

-- Public Access Policies (Demo Mode)
create policy "Allow public read access on keywords" on keywords for select using (true);
create policy "Allow public insert on keywords" on keywords for insert with check (true);
create policy "Allow public update on keywords" on keywords for update using (true);
create policy "Allow public delete on keywords" on keywords for delete using (true);

create policy "Allow public read access on rankings" on rankings for select using (true);
create policy "Allow public insert on rankings" on rankings for insert with check (true);
create policy "Allow public update on rankings" on rankings for update using (true);
create policy "Allow public delete on rankings" on rankings for delete using (true);

create policy "Allow public access on groups" on groups for all using (true);
create policy "Allow public access on group_members" on group_members for all using (true);
