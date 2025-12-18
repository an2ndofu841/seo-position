-- Keyword Groups Table
create table keyword_groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Keyword Group Members (Many-to-Many relationship)
create table keyword_group_members (
  group_id uuid references keyword_groups(id) on delete cascade not null,
  keyword_id uuid references keywords(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (group_id, keyword_id)
);

-- RLS Policies
alter table keyword_groups enable row level security;
alter table keyword_group_members enable row level security;

-- Allow public access (read/write/delete)
create policy "Allow public access on keyword_groups"
on keyword_groups for all using (true);

create policy "Allow public access on keyword_group_members"
on keyword_group_members for all using (true);

