alter table public.books
  add column if not exists is_favorite boolean not null default false;
alter table public.stories
  add column if not exists is_favorite boolean not null default false;

create index if not exists books_user_favorite_idx
  on public.books (user_id, updated_at desc) where is_favorite;
create index if not exists stories_user_favorite_idx
  on public.stories (user_id, updated_at desc) where is_favorite;

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  book_id uuid references public.books(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  page_number integer not null check (page_number >= 1),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(book_id, story_id) = 1),
  check (note is null or char_length(note) <= 500)
);

create index if not exists bookmarks_user_created_idx
  on public.bookmarks (user_id, created_at desc);
create unique index if not exists bookmarks_user_book_page_idx
  on public.bookmarks (user_id, book_id, page_number)
  where book_id is not null;
create unique index if not exists bookmarks_user_story_page_idx
  on public.bookmarks (user_id, story_id, page_number)
  where story_id is not null;
