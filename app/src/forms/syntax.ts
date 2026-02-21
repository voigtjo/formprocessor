import { z } from "zod";

export const fieldTypeSchema = z.enum(["string", "number", "boolean", "date", "json"]);
export const fieldSemanticSchema = z.enum(["READONLY_EXTERNAL", "WRITABLE_ENTITY"]);

export const fieldDefSchema = z.object({
  key: z.string().min(1),
  type: fieldTypeSchema,
  label: z.string().min(1),
  semantic: fieldSemanticSchema,
  readonly: z.boolean(),
  required: z.boolean(),
  lookup: z
    .object({
      kind: z.literal("api"),
      url: z.string().min(1),
      valueField: z.string().min(1),
      labelField: z.string().min(1),
    })
    .optional(),
});

export const fieldDefsSchema = z
  .array(fieldDefSchema)
  .superRefine((items, ctx) => {
    const seen = new Set<string>();
    for (let i = 0; i < items.length; i += 1) {
      const key = items[i].key;
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [i, "key"],
          message: `Duplicate field key: ${key}`,
        });
      }
      seen.add(key);
    }
  });

const layoutColSchema = z.object({
  field: z.string().min(1),
});

const layoutRowSchema = z.object({
  cols: z.array(layoutColSchema),
});

const layoutSectionSchema = z.object({
  title: z.string().min(1),
  rows: z.array(layoutRowSchema),
});

export const layoutSchema = z.object({
  title: z.string().min(1),
  sections: z.array(layoutSectionSchema),
});

export type FieldDef = z.infer<typeof fieldDefSchema>;
export type LayoutJson = z.infer<typeof layoutSchema>;

export function validateTemplateJsonSyntax(input: {
  fieldDefsJson: unknown;
  layoutJson: unknown;
}) {
  const fieldDefsResult = fieldDefsSchema.safeParse(input.fieldDefsJson);
  if (!fieldDefsResult.success) {
    const err: any = new Error(`Invalid field_defs_json: ${fieldDefsResult.error.issues[0]?.message ?? "invalid"}`);
    err.statusCode = 400;
    throw err;
  }

  const layoutResult = layoutSchema.safeParse(input.layoutJson);
  if (!layoutResult.success) {
    const err: any = new Error(`Invalid layout_json: ${layoutResult.error.issues[0]?.message ?? "invalid"}`);
    err.statusCode = 400;
    throw err;
  }

  const fieldDefs = fieldDefsResult.data;
  const layout = layoutResult.data;
  const fieldKeys = new Set(fieldDefs.map((f) => f.key));

  for (const section of layout.sections) {
    for (const row of section.rows) {
      for (const col of row.cols) {
        if (!fieldKeys.has(col.field)) {
          const err: any = new Error(`layout_json references unknown field: ${col.field}`);
          err.statusCode = 400;
          throw err;
        }
      }
    }
  }

  return { fieldDefs, layout };
}
