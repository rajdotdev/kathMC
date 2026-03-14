# Student Ledger Management System

A comprehensive web application designed to manage student payments, track event specific dues, and maintain a clear financial ledger.

## Features

* Track student payments and remaining balances.
* Manage multiple events and categories.
* Sort and search students by name or roll number.
* Import student records via CSV.
* Real time database synchronization.
* Responsive design for desktop and mobile use.

## Tech Stack

* Frontend: React, TypeScript, Vite
* Styling: Tailwind CSS
* Backend and Database: Supabase (PostgreSQL)

## Local Development Setup

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Database Setup

To set up the Supabase database, run the following SQL script in your Supabase SQL Editor:

```sql
create table categories (
  id uuid primary key,
  name text not null
);

create table events (
  id uuid primary key,
  name text not null,
  category_id uuid references categories(id) on delete cascade,
  date text not null,
  status text not null,
  amount_per_student numeric default 0
);

create table students (
  id uuid primary key,
  roll_no text,
  name text not null,
  amount_owed numeric default 0,
  amount_paid numeric default 0,
  balances jsonb default '{}'::jsonb
);

create table transactions (
  id uuid primary key,
  student_id uuid references students(id) on delete cascade,
  amount numeric not null,
  date timestamptz not null,
  event_id uuid
);

create table app_settings (
  id integer primary key,
  total_goal numeric default 0
);

insert into app_settings (id, total_goal) values (1, 0);

alter table categories enable row level security;
alter table events enable row level security;
alter table students enable row level security;
alter table transactions enable row level security;
alter table app_settings enable row level security;

create policy "Allow public read/write" on categories for all using (true) with check (true);
create policy "Allow public read/write" on events for all using (true) with check (true);
create policy "Allow public read/write" on students for all using (true) with check (true);
create policy "Allow public read/write" on transactions for all using (true) with check (true);
create policy "Allow public read/write" on app_settings for all using (true) with check (true);
```

## Deployment

This application is optimized for deployment on platforms like Netlify or Vercel. Ensure you add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your environment variables in your hosting provider's dashboard before deploying.

## Credits

Created by a Kathford student by vibe coding.
