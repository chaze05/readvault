create table if not exists public.blob_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  pathname text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists blob_claims_user_idx
  on public.blob_claims (user_id);

with extracted as (
  select
    b.user_id,
    nullif(
      ltrim(
        split_part(
          split_part(
            regexp_replace(b.file_path, '^https?://[^/]+/*', ''),
            '?',
            1
          ),
          '#',
          1
        ),
        '/'
      ),
      ''
    ) as pathname
  from public.books b
  where b.file_path is not null

  union all

  select
    s.user_id,
    nullif(
      ltrim(
        split_part(
          split_part(
            regexp_replace(s.cover_image_path, '^https?://[^/]+/*', ''),
            '?',
            1
          ),
          '#',
          1
        ),
        '/'
      ),
      ''
    ) as pathname
  from public.stories s
  where s.cover_image_path is not null

  union all

  select
    s.user_id,
    nullif(
      ltrim(
        split_part(
          split_part(
            regexp_replace(p.image_path, '^https?://[^/]+/*', ''),
            '?',
            1
          ),
          '#',
          1
        ),
        '/'
      ),
      ''
    ) as pathname
  from public.story_pages p
  join public.stories s on s.id = p.story_id
  where p.image_path is not null
)
insert into public.blob_claims (user_id, pathname)
select user_id, pathname
from extracted
where pathname is not null
on conflict (pathname) do nothing;
