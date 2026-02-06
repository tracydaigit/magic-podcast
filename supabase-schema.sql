-- Run this in your Supabase SQL Editor to set up the database

-- Podcasts table
create table public.podcasts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  title text not null default 'Untitled',
  status text not null default 'extracting'
    check (status in ('extracting', 'generating', 'synthesizing', 'ready', 'error', 'expired')),
  script jsonb,
  audio_url text,
  duration_seconds integer,
  word_count integer,
  error_message text,
  created_at timestamptz default now() not null,
  expires_at timestamptz default (now() + interval '30 days') not null
);

-- Playback progress table
create table public.playback_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  podcast_id uuid references public.podcasts(id) on delete cascade not null,
  progress_seconds real not null default 0,
  completed boolean not null default false,
  last_played_at timestamptz default now() not null,
  unique(user_id, podcast_id)
);

-- Indexes
create index idx_podcasts_user_id on public.podcasts(user_id);
create index idx_podcasts_status on public.podcasts(status);
create index idx_podcasts_expires_at on public.podcasts(expires_at);
create index idx_playback_user_podcast on public.playback_progress(user_id, podcast_id);

-- Row Level Security
alter table public.podcasts enable row level security;
alter table public.playback_progress enable row level security;

-- Policies: users can only access their own data
create policy "Users can view own podcasts"
  on public.podcasts for select
  using (auth.uid() = user_id);

create policy "Users can insert own podcasts"
  on public.podcasts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own podcasts"
  on public.podcasts for update
  using (auth.uid() = user_id);

create policy "Users can delete own podcasts"
  on public.podcasts for delete
  using (auth.uid() = user_id);

create policy "Users can view own progress"
  on public.playback_progress for select
  using (auth.uid() = user_id);

create policy "Users can upsert own progress"
  on public.playback_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own progress"
  on public.playback_progress for update
  using (auth.uid() = user_id);

-- Storage bucket for podcast audio files
insert into storage.buckets (id, name, public)
values ('podcast-audio', 'podcast-audio', false);

-- Storage policies
create policy "Users can upload own audio"
  on storage.objects for insert
  with check (
    bucket_id = 'podcast-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can read own audio"
  on storage.objects for select
  using (
    bucket_id = 'podcast-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own audio"
  on storage.objects for delete
  using (
    bucket_id = 'podcast-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
