-- P0 customer order lookup tables (no migrations yet, run manually).

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  valid boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists customer_orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  order_no text not null,
  valid boolean not null default true,
  created_at timestamptz not null default now()
);

insert into customers (name, valid) values
  ('Acme Corp', true),
  ('Bluebird GmbH', true),
  ('Citrine AG', true),
  ('Dormant Customer', false)
on conflict do nothing;

-- Example order numbers (link via customer name for manual execution simplicity).
insert into customer_orders (customer_id, order_no, valid)
select c.id, v.order_no, v.valid
from customers c
join (
  values
    ('Acme Corp', 'CO-1001', true),
    ('Acme Corp', 'CO-1002', true),
    ('Bluebird GmbH', 'BB-2001', true),
    ('Bluebird GmbH', 'BB-OLD', false),
    ('Citrine AG', 'CT-3001', true)
) as v(customer_name, order_no, valid) on v.customer_name = c.name
on conflict do nothing;

