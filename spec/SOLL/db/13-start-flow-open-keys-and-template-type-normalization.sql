-- P0 (legacy-safe): open-key lookup optimization and conservative template_type compatibility.
-- IMPORTANT: This file must stay non-destructive. Do NOT collapse BATCH/SERIAL into PRODUCTION_ORDER.

-- Ensure enum values used by legacy deployments are present.
do $$
begin
  begin
    alter type template_type add value 'PRODUCTION_ORDER';
  exception when duplicate_object then null;
  end;

  begin
    alter type template_type add value 'CUSTOMER_ORDER';
  exception when duplicate_object then null;
  end;
end
$$;

-- Backfill header defaults where missing, without rewriting template_type semantics.
update form_templates
set assignment_field = 'product_id'
where template_type::text in (
  'PRODUCTION_ORDER',
  'ORDER',
  'BATCH_PRODUCTION_ORDER',
  'SERIAL_PRODUCTION_ORDER',
  'PRODUCTION_ORDER_BATCH',
  'PRODUCTION_ORDER_SERIAL'
)
  and assignment_field is null;

update form_templates
set key_field = 'batch_id'
where template_type::text in ('PRODUCTION_ORDER', 'ORDER', 'BATCH_PRODUCTION_ORDER', 'PRODUCTION_ORDER_BATCH')
  and key_field is null;

update form_templates
set key_field = 'serial_number_id'
where template_type::text in ('SERIAL_PRODUCTION_ORDER', 'PRODUCTION_ORDER_SERIAL')
  and key_field is null;

update form_templates
set assignment_field = 'customer_id'
where template_type::text = 'CUSTOMER_ORDER'
  and assignment_field is null;

update form_templates
set key_field = 'customer_order_id'
where template_type::text = 'CUSTOMER_ORDER'
  and key_field is null;

-- Open-key lookup indexes (valid=true means open).
create index if not exists idx_batches_open_lookup
  on batches(valid, product_id, code);

create index if not exists idx_serials_open_lookup
  on serials(valid, product_id, serial_no);

create index if not exists idx_customer_orders_open_lookup
  on customer_orders(valid, customer_id, order_no);
