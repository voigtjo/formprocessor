-- Rename existing ORDER data to PRODUCTION_ORDER.
-- Run manually (no migration framework in P0).

do $$
begin
  alter type template_type add value 'PRODUCTION_ORDER';
exception
  when duplicate_object then null;
end
$$;

update form_templates
set template_type = 'PRODUCTION_ORDER'
where template_type::text = 'ORDER';

