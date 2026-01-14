-- 1. Profiles Table (User Roles)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  role text default 'client' check (role in ('admin', 'client')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Sites Table (Websites)
create table if not exists sites (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  domain text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. User Site Access (Many-to-Many)
create table if not exists user_site_access (
  user_id uuid references profiles(id) on delete cascade not null,
  site_id uuid references sites(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, site_id)
);

-- 4. Add site_id to keywords (to associate keywords with sites)
-- Note: If keywords are shared across sites, we might need a many-to-many here too.
-- For simplicity in this iteration, assuming a keyword belongs to a site project.
alter table keywords add column if not exists site_id uuid references sites(id) on delete cascade;

-- Enable RLS
alter table profiles enable row level security;
alter table sites enable row level security;
alter table user_site_access enable row level security;

-- Policies for Profiles
-- Users can read their own profile
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

-- Admins can read all profiles
create policy "Admins can view all profiles" on profiles
  for select using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Policies for Sites
-- Admins can do everything
create policy "Admins can manage all sites" on sites
  for all using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Clients can read sites they have access to
create policy "Clients can view assigned sites" on sites
  for select using (
    exists (
      select 1 from user_site_access
      where user_site_access.site_id = sites.id
      and user_site_access.user_id = auth.uid()
    )
  );

-- Policies for User Site Access
-- Admins can manage access
create policy "Admins can manage site access" on user_site_access
  for all using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );
-- Users can view their own access
create policy "Users can view own access" on user_site_access
  for select using (user_id = auth.uid());

-- Function to handle new user signup (automatically create profile)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'client'); -- Default to client
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update Keywords Policy (Restrict by site access)
drop policy if exists "Allow public read access on keywords" on keywords;
create policy "View keywords based on site access" on keywords
  for select using (
    site_id is null -- Public keywords (optional)
    or exists (
      select 1 from user_site_access
      where user_site_access.site_id = keywords.site_id
      and user_site_access.user_id = auth.uid()
    )
    or exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );
