export const FORM_TYPES = [
  "BATCH_PRODUCTION_ORDER",
  "SERIAL_PRODUCTION_ORDER",
  "CUSTOMER_ORDER",
] as const;

export type FormTypeId = (typeof FORM_TYPES)[number];

export type AssignmentKind = "product" | "customer";
export type KeyKind = "batch" | "serial" | "customer_order";

export type FieldConfig = {
  field: string;
  label: string;
};

export type FormTypeConfig = {
  id: FormTypeId;
  label: string;
  assignment: FieldConfig & {
    kind: AssignmentKind;
    lookupUrl: "/api/products?valid=true" | "/api/customers?valid=true";
  };
  key: FieldConfig & {
    kind: KeyKind;
    lookupUrl: "/api/batches?valid=true" | "/api/serial-numbers?valid=true" | "/api/customer-orders?valid=true";
    dependsOnAssignment: boolean;
  };
  autoLoadKeyOptions: boolean;
};

const KEY_BY_FIELD: Record<string, Omit<FormTypeConfig["key"], "dependsOnAssignment">> = {
  batch_id: {
    field: "batch_id",
    kind: "batch",
    label: "Batch",
    lookupUrl: "/api/batches?valid=true",
  },
  serial_id: {
    field: "serial_id",
    kind: "serial",
    label: "Serial No",
    lookupUrl: "/api/serial-numbers?valid=true",
  },
  serial_no: {
    field: "serial_no",
    kind: "serial",
    label: "Serial No",
    lookupUrl: "/api/serial-numbers?valid=true",
  },
  serial_number_id: {
    field: "serial_number_id",
    kind: "serial",
    label: "Serial No",
    lookupUrl: "/api/serial-numbers?valid=true",
  },
  customer_order_id: {
    field: "customer_order_id",
    kind: "customer_order",
    label: "Order No",
    lookupUrl: "/api/customer-orders?valid=true",
  },
};

const ASSIGNMENT_BY_FIELD: Record<string, FormTypeConfig["assignment"]> = {
  product_id: {
    field: "product_id",
    kind: "product",
    label: "Product",
    lookupUrl: "/api/products?valid=true",
  },
  customer_id: {
    field: "customer_id",
    kind: "customer",
    label: "Customer",
    lookupUrl: "/api/customers?valid=true",
  },
};

export const FORM_TYPE_REGISTRY: Record<FormTypeId, FormTypeConfig> = {
  BATCH_PRODUCTION_ORDER: {
    id: "BATCH_PRODUCTION_ORDER",
    label: "Batch Production Order",
    assignment: ASSIGNMENT_BY_FIELD.product_id,
    key: {
      ...KEY_BY_FIELD.batch_id,
      dependsOnAssignment: true,
    },
    autoLoadKeyOptions: true,
  },
  SERIAL_PRODUCTION_ORDER: {
    id: "SERIAL_PRODUCTION_ORDER",
    label: "Serial Production Order",
    assignment: ASSIGNMENT_BY_FIELD.product_id,
    key: {
      ...KEY_BY_FIELD.serial_number_id,
      dependsOnAssignment: true,
    },
    autoLoadKeyOptions: true,
  },
  CUSTOMER_ORDER: {
    id: "CUSTOMER_ORDER",
    label: "Customer Order",
    assignment: ASSIGNMENT_BY_FIELD.customer_id,
    key: {
      ...KEY_BY_FIELD.customer_order_id,
      dependsOnAssignment: true,
    },
    autoLoadKeyOptions: true,
  },
};

export type TemplateTypeLike =
  | FormTypeId
  | "BATCH_PRODUCTION_ORDER"
  | "SERIAL_PRODUCTION_ORDER"
  | "PRODUCTION_ORDER_BATCH"
  | "PRODUCTION_ORDER_SERIAL"
  | "PRODUCTION_ORDER"
  | "ORDER"
  | "GENERIC"
  | string
  | null
  | undefined;

export function normalizeTemplateType(value: TemplateTypeLike): FormTypeId {
  if (value === "CUSTOMER_ORDER") {
    return "CUSTOMER_ORDER";
  }
  if (value === "SERIAL_PRODUCTION_ORDER" || value === "PRODUCTION_ORDER_SERIAL") {
    return "SERIAL_PRODUCTION_ORDER";
  }
  return "BATCH_PRODUCTION_ORDER";
}

export function resolveFormTypeConfig(args: {
  templateType: TemplateTypeLike;
  assignmentField?: string | null;
  keyField?: string | null;
}) {
  const id = normalizeTemplateType(args.templateType);
  const base = FORM_TYPE_REGISTRY[id];

  const assignment = ASSIGNMENT_BY_FIELD[args.assignmentField ?? ""] ?? base.assignment;
  const key = KEY_BY_FIELD[args.keyField ?? ""]
    ? { ...KEY_BY_FIELD[args.keyField ?? ""], dependsOnAssignment: true }
    : base.key;

  const effectiveId: FormTypeId =
    assignment.field === "customer_id"
      ? "CUSTOMER_ORDER"
      : key.field === "serial_id" || key.field === "serial_no" || key.field === "serial_number_id"
        ? "SERIAL_PRODUCTION_ORDER"
        : "BATCH_PRODUCTION_ORDER";

  return {
    ...FORM_TYPE_REGISTRY[effectiveId],
    id: effectiveId,
    assignment,
    key,
    autoLoadKeyOptions: true,
  } satisfies FormTypeConfig;
}

export function formTypeLabel(type: TemplateTypeLike) {
  return FORM_TYPE_REGISTRY[normalizeTemplateType(type)].label;
}
