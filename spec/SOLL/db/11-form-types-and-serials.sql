-- P0: FormType registry extension + serials lookup table

-- Extend template_type enum for new production variants.
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
end $$;

-- Create serials table.
create table if not exists serials (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  serial_no text not null,
  valid boolean not null default true,
  created_at timestamptz not null default now(),
  unique(product_id, serial_no)
);

create index if not exists idx_serials_product_valid
  on serials(product_id, valid, serial_no);
