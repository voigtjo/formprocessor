import { eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { starterTemplates } from "../db/schema.js";

export class StarterTemplateRepo {
  async getByTemplateType(templateType: string) {
    const rows = await db
      .select({
        id: starterTemplates.id,
        templateType: starterTemplates.templateType,
        name: starterTemplates.name,
        description: starterTemplates.description,
        fieldDefsJson: starterTemplates.fieldDefsJson,
        layoutJson: starterTemplates.layoutJson,
        rulesJson: starterTemplates.rulesJson,
        createdAt: starterTemplates.createdAt,
      })
      .from(starterTemplates)
      .where(eq(starterTemplates.templateType, templateType))
      .limit(1);
    return rows[0];
  }
}
