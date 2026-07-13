import { describe, expect, it } from "vitest";

import {
  createModuleRegistry,
  moduleRegistry,
  type FrontendModuleV1,
  type NavigationSectionDefinition,
} from "./module-registry";
import { routes, type AppRoute } from "./routes";

const baseSections = [
  { id: "main", label: "Main", order: 0 },
] as const satisfies readonly NavigationSectionDefinition[];

function moduleFixture(
  id: string,
  route: AppRoute,
  overrides: Partial<FrontendModuleV1> = {},
): FrontendModuleV1 {
  return {
    apiVersion: 1,
    id,
    route,
    title: id,
    subtitle: `${id} subtitle`,
    ...overrides,
  };
}

describe("createModuleRegistry validation", () => {
  it("rejects duplicate module ids", () => {
    expect(() =>
      createModuleRegistry(
        [
          moduleFixture("duplicate", "/first"),
          moduleFixture("duplicate", "/second"),
        ],
        baseSections,
      ),
    ).toThrow("Duplicate module id: duplicate");
  });

  it("rejects duplicate module routes", () => {
    expect(() =>
      createModuleRegistry(
        [
          moduleFixture("first", "/duplicate"),
          moduleFixture("second", "/duplicate"),
        ],
        baseSections,
      ),
    ).toThrow("Duplicate module route: /duplicate");
  });

  it("rejects navigation contributions for an unknown section", () => {
    expect(() =>
      createModuleRegistry(
        [
          moduleFixture("orphan", "/orphan", {
            navigation: {
              label: "Orphan",
              sectionId: "missing",
              order: 0,
            },
          }),
        ],
        baseSections,
      ),
    ).toThrow("Unknown navigation section missing for orphan.");
  });
});

describe("createModuleRegistry navigation", () => {
  it("sorts sections and items while preserving explicit and default prefetch", () => {
    const sections = [
      { id: "later", label: "Later", order: 20 },
      { id: "earlier", label: "Earlier", order: 10 },
      { id: "empty", label: "Empty", order: 0 },
    ] as const satisfies readonly NavigationSectionDefinition[];
    const registry = createModuleRegistry(
      [
        moduleFixture("laterItem", "/later", {
          navigation: {
            label: "Later item",
            sectionId: "later",
            order: 0,
            prefetch: false,
          },
        }),
        moduleFixture("earlierSecond", "/earlier-second", {
          navigation: {
            label: "Earlier second",
            sectionId: "earlier",
            order: 20,
          },
        }),
        moduleFixture("earlierFirst", "/earlier-first", {
          navigation: {
            label: "Earlier first",
            sectionId: "earlier",
            order: 10,
            prefetch: true,
          },
        }),
      ],
      sections,
    );

    const navigation = registry.getNavigation();

    expect(navigation.map((section) => section.id)).toEqual([
      "earlier",
      "later",
    ]);
    expect(navigation[0].items).toMatchObject([
      { moduleId: "earlierFirst", order: 10, prefetch: true },
      { moduleId: "earlierSecond", order: 20, prefetch: true },
    ]);
    expect(navigation[1].items).toMatchObject([
      { moduleId: "laterItem", order: 0, prefetch: false },
    ]);
  });
});

describe("core module registry", () => {
  it("can read core modules by id and route", () => {
    expect(moduleRegistry.get("dashboard")).toMatchObject({
      id: "dashboard",
      route: routes.dashboard,
    });
    expect(moduleRegistry.findByRoute(routes.knowledge)?.id).toBe("knowledge");
    expect(moduleRegistry.find("not-registered")).toBeUndefined();
  });
});
