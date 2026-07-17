import { routes, type AppRoute } from "./routes";

export type Permission = `${string}:${string}`;

export interface NavigationContribution {
  readonly label: string;
  readonly sectionId: string;
  readonly order: number;
  /** Keep this configurable before large editors or previewers are linked. */
  readonly prefetch?: boolean;
}

export interface FrontendModuleV1 {
  readonly apiVersion: 1;
  readonly id: string;
  /** A Pages Router pattern. The registry describes routes; it does not create them. */
  readonly route: AppRoute;
  readonly title: string;
  readonly subtitle: string;
  readonly navigation?: NavigationContribution;
  readonly requiredPermissions?: readonly Permission[];
}

export interface NavigationSectionDefinition {
  readonly id: string;
  readonly label?: string;
  readonly order: number;
}

export interface NavigationItem {
  readonly moduleId: string;
  readonly label: string;
  readonly href: AppRoute;
  readonly order: number;
  readonly prefetch: boolean;
}

export interface NavigationSection {
  readonly id: string;
  readonly label?: string;
  readonly order: number;
  readonly items: readonly NavigationItem[];
}

export interface ModuleRegistry {
  readonly modules: readonly FrontendModuleV1[];
  get(moduleId: string): FrontendModuleV1;
  find(moduleId: string): FrontendModuleV1 | undefined;
  findByRoute(route: AppRoute): FrontendModuleV1 | undefined;
  getNavigation(): readonly NavigationSection[];
}

export function defineModules<const T extends readonly FrontendModuleV1[]>(
  modules: T,
): T {
  return modules;
}

export function createModuleRegistry(
  modules: readonly FrontendModuleV1[],
  sections: readonly NavigationSectionDefinition[],
): ModuleRegistry {
  const byId = new Map<string, FrontendModuleV1>();
  const byRoute = new Map<AppRoute, FrontendModuleV1>();
  const sectionsById = new Map<string, NavigationSectionDefinition>();

  for (const section of sections) {
    if (sectionsById.has(section.id)) {
      throw new Error(`Duplicate navigation section id: ${section.id}`);
    }
    sectionsById.set(section.id, section);
  }

  for (const moduleDefinition of modules) {
    if (moduleDefinition.apiVersion !== 1) {
      throw new Error(`Unsupported module apiVersion for ${moduleDefinition.id}.`);
    }
    if (byId.has(moduleDefinition.id)) {
      throw new Error(`Duplicate module id: ${moduleDefinition.id}`);
    }
    if (byRoute.has(moduleDefinition.route)) {
      throw new Error(`Duplicate module route: ${moduleDefinition.route}`);
    }
    if (
      moduleDefinition.navigation &&
      !sectionsById.has(moduleDefinition.navigation.sectionId)
    ) {
      throw new Error(
        `Unknown navigation section ${moduleDefinition.navigation.sectionId} for ${moduleDefinition.id}.`,
      );
    }
    byId.set(moduleDefinition.id, moduleDefinition);
    byRoute.set(moduleDefinition.route, moduleDefinition);
  }

  const navigation = sections
    .map<NavigationSection>((section) => ({
      ...section,
      items: modules
        .filter((moduleDefinition) => moduleDefinition.navigation?.sectionId === section.id)
        .map((moduleDefinition) => ({
          moduleId: moduleDefinition.id,
          label: moduleDefinition.navigation!.label,
          href: moduleDefinition.route,
          order: moduleDefinition.navigation!.order,
          prefetch: moduleDefinition.navigation!.prefetch ?? true,
        }))
        .sort((left, right) => left.order - right.order),
    }))
    .filter((section) => section.items.length > 0)
    .sort((left, right) => left.order - right.order);

  const frozenModules = Object.freeze([...modules]);
  const frozenNavigation = Object.freeze(
    navigation.map((section) =>
      Object.freeze({ ...section, items: Object.freeze([...section.items]) }),
    ),
  );

  return Object.freeze({
    modules: frozenModules,
    get(moduleId: string) {
      const moduleDefinition = byId.get(moduleId);
      if (!moduleDefinition) {
        throw new Error(`Unknown module id: ${moduleId}`);
      }
      return moduleDefinition;
    },
    find(moduleId: string) {
      return byId.get(moduleId);
    },
    findByRoute(route: AppRoute) {
      return byRoute.get(route);
    },
    getNavigation() {
      return frozenNavigation;
    },
  });
}

const navigationSections = [
  { id: "workspace", order: 0 },
  { id: "governance", label: "文件分类入库", order: 10 },
  { id: "contract-review", label: "合同审查", order: 15 },
  { id: "knowledge", order: 20 },
] as const satisfies readonly NavigationSectionDefinition[];

export const coreModules = defineModules([
  {
    apiVersion: 1,
    id: "dashboard",
    route: routes.dashboard,
    title: "工作台",
    subtitle: "治理概览、待处理文件与审查任务池总览",
    navigation: { label: "工作台", sectionId: "workspace", order: 0, prefetch: true },
    requiredPermissions: ["dashboard:read"],
  },
  {
    apiVersion: 1,
    id: "fileClassification",
    route: routes.fileClassification,
    title: "文件分类入库 / 文件分类",
    subtitle: "上传并确认文件类型、分类和层级；确认后进入分类池",
    navigation: { label: "文件分类", sectionId: "governance", order: 0, prefetch: true },
    requiredPermissions: ["documents:write"],
  },
  {
    apiVersion: 1,
    id: "classificationTasks",
    route: routes.classificationTasks,
    title: "文件分类入库 / 分类任务池",
    subtitle: "分类确认后的文件进入任务池，可直接入库到知识库或手动开始审查",
    navigation: { label: "分类任务池", sectionId: "governance", order: 10, prefetch: true },
    requiredPermissions: ["documents:write"],
  },
  {
    apiVersion: 1,
    id: "reviewTasks",
    route: routes.reviewTasks,
    title: "通用审查 / 审查任务池",
    subtitle: "保留查看既有审查进度和风险报告，不作为分类入库主链路",
    navigation: { label: "审查任务（只读）", sectionId: "governance", order: 20, prefetch: true },
    requiredPermissions: ["reviews:read"],
  },
  {
    apiVersion: 1,
    id: "contractReview",
    route: routes.contractReview,
    title: "合同审查 / 上传与配置",
    subtitle: "条款级合同专项审查，可直接上传并配置审查范围",
    navigation: { label: "上传合同", sectionId: "contract-review", order: 0, prefetch: true },
    requiredPermissions: ["contracts:write"],
  },
  {
    apiVersion: 1,
    id: "contractReviewTasks",
    route: routes.contractReviewTasks,
    title: "合同审查 / 任务池",
    subtitle: "管理直接上传的条款级合同专项审查任务",
    navigation: { label: "合同审查任务池", sectionId: "contract-review", order: 10, prefetch: true },
    requiredPermissions: ["contracts:write"],
  },
  {
    apiVersion: 1,
    id: "knowledge",
    route: routes.knowledge,
    title: "知识库",
    subtitle: "查看从分类池直接入库的正式文件资产",
    navigation: { label: "知识库", sectionId: "knowledge", order: 0, prefetch: true },
    requiredPermissions: ["documents:read"],
  },
  {
    apiVersion: 1,
    id: "chat",
    route: routes.chat,
    title: "智能问答",
    subtitle: "基于正式入库知识库提供可追溯回答",
    navigation: { label: "智能问答", sectionId: "knowledge", order: 10, prefetch: true },
    requiredPermissions: ["chat:use"],
  },
  {
    apiVersion: 1,
    id: "reviewReport",
    route: "/review-tasks/[taskId]/report",
    title: "审查报告",
    subtitle: "查看审查结论、风险项和检测细节",
    requiredPermissions: ["reviews:read"],
  },
  {
    apiVersion: 1,
    id: "contractReviewWorkbench",
    route: "/contract-review/tasks/[taskId]/review",
    title: "合同审查工作台",
    subtitle: "对照原文查看风险、解析合同并进行实时问答",
    requiredPermissions: ["contracts:read"],
  },
] as const);

export type AppModuleId = (typeof coreModules)[number]["id"];
export const moduleRegistry = createModuleRegistry(coreModules, navigationSections);
