import { TemplateRepo } from "../repos/templateRepo.js";
import { validateTemplateJsonSyntax } from "../forms/syntax.js";

export type CreateTemplateArgs = {
  key: string;
  name: string;
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
    return this.repo.listTemplatesForGroup(defaultGroupId);
  }

  async createTemplate(args: CreateTemplateArgs) {
    const defaultGroupId = await this.repo.getDefaultGroupId();
    return this.repo.createTemplate({
      groupId: defaultGroupId,
      userId: args.currentUserId,
      key: args.key,
      name: args.name,
      description: args.description,
    });
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
