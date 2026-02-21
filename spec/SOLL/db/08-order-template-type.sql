-- P0 Order template support (no migrations yet, run manually).

do $$
begin
  create type template_type as enum ('GENERIC', 'PRODUCTION_ORDER', 'CUSTOMER_ORDER');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter type template_type add value 'PRODUCTION_ORDER';
exception
  when duplicate_object then null;
end
$$;

alter table form_templates
  add column if not exists template_type template_type not null default 'GENERIC';

alter table form_templates
  add column if not exists assignment_field text,
  add column if not exists key_field text;

update form_templates
set assignment_field = coalesce(assignment_field, 'product_id'),
    key_field = coalesce(key_field, 'batch_id')
where template_type = 'PRODUCTION_ORDER';
