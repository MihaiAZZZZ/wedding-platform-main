-- Create a table for the wedding photos
create table photos (
  id uuid default gen_random_uuid() primary key,
  image_url text not null,
  uploader_name text,
  message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table photos enable row level security;

-- Create policies for public access (since it's a shared wedding platform)
-- Anyone can view photos
create policy "Photos are publicly viewable"
  on photos for select
  using ( true );

-- Anyone can insert photos
create policy "Anyone can upload photos"
  on photos for insert
  with check ( true );
