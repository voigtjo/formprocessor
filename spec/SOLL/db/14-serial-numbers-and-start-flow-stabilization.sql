-- P0: serial_numbers + start-flow stabilization
-- Non-destructive and idempotent where possible.

-- Ensure template_type enum values exist.
do $$
begin
  begin
    alter type template_type add value 'BATCH_PRODUCTION_ORDER';
  exception when duplicate_object then null;
  end;

  begin
    alter type template_type add value 'SERIAL_PRODUCTION_ORDER';
  exception when duplicate_object then null;
  end;

  begin
    alter type template_type add value 'CUSTOMER_ORDER';
  exception when duplicate_object then null;
  end;
end
$$;

-- Normalize legacy production variants.
update form_templates
set template_type = 'BATCH_PRODUCTION_ORDER'
where template_type::text in ('ORDER', 'PRODUCTION_ORDER', 'PRODUCTION_ORDER_BATCH');

update form_templates
set template_type = 'SERIAL_PRODUCTION_ORDER'
where template_type::text in ('PRODUCTION_ORDER_SERIAL');

-- Header config defaults.
update form_templates
set assignment_field = 'product_id'
where template_type::text in ('BATCH_PRODUCTION_ORDER', 'SERIAL_PRODUCTION_ORDER')
  and assignment_field is null;

update form_templates
set key_field = 'batch_id'
where template_type::text = 'BATCH_PRODUCTION_ORDER'
  and key_field is null;

update form_templates
set key_field = 'serial_number_id'
where template_type::text = 'SERIAL_PRODUCTION_ORDER'
  and key_field is null;

update form_templates
set assignment_field = 'customer_id'
where template_type::text = 'CUSTOMER_ORDER'
  and assignment_field is null;

update form_templates
set key_field = 'customer_order_id'
where template_type::text = 'CUSTOMER_ORDER'
  and key_field is null;

-- New key table for serial-based production orders.
create table if not exists serial_numbers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  serial_no text not null,
  valid boolean not null default true,
  created_at timestamptz not null default now(),
  unique(product_id, serial_no)
);

create index if not exists idx_serial_numbers_product_valid_serial
  on serial_numbers(product_id, valid, serial_no);
