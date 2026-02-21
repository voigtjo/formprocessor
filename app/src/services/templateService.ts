import { TemplateRepo } from "../repos/templateRepo.js";
import { validateTemplateJsonSyntax } from "../forms/syntax.js";
import { resolveFormTypeConfig, type FormTypeId } from "../formTypes/registry.js";
import { deriveHeaderConfigFromFieldDefs, getStarterTemplate } from "../formTypes/starterTemplates.js";

export type CreateTemplateArgs = {
  key: string;
  name: string;
  templateType: FormTypeId;
  description?: string;
  currentUserId: string;
};

export type SaveLatestTestJsonArgs = {
  templateId: string;
  fieldDefsJson: unknown;
  layoutJson: unknown;
  rulesJson: unknown;
};

export class TemplateService {
  constructor(private readonly repo = new TemplateRepo()) {}

  async getDefaultGroupId() {
    return this.repo.getDefaultGroupId();
  }

  async listTemplatesForUserDefaultGroup() {
    const defaultGroupId = await this.repo.getDefaultGroupId();
    const templates = await this.repo.listTemplatesForGroup(defaultGroupId);
    const withVersions = await Promise.all(
      templates.map(async (template: any) => {
        const activeTest = await this.repo.getActiveVersionByChannel(template.id, "TEST");
        const activeProd = await this.repo.getActiveVersionByChannel(template.id, "PROD");
        return {
          ...template,
          activeTestVersion: activeTest
            ? { major: activeTest.major, minor: activeTest.minor, patch: activeTest.patch }
            : null,
          activeProdVersion: activeProd
            ? { major: activeProd.major, minor: activeProd.minor, patch: activeProd.patch }
            : null,
        };
      }),
    );
    return withVersions;
  }

  async createTemplate(args: CreateTemplateArgs) {
    const defaultGroupId = await this.repo.getDefaultGroupId();
    const starter = await getStarterTemplate(args.templateType);
    const configFromStarter = deriveHeaderConfigFromFieldDefs(starter.fieldDefsJson);
    const fallbackConfig = resolveFormTypeConfig({ templateType: args.templateType });
    return this.repo.createTemplate({
      groupId: defaultGroupId,
      userId: args.currentUserId,
      key: args.key,
      name: args.name,
      templateType: args.templateType,
      assignmentField: configFromStarter.assignmentField ?? fallbackConfig.assignment.field,
      keyField: configFromStarter.keyField ?? fallbackConfig.key.field,
      description: args.description,
      initialFieldDefsJson: starter.fieldDefsJson,
      initialLayoutJson: starter.layoutJson,
      initialRulesJson: starter.rulesJson,
    });
  }

  async updateTemplateHeaderConfig(args: {
    templateId: string;
    assignmentField: string;
    keyField: string;
  }) {
    const template = await this.repo.getTemplateById(args.templateId);
    if (!template) {
      const err: any = new Error("Template not found");
      err.statusCode = 404;
      throw err;
    }

    const versions = await this.repo.listVersionsForTemplate(args.templateId);
    const latestTest = versions.find((v) => v.channel === "TEST");
    const starter = await getStarterTemplate(template.templateType);
    const fieldDefs = Array.isArray(latestTest?.fieldDefsJson) && latestTest.fieldDefsJson.length
      ? latestTest.fieldDefsJson
      : starter.fieldDefsJson;
    const keys = new Set(
      (Array.isArray(fieldDefs) ? fieldDefs : [])
        .map((f: any) => (typeof f?.key === "string" ? f.key : null))
        .filter(Boolean) as string[],
    );
    if (!keys.has(args.assignmentField) || !keys.has(args.keyField)) {
      const err: any = new Error("Header fields must exist in field_defs_json");
      err.statusCode = 400;
      throw err;
    }

    await this.repo.updateTemplateHeaderConfig(args.templateId, args.assignmentField, args.keyField);
  }

  async getTemplateDetail(templateId: string) {
    const template = await this.repo.getTemplateById(templateId);
    if (!template) {
      const err: any = new Error("Template not found");
      err.statusCode = 404;
      throw err;
    }

    const versions = await this.repo.listVersionsForTemplate(templateId);
    return { template, versions };
  }

  async saveLatestTestJson(args: SaveLatestTestJsonArgs) {
    const template = await this.repo.getTemplateById(args.templateId);
    if (!template) {
      const err: any = new Error("Template not found");
      err.statusCode = 404;
      throw err;
    }

    validateTemplateJsonSyntax({
      fieldDefsJson: args.fieldDefsJson,
      layoutJson: args.layoutJson,
    });

    const latestTest = await this.repo.getLatestVersionByChannel(args.templateId, "TEST");
    if (latestTest) {
      await this.repo.updateVersionJson(latestTest.id, {
        fieldDefsJson: args.fieldDefsJson,
        layoutJson: args.layoutJson,
        rulesJson: args.rulesJson,
      });
      return;
    }

    await this.repo.createTestVersion101({
      templateId: args.templateId,
      fieldDefsJson: args.fieldDefsJson,
      layoutJson: args.layoutJson,
      rulesJson: args.rulesJson,
    });
  }

  async publishTest(templateId: string, currentUserId: string) {
    const template = await this.repo.getTemplateById(templateId);
    if (!template) {
      const err: any = new Error("Template not found");
      err.statusCode = 404;
      throw err;
    }

    await this.repo.activateLatestTest(templateId, currentUserId);
  }

  async publishProd(templateId: string, currentUserId: string) {
    const template = await this.repo.getTemplateById(templateId);
    if (!template) {
      const err: any = new Error("Template not found");
      err.statusCode = 404;
      throw err;
    }

    await this.repo.publishProdFromLatestTest(templateId, currentUserId);
  }
}
