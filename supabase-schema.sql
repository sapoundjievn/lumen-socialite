-- ============================================
-- Lumen Socialite - Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  verified boolean default false,
  followers_count integer default 0,
  following_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Posts (Enlightenments)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  media_urls text[] default '{}',
  reply_to uuid references public.posts(id) on delete set null,
  likes_count integer default 0,
  reposts_count integer default 0,
  replies_count integer default 0,
  views_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Likes
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, post_id)
);

-- 4. Follows
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(follower_id, following_id)
);

-- 5. Indexes for performance
create index if not exists posts_user_id_idx on public.posts(user_id);
create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists likes_post_id_idx on public.likes(post_id);
create index if not exists likes_user_id_idx on public.likes(user_id);
create index if not exists follows_follower_id_idx on public.follows(follower_id);
create index if not exists follows_following_id_idx on public.follows(following_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.follows enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Posts policies
create policy "Posts are viewable by everyone"
  on public.posts for select using (true);

create policy "Authenticated users can create posts"
  on public.posts for insert with check (auth.uid() = user_id);

create policy "Users can update their own posts"
  on public.posts for update using (auth.uid() = user_id);

create policy "Users can delete their own posts"
  on public.posts for delete using (auth.uid() = user_id);

-- Likes policies
create policy "Likes are viewable by everyone"
  on public.likes for select using (true);

create policy "Authenticated users can like"
  on public.likes for insert with check (auth.uid() = user_id);

create policy "Users can unlike"
  on public.likes for delete using (auth.uid() = user_id);

-- Follows policies
create policy "Follows are viewable by everyone"
  on public.follows for select using (true);

create policy "Authenticated users can follow"
  on public.follows for insert with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.follows for delete using (auth.uid() = follower_id);

-- ============================================
-- Functions to keep counts in sync
-- ============================================

-- Update likes_count
create or replace function public.handle_like_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.posts set likes_count = likes_count + 1 where id = NEW.post_id;
  elsif (TG_OP = 'DELETE') then
    update public.posts set likes_count = likes_count - 1 where id = OLD.post_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create or replace trigger on_like_change
  after insert or delete on public.likes
  for each row execute function public.handle_like_count();

-- Update followers / following counts
create or replace function public.handle_follow_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.profiles set following_count = following_count + 1 where id = NEW.follower_id;
    update public.profiles set followers_count = followers_count + 1 where id = NEW.following_id;
  elsif (TG_OP = 'DELETE') then
    update public.profiles set following_count = following_count - 1 where id = OLD.follower_id;
    update public.profiles set followers_count = followers_count - 1 where id = OLD.following_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create or replace trigger on_follow_change
  after insert or delete on public.follows
  for each row execute function public.handle_follow_count();

-- Auto-create profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    coalesce(NEW.raw_user_meta_data->>'display_name', 'New User'),
    coalesce(NEW.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/9.x/avataaars/svg?seed=' || NEW.id)
  );
  return NEW;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
