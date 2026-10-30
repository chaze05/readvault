alter table public.users
  add column if not exists is_admin boolean not null default false,
  add column if not exists session_version integer not null default 0,
  add column if not exists must_change_password boolean not null default false;

create table if not exists public.user_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  pdf_zoom smallint not null default 100 check (pdf_zoom in (75, 100, 125, 150)),
  story_text_size text not null default 'medium'
    check (story_text_size in ('small', 'medium', 'large')),
  reduce_motion boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.account_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  purpose text not null check (purpose in ('password_reset', 'account_invite')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists account_tokens_user_purpose_idx
  on public.account_tokens (user_id, purpose);

create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  ai_provider text not null default 'deepseek'
    check (ai_provider in ('deepseek', 'openai', 'custom')),
  ai_base_url text not null default 'https://api.deepseek.com',
  ai_model text not null default 'deepseek-chat',
  ai_api_key_ciphertext text,
  ai_api_key_hint text,
  ai_daily_limit integer not null default 10
    check (ai_daily_limit between 1 and 100),
  ai_updated_at timestamptz,
  ai_updated_by uuid references public.users(id) on delete set null
);

insert into public.app_settings (id) values (1)
on conflict (id) do nothing;

create table if not exists public.ai_usage (
  user_id uuid not null references public.users(id) on delete cascade,
  usage_date date not null,
  count integer not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);
