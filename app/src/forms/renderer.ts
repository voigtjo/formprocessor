import type { FieldDef, LayoutJson } from "./syntax.js";
import { ProductsRepo } from "../repos/productsRepo.js";

function esc(value: unknown) {
  const text = String(value ?? "");
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

type LookupOption = { value: string; label: string };
export type LookupOptionsProvider = (args: {
  field: FieldDef;
  values: Record<string, unknown>;
}) => Promise<LookupOption[]>;

const productsRepo = new ProductsRepo();

async function defaultLookupOptionsProvider(args: {
  field: FieldDef;
  values: Record<string, unknown>;
}): Promise<LookupOption[]> {
  const lookup = args.field.lookup;
  if (!lookup || lookup.kind !== "api") return [];

  if (lookup.url.includes("/api/products")) {
    const validOnly = lookup.url.includes("valid=true");
    const rows = await productsRepo.listProducts({ valid: validOnly });
    return rows.map((r: any) => ({
      value: String(r[lookup.valueField] ?? r.id ?? ""),
      label: String(r[lookup.labelField] ?? r.name ?? ""),
    }));
  }

  if (lookup.url.includes("/api/batches")) {
    const productId = (args.values.product_id as string | undefined) ?? (args.values.assignment_product_id as string | undefined);
    if (!productId) return [];
    const validOnly = lookup.url.includes("valid=true");
    const rows = await productsRepo.listBatches({ productId, valid: validOnly });
    return rows.map((r: any) => ({
      value: String(r[lookup.valueField] ?? r.id ?? ""),
      label: String(r[lookup.labelField] ?? r.code ?? ""),
    }));
  }

  if (lookup.url.includes("/api/serial-numbers")) {
    const productId =
      (args.values.product_id as string | undefined) ??
      (args.values.assignment_product_id as string | undefined) ??
      ((args.values._header as any)?.assignment?.id as string | undefined);
    if (!productId) return [];
    const validOnly = lookup.url.includes("valid=true");
    const rows = await productsRepo.listSerialNumbers({ productId, valid: validOnly });
    return rows.map((r: any) => ({
      value: String(r[lookup.valueField] ?? r.id ?? ""),
      label: String(r[lookup.labelField] ?? r.serial_no ?? r.code ?? r.serialNo ?? ""),
    }));
  }

  if (lookup.url.includes("/api/customers")) {
    const validOnly = lookup.url.includes("valid=true");
    const rows = await productsRepo.listCustomers({ valid: validOnly });
    return rows.map((r: any) => ({
      value: String(r[lookup.valueField] ?? r.id ?? ""),
      label: String(r[lookup.labelField] ?? r.name ?? ""),
    }));
  }

  if (lookup.url.includes("/api/customer-orders")) {
    const customerId = (args.values.customer_id as string | undefined)
      ?? ((args.values._header as any)?.assignment?.id as string | undefined);
    if (!customerId) return [];
    const validOnly = lookup.url.includes("valid=true");
    const rows = await productsRepo.listCustomerOrders({ customerId, valid: validOnly });
    return rows.map((r: any) => ({
      value: String(r[lookup.valueField] ?? r.id ?? ""),
      label: String(r[lookup.labelField] ?? r.order_no ?? r.orderNo ?? ""),
    }));
  }

  return [];
}

async function renderInput(args: {
  field: FieldDef;
  value: unknown;
  disabled: boolean;
  values: Record<string, unknown>;
  lookupOptionsProvider: LookupOptionsProvider;
}) {
  const disabledAttr = args.disabled ? " disabled" : "";
  const baseInputClass = `mt-1 block w-full rounded-md border px-3 py-2 text-sm ${
    args.disabled ? "bg-slate-100 text-slate-600" : "bg-white"
  }`;

  if (args.field.type === "boolean") {
    const checked = Boolean(args.value) ? " checked" : "";
    return `<input type="checkbox" name="${esc(args.field.key)}"${checked}${disabledAttr} class="mt-2 h-4 w-4 rounded border-slate-300 text-sky-600" />`;
  }

  if (args.field.type === "json") {
    const raw = typeof args.value === "string" ? args.value : JSON.stringify(args.value ?? {}, null, 2);
    return `<textarea name="${esc(args.field.key)}" rows="6" class="${baseInputClass} font-mono"${disabledAttr}>${esc(raw)}</textarea>`;
  }

  if (args.field.lookup) {
    const options = await args.lookupOptionsProvider({ field: args.field, values: args.values });
    const selectedValue = args.value == null ? "" : String(args.value);
    const requiredEmptyOption = args.field.required
      ? `<option value="" disabled${selectedValue ? "" : " selected"}>Select...</option>`
      : `<option value="">Select...</option>`;
    const optionHtml = options
      .map((o) => {
        const selected = o.value === selectedValue ? " selected" : "";
        return `<option value="${esc(o.value)}"${selected}>${esc(o.label)}</option>`;
      })
      .join("");

    return `<select name="${esc(args.field.key)}" class="${baseInputClass}"${disabledAttr}>${requiredEmptyOption}${optionHtml}</select>`;
  }

  const htmlType =
    args.field.type === "number" ? "number" : args.field.type === "date" ? "date" : "text";
  const value = args.value == null ? "" : String(args.value);
  return `<input type="${htmlType}" name="${esc(args.field.key)}" value="${esc(value)}" class="${baseInputClass}"${disabledAttr} />`;
}

export async function renderForm(
  layoutJson: LayoutJson,
  fieldDefsJson: FieldDef[],
  values: Record<string, unknown>,
  readonlyMode: boolean,
  lookupOptionsProvider: LookupOptionsProvider = defaultLookupOptionsProvider,
) {
  const fieldByKey = new Map(fieldDefsJson.map((f) => [f.key, f]));
  const sectionParts: string[] = [];
  for (const section of layoutJson.sections) {
    const rowParts: string[] = [];
    for (const row of section.rows) {
      const colParts: string[] = [];
      for (const col of row.cols) {
        const field = fieldByKey.get(col.field);
        if (!field) {
          colParts.push(`
            <div class="col-span-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              Missing field definition for <code>${esc(col.field)}</code>
            </div>
          `);
          continue;
        }

        const value = values[field.key];
        const disabled = readonlyMode || field.readonly || field.semantic === "READONLY_EXTERNAL";
        const label = `${esc(field.label)}${field.required ? " *" : ""}`;
        const inputHtml = await renderInput({ field, value, disabled, values, lookupOptionsProvider });
        colParts.push(`
          <div class="col-span-1">
            <label class="block text-sm font-medium text-slate-700">${label}</label>
            ${inputHtml}
          </div>
        `);
      }

      if (colParts.length) {
        rowParts.push(`<div class="grid grid-cols-1 gap-4 md:grid-cols-2">${colParts.join("")}</div>`);
      }
    }

    if (rowParts.length) {
      sectionParts.push(`
        <fieldset class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <legend class="px-1 text-sm font-semibold text-slate-800">${esc(section.title)}</legend>
          <div class="space-y-4">${rowParts.join("")}</div>
        </fieldset>
      `);
    }
  }

  const sectionsHtml = sectionParts.join("");

  return `
    <div class="space-y-4">
      <h2 class="text-lg font-semibold text-slate-900">${esc(layoutJson.title)}</h2>
      ${sectionsHtml || '<p class="text-sm text-slate-500">No fields configured.</p>'}
    </div>
  `;
}
