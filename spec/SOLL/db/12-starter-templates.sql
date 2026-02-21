-- P0: DB-based starter templates for form types

create table if not exists starter_templates (
  id uuid primary key default gen_random_uuid(),
  template_type text not null,
  name text not null,
  description text,
  field_defs_json jsonb not null,
  layout_json jsonb not null,
  rules_json jsonb not null,
  created_at timestamptz not null default now()
);

-- Optional enum alignment for template_type values in form_templates
do $$
begin
  begin
    alter type template_type add value 'PRODUCTION_ORDER_BATCH';
  exception when duplicate_object then null;
  end;
  begin
    alter type template_type add value 'PRODUCTION_ORDER_SERIAL';
  exception when duplicate_object then null;
  end;
end $$;

insert into starter_templates (template_type, name, description, field_defs_json, layout_json, rules_json)
values
(
  'PRODUCTION_ORDER_BATCH',
  'PRODUCTION_ORDER_BATCH',
  'Starter template for product + batch forms.',
  '[
    {"key":"product_id","type":"string","label":"Product","headerRole":"ASSIGNMENT","semantic":"WRITABLE_ENTITY","readonly":false,"required":true,"lookup":{"kind":"api","url":"/api/products?valid=true","valueField":"id","labelField":"name"}},
    {"key":"batch_id","type":"string","label":"Batch","headerRole":"KEY","semantic":"WRITABLE_ENTITY","readonly":false,"required":true,"lookup":{"kind":"api","url":"/api/batches?valid=true","valueField":"id","labelField":"code"}}
  ]'::jsonb,
  '{"title":"Batch Production Form","sections":[{"title":"Main","rows":[{"cols":[{"field":"product_id"},{"field":"batch_id"}]}]}]}'::jsonb,
  '[]'::jsonb
),
(
  'PRODUCTION_ORDER_SERIAL',
  'PRODUCTION_ORDER_SERIAL',
  'Starter template for product + serial forms.',
  '[
    {"key":"product_id","type":"string","label":"Product","headerRole":"ASSIGNMENT","semantic":"WRITABLE_ENTITY","readonly":false,"required":true,"lookup":{"kind":"api","url":"/api/products?valid=true","valueField":"id","labelField":"name"}},
    {"key":"serial_no","type":"string","label":"Serial No","headerRole":"KEY","semantic":"WRITABLE_ENTITY","readonly":false,"required":true,"lookup":{"kind":"api","url":"/api/serials?valid=true","valueField":"id","labelField":"code"}}
  ]'::jsonb,
  '{"title":"Serial Production Form","sections":[{"title":"Main","rows":[{"cols":[{"field":"product_id"},{"field":"serial_no"}]}]}]}'::jsonb,
  '[]'::jsonb
),
(
  'CUSTOMER_ORDER',
  'CUSTOMER_ORDER',
  'Starter template for customer + order forms.',
  '[
    {"key":"customer_id","type":"string","label":"Customer","headerRole":"ASSIGNMENT","semantic":"WRITABLE_ENTITY","readonly":false,"required":true,"lookup":{"kind":"api","url":"/api/customers?valid=true","valueField":"id","labelField":"name"}},
    {"key":"customer_order_id","type":"string","label":"Order No","headerRole":"KEY","semantic":"WRITABLE_ENTITY","readonly":false,"required":true,"lookup":{"kind":"api","url":"/api/customer-orders?valid=true","valueField":"id","labelField":"order_no"}}
  ]'::jsonb,
  '{"title":"Customer Order Form","sections":[{"title":"Main","rows":[{"cols":[{"field":"customer_id"},{"field":"customer_order_id"}]}]}]}'::jsonb,
  '[]'::jsonb
)
on conflict do nothing;
