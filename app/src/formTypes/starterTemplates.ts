import { normalizeTemplateType, type FormTypeId } from "./registry.js";

type StarterTemplateData = {
  fieldDefsJson: unknown[];
  layoutJson: Record<string, unknown>;
  rulesJson: unknown[];
};

type StarterTemplateOptions = {
  assignmentField?: string | null;
  keyField?: string | null;
};

const ASSIGNMENT_FIELD_META: Record<string, { label: string; lookupUrl: string; labelField: string }> = {
  product_id: { label: "Product", lookupUrl: "/api/products?valid=true", labelField: "name" },
  customer_id: { label: "Customer", lookupUrl: "/api/customers?valid=true", labelField: "name" },
};

const KEY_FIELD_META: Record<string, { label: string; lookupUrl: string; labelField: string }> = {
  batch_id: { label: "Batch", lookupUrl: "/api/batches?valid=true&product_id={product_id}", labelField: "code" },
  serial_number_id: { label: "Serial No", lookupUrl: "/api/serial-numbers?valid=true&product_id={product_id}", labelField: "serial_no" },
  serial_id: { label: "Serial No", lookupUrl: "/api/serial-numbers?valid=true&product_id={product_id}", labelField: "serial_no" },
  serial_no: { label: "Serial No", lookupUrl: "/api/serial-numbers?valid=true&product_id={product_id}", labelField: "serial_no" },
  customer_order_id: { label: "Order No", lookupUrl: "/api/customer-orders?valid=true&customer_id={customer_id}", labelField: "order_no" },
};

function defaultsForType(type: FormTypeId) {
  if (type === "CUSTOMER_ORDER") {
    return { assignmentField: "customer_id", keyField: "customer_order_id", title: "Customer Order Form" };
  }
  if (type === "SERIAL_PRODUCTION_ORDER") {
    return { assignmentField: "product_id", keyField: "serial_number_id", title: "Serial Production Form" };
  }
  return { assignmentField: "product_id", keyField: "batch_id", title: "Batch Production Form" };
}

function resolveFields(type: FormTypeId, options?: StarterTemplateOptions) {
  const defaults = defaultsForType(type);
  const assignmentField = options?.assignmentField && ASSIGNMENT_FIELD_META[options.assignmentField]
    ? options.assignmentField
    : defaults.assignmentField;
  const keyField = options?.keyField && KEY_FIELD_META[options.keyField]
    ? options.keyField
    : defaults.keyField;
  return { assignmentField, keyField, title: defaults.title };
}

export function deriveHeaderConfigFromFieldDefs(fieldDefs: unknown[]) {
  const typed = Array.isArray(fieldDefs) ? (fieldDefs as Array<Record<string, unknown>>) : [];
  const assignment = typed.find((f) => f.headerRole === "ASSIGNMENT")?.key;
  const key = typed.find((f) => f.headerRole === "KEY")?.key;
  return {
    assignmentField: typeof assignment === "string" ? assignment : null,
    keyField: typeof key === "string" ? key : null,
  };
}

export async function getStarterTemplate(
  formTypeKey: string,
  options?: StarterTemplateOptions,
): Promise<StarterTemplateData> {
  const normalizedType = normalizeTemplateType(formTypeKey);
  const resolved = resolveFields(normalizedType, options);
  const assignmentMeta = ASSIGNMENT_FIELD_META[resolved.assignmentField] ?? ASSIGNMENT_FIELD_META.product_id;
  const keyMeta = KEY_FIELD_META[resolved.keyField] ?? KEY_FIELD_META.batch_id;

  return {
    fieldDefsJson: [
      {
        key: resolved.assignmentField,
        type: "string",
        label: assignmentMeta.label,
        headerRole: "ASSIGNMENT",
        semantic: "WRITABLE_ENTITY",
        readonly: false,
        required: true,
        lookup: {
          kind: "api",
          url: assignmentMeta.lookupUrl,
          valueField: "id",
          labelField: assignmentMeta.labelField,
        },
      },
      {
        key: resolved.keyField,
        type: "string",
        label: keyMeta.label,
        headerRole: "KEY",
        semantic: "WRITABLE_ENTITY",
        readonly: false,
        required: true,
        lookup: {
          kind: "api",
          url: keyMeta.lookupUrl,
          valueField: "id",
          labelField: keyMeta.labelField,
        },
      },
    ],
    layoutJson: {
      title: resolved.title,
      sections: [{ title: "Header", rows: [{ cols: [{ field: resolved.assignmentField }, { field: resolved.keyField }] }] }],
    },
    rulesJson: [],
  };
}
