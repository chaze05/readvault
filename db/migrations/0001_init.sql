create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists users_email_lower_idx
  on public.users (lower(email));

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  author text not null default 'Unknown author',
  category text not null default 'Uncategorized',
  description text,
  file_name text not null,
  file_path text not null,
  file_hash text not null,
  total_pages integer not null default 0,
  current_page integer not null default 0,
  status text not null default 'not_started'
    check (status in ('not_started', 'reading', 'completed')),
  cover_color text not null default '#315b45',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, file_hash)
);

create index if not exists books_user_updated_idx
  on public.books (user_id, updated_at desc);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  story_type text not null check (story_type in ('original', 'movie_inspired')),
  source_title text,
  description text,
  age_range text,
  language text not null default 'en',
  cover_image_path text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stories_user_updated_idx
  on public.stories (user_id, updated_at desc);

create table if not exists public.story_pages (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  page_number integer not null,
  content text not null,
  image_path text,
  image_alt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (story_id, page_number)
);

create index if not exists story_pages_story_idx
  on public.story_pages (story_id, page_number);

create table if not exists public.story_progress (
  story_id uuid primary key references public.stories(id) on delete cascade,
  current_page integer not null default 1,
  last_read_at timestamptz,
  updated_at timestamptz not null default now()
);
