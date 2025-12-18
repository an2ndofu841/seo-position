-- Groups Table
create table if not exists groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Keyword Groups Relation Table (Many-to-Many)
create table if not exists keyword_groups (
  group_id uuid references groups(id) on delete cascade not null,
  keyword_id uuid references keywords(id) on delete cascade not null,
  primary key (group_id, keyword_id)
);

-- RLS Policies for Groups
alter table groups enable row level security;
alter table keyword_groups enable row level security;

-- Allow public access (Demo mode)
create policy "Allow public read access on groups" on groups for select using (true);
create policy "Allow public insert on groups" on groups for insert with check (true);
create policy "Allow public delete on groups" on groups for delete using (true);

create policy "Allow public read access on keyword_groups" on keyword_groups for select using (true);
create policy "Allow public insert on keyword_groups" on keyword_groups for insert with check (true);
create policy "Allow public delete on keyword_groups" on keyword_groups for delete using (true);

