import type { StarterTemplateRepo } from "../repos/starterTemplateRepo.js";
import { StarterTemplateRepo as DefaultStarterTemplateRepo } from "../repos/starterTemplateRepo.js";
import { normalizeTemplateType, type FormTypeId } from "./registry.js";

type StarterTemplateData = {
  fieldDefsJson: unknown[];
  layoutJson: Record<string, unknown>;
  rulesJson: unknown[];
};

function ensureLayout(layoutJson: unknown, typeLabel: string): Record<string, unknown> {
  if (!layoutJson || typeof layoutJson !== "object" || Array.isArray(layoutJson)) {
    return { title: `${typeLabel} Form`, sections: [] };
  }
  const candidate = { ...(layoutJson as Record<string, unknown>) };
  if (typeof candidate.title !== "string" || !candidate.title.trim()) {
    candidate.title = `${typeLabel} Form`;
  }
  if (!Array.isArray(candidate.sections)) {
    candidate.sections = [];
  }
  return candidate;
}

function ensureArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

const FALLBACK_BY_TYPE: Record<FormTypeId, StarterTemplateData> = {
  PRODUCTION_ORDER_BATCH: {
    fieldDefsJson: [
      {
        key: "product_id",
        type: "string",
        label: "Product",
        headerRole: "ASSIGNMENT",
        semantic: "WRITABLE_ENTITY",
        readonly: false,
        required: true,
        lookup: {
          kind: "api",
          url: "/api/products?valid=true",
          valueField: "id",
          labelField: "name",
        },
      },
      {
        key: "batch_id",
        type: "string",
        label: "Batch",
        headerRole: "KEY",
        semantic: "WRITABLE_ENTITY",
        readonly: false,
        required: true,
        lookup: {
          kind: "api",
          url: "/api/batches?valid=true",
          valueField: "id",
          labelField: "code",
        },
      },
    ],
    layoutJson: {
      title: "Batch Production Form",
      sections: [{ title: "Main", rows: [{ cols: [{ field: "product_id" }, { field: "batch_id" }] }] }],
    },
    rulesJson: [],
  },
  PRODUCTION_ORDER_SERIAL: {
    fieldDefsJson: [
      {
        key: "product_id",
        type: "string",
        label: "Product",
        headerRole: "ASSIGNMENT",
        semantic: "WRITABLE_ENTITY",
        readonly: false,
        required: true,
        lookup: {
          kind: "api",
          url: "/api/products?valid=true",
          valueField: "id",
          labelField: "name",
        },
      },
      {
        key: "serial_no",
        type: "string",
        label: "Serial No",
        headerRole: "KEY",
        semantic: "WRITABLE_ENTITY",
        readonly: false,
        required: true,
        lookup: {
          kind: "api",
          url: "/api/serials?valid=true",
          valueField: "id",
          labelField: "code",
        },
      },
    ],
    layoutJson: {
      title: "Serial Production Form",
      sections: [{ title: "Main", rows: [{ cols: [{ field: "product_id" }, { field: "serial_no" }] }] }],
    },
    rulesJson: [],
  },
  CUSTOMER_ORDER: {
    fieldDefsJson: [
      {
        key: "customer_id",
        type: "string",
        label: "Customer",
        headerRole: "ASSIGNMENT",
        semantic: "WRITABLE_ENTITY",
        readonly: false,
        required: true,
        lookup: {
          kind: "api",
          url: "/api/customers?valid=true",
          valueField: "id",
          labelField: "name",
        },
      },
      {
        key: "customer_order_id",
        type: "string",
        label: "Order No",
        headerRole: "KEY",
        semantic: "WRITABLE_ENTITY",
        readonly: false,
        required: true,
        lookup: {
          kind: "api",
          url: "/api/customer-orders?valid=true",
          valueField: "id",
          labelField: "order_no",
        },
      },
    ],
    layoutJson: {
      title: "Customer Order Form",
      sections: [{ title: "Main", rows: [{ cols: [{ field: "customer_id" }, { field: "customer_order_id" }] }] }],
    },
    rulesJson: [],
  },
};

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
  repo: StarterTemplateRepo = new DefaultStarterTemplateRepo(),
) {
  const normalizedType = normalizeTemplateType(formTypeKey);
  let row: Awaited<ReturnType<StarterTemplateRepo["getByTemplateType"]>> | undefined;
  try {
    row = await repo.getByTemplateType(normalizedType);
  } catch {
    row = undefined;
  }

  if (!row) {
    return structuredClone(FALLBACK_BY_TYPE[normalizedType]);
  }

  return {
    fieldDefsJson: ensureArray(row.fieldDefsJson),
    layoutJson: ensureLayout(row.layoutJson, normalizedType),
    rulesJson: ensureArray(row.rulesJson),
  };
}
