-- ============================================================
-- Baseball Lineup Manager — Supabase Schema
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8)),
  created_at  timestamptz not null default now()
);

create table if not exists team_members (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references teams(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'coach',
  created_at timestamptz not null default now(),
  unique(team_id, user_id)
);

create table if not exists players (
  id                   uuid primary key default gen_random_uuid(),
  team_id              uuid not null references teams(id) on delete cascade,
  name                 text not null,
  jersey_number        text,
  preferred_position   text not null check (preferred_position in ('P','C','1B','2B','3B','SS','OF')),
  secondary_positions  text[] not null default '{}',
  active               boolean not null default true,
  created_at           timestamptz not null default now()
);

create table if not exists games (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references teams(id) on delete cascade,
  opponent      text not null,
  date          date not null,
  innings       integer not null default 5,
  batting_order uuid[] not null default '{}',
  created_at    timestamptz not null default now()
);

create table if not exists lineup_assignments (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references games(id) on delete cascade,
  player_id  uuid not null references players(id) on delete cascade,
  inning     integer not null check (inning >= 1),
  position   text not null check (position in ('P','C','1B','2B','3B','SS','OF')),
  created_at timestamptz not null default now(),
  unique(game_id, player_id, inning)
);

-- inning=0 means post-game bulk entry; inning>=1 means per-inning live entry
create table if not exists pitching_log (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid not null references games(id) on delete cascade,
  player_id   uuid not null references players(id) on delete cascade,
  inning      integer not null default 0 check (inning >= 0),
  pitch_count integer not null default 0,
  created_at  timestamptz not null default now(),
  unique(game_id, player_id, inning)
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists team_members_user_id    on team_members(user_id);
create index if not exists team_members_team_id    on team_members(team_id);
create index if not exists players_team_id         on players(team_id);
create index if not exists games_team_id           on games(team_id);
create index if not exists lineup_game_id          on lineup_assignments(game_id);
create index if not exists lineup_player_id        on lineup_assignments(player_id);
create index if not exists pitching_game_id        on pitching_log(game_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table teams             enable row level security;
alter table team_members      enable row level security;
alter table players           enable row level security;
alter table games             enable row level security;
alter table lineup_assignments enable row level security;
alter table pitching_log      enable row level security;

-- Helper: is the current user a member of this team?
create or replace function is_team_member(tid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from team_members
    where team_id = tid and user_id = auth.uid()
  )
$$;

-- ---------- teams ----------
create policy "Members can read their team"
  on teams for select
  using (is_team_member(id));

create policy "Authenticated users can look up teams"
  on teams for select
  using (auth.uid() is not null);

create policy "Authenticated users can create teams"
  on teams for insert
  with check (auth.uid() is not null);

create policy "Members can update their team"
  on teams for update
  using (is_team_member(id));

-- ---------- team_members ----------
create policy "Members can read team_members of their team"
  on team_members for select
  using (is_team_member(team_id));

create policy "Authenticated users can insert themselves"
  on team_members for insert
  with check (user_id = auth.uid());

create policy "Members can delete from their team"
  on team_members for delete
  using (is_team_member(team_id) and user_id = auth.uid());

-- ---------- players ----------
create policy "Team members can read players"
  on players for select
  using (is_team_member(team_id));

create policy "Team members can insert players"
  on players for insert
  with check (is_team_member(team_id));

create policy "Team members can update players"
  on players for update
  using (is_team_member(team_id));

create policy "Team members can delete players"
  on players for delete
  using (is_team_member(team_id));

-- ---------- games ----------
create policy "Team members can read games"
  on games for select
  using (is_team_member(team_id));

create policy "Team members can insert games"
  on games for insert
  with check (is_team_member(team_id));

create policy "Team members can update games"
  on games for update
  using (is_team_member(team_id));

create policy "Team members can delete games"
  on games for delete
  using (is_team_member(team_id));

-- ---------- lineup_assignments ----------
create policy "Team members can read lineup_assignments"
  on lineup_assignments for select
  using (
    exists (
      select 1 from games g
      where g.id = lineup_assignments.game_id
      and is_team_member(g.team_id)
    )
  );

create policy "Team members can insert lineup_assignments"
  on lineup_assignments for insert
  with check (
    exists (
      select 1 from games g
      where g.id = lineup_assignments.game_id
      and is_team_member(g.team_id)
    )
  );

create policy "Team members can update lineup_assignments"
  on lineup_assignments for update
  using (
    exists (
      select 1 from games g
      where g.id = lineup_assignments.game_id
      and is_team_member(g.team_id)
    )
  );

create policy "Team members can delete lineup_assignments"
  on lineup_assignments for delete
  using (
    exists (
      select 1 from games g
      where g.id = lineup_assignments.game_id
      and is_team_member(g.team_id)
    )
  );

-- ---------- pitching_log ----------
create policy "Team members can read pitching_log"
  on pitching_log for select
  using (
    exists (
      select 1 from games g
      where g.id = pitching_log.game_id
      and is_team_member(g.team_id)
    )
  );

create policy "Team members can insert pitching_log"
  on pitching_log for insert
  with check (
    exists (
      select 1 from games g
      where g.id = pitching_log.game_id
      and is_team_member(g.team_id)
    )
  );

create policy "Team members can update pitching_log"
  on pitching_log for update
  using (
    exists (
      select 1 from games g
      where g.id = pitching_log.game_id
      and is_team_member(g.team_id)
    )
  );

create policy "Team members can delete pitching_log"
  on pitching_log for delete
  using (
    exists (
      select 1 from games g
      where g.id = pitching_log.game_id
      and is_team_member(g.team_id)
    )
  );
