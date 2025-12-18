-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Keywords Table
create table keywords (
  id uuid default uuid_generate_v4() primary key,
  keyword text not null unique,
  volume integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Rankings Table
create table rankings (
  id uuid default uuid_generate_v4() primary key,
  keyword_id uuid references keywords(id) on delete cascade not null,
  ranking_date date not null, -- YYYY-MM-01 format
  position integer, -- null means out of rank
  url text,
  is_ai_overview boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(keyword_id, ranking_date) -- Prevent duplicate entries for same keyword in same month
);

-- Indexes for performance
create index idx_keywords_text on keywords(keyword);
create index idx_rankings_keyword_id on rankings(keyword_id);
create index idx_rankings_date on rankings(ranking_date);

-- RLS (Row Level Security) - Allow public read for now, ideally restrict write
alter table keywords enable row level security;
alter table rankings enable row level security;

-- Policy: Allow read access to everyone
create policy "Allow public read access on keywords"
on keywords for select using (true);

create policy "Allow public read access on rankings"
on rankings for select using (true);

-- Policy: Allow insert/update access to everyone (For this MVP demo purpose)
-- In production, you'd likely want authentication for writing
create policy "Allow public insert on keywords"
on keywords for insert with check (true);

create policy "Allow public update on keywords"
on keywords for update using (true);

create policy "Allow public insert on rankings"
on rankings for insert with check (true);

create policy "Allow public update on rankings"
on rankings for update using (true);

