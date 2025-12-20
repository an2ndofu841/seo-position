-- Create sites table
create table if not exists sites (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for sites
alter table sites enable row level security;
drop policy if exists "Allow public access on sites" on sites;
create policy "Allow public access on sites" on sites for all using (true);

-- Insert a default site for existing data
do $$
declare
  default_site_id uuid;
begin
  if not exists (select 1 from sites) then
    insert into sites (name) values ('My Site') returning id into default_site_id;
  else
    select id into default_site_id from sites limit 1;
  end if;

  -- 1. Update keywords table
  if not exists (select 1 from information_schema.columns where table_name = 'keywords' and column_name = 'site_id') then
    alter table keywords add column site_id uuid references sites(id) on delete cascade;
    
    -- Assign all existing keywords to the default site
    update keywords set site_id = default_site_id where site_id is null;
    
    -- Make site_id required
    alter table keywords alter column site_id set not null;
    
    -- Update constraints
    alter table keywords drop constraint if exists keywords_keyword_key;
    alter table keywords add constraint keywords_site_id_keyword_key unique (site_id, keyword);
  end if;

  -- 2. Update groups table
  if not exists (select 1 from information_schema.columns where table_name = 'groups' and column_name = 'site_id') then
    alter table groups add column site_id uuid references sites(id) on delete cascade;
    
    -- Assign all existing groups to the default site
    update groups set site_id = default_site_id where site_id is null;
    
    -- Make site_id required
    alter table groups alter column site_id set not null;
  end if;

end $$;
