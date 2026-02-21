-- P0 Products lookup table (no migrations yet, run manually).
create extension if not exists pgcrypto;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  valid boolean not null default true,
  created_at timestamptz not null default now()
);

-- Example seed set (12 items, mixed valid flags).
insert into products (name, valid) values
  ('Alpha Basic', true),
  ('Beta Plus', true),
  ('Gamma Core', true),
  ('Delta Kit', false),
  ('Epsilon Prime', true),
  ('Foxtrot Standard', true),
  ('Helios Legacy', false),
  ('Ion Max', true),
  ('Juno Starter', true),
  ('Kappa Lab', false),
  ('Lumen One', true),
  ('Nova Flex', true)
on conflict do nothing;
