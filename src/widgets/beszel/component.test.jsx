// @vitest-environment jsdom

import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "test-utils/render-with-providers";
import { expectBlockValue } from "test-utils/widget-assertions";

const { useWidgetAPI } = vi.hoisted(() => ({ useWidgetAPI: vi.fn() }));

vi.mock("utils/proxy/use-widget-api", () => ({ default: useWidgetAPI }));

import Component from "./component";

// Helper: mock both the systems and alerts useWidgetAPI calls.
// useWidgetAPI is called in order: first for "systems", then for "alerts"/"alertsSystem".
function mockAPIs(systemsResult, alertsResult = { data: { items: [], totalItems: 0 }, error: undefined }) {
  useWidgetAPI.mockReturnValueOnce(systemsResult).mockReturnValueOnce(alertsResult);
}

describe("widgets/beszel/component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders placeholders while loading (systems view)", () => {
    mockAPIs({ data: undefined, error: undefined }, { data: undefined, error: undefined });

    const service = { widget: { type: "beszel" } };
    const { container } = renderWithProviders(<Component service={service} />, { settings: { hideErrors: false } });

    expect(service.widget.fields).toBeUndefined();
    expect(container.querySelectorAll(".service-block")).toHaveLength(2);
    expect(screen.getByText("beszel.systems")).toBeInTheDocument();
    expect(screen.getByText("beszel.up")).toBeInTheDocument();
  });

  it("renders system totals when loaded (systems view)", () => {
    mockAPIs({
      data: {
        totalItems: 3,
        items: [{ status: "up" }, { status: "down" }, { status: "up" }],
      },
      error: undefined,
    });

    const { container } = renderWithProviders(<Component service={{ widget: { type: "beszel" } }} />, {
      settings: { hideErrors: false },
    });

    expectBlockValue(container, "beszel.systems", 3);
    expectBlockValue(container, "beszel.up", "2 / 3");
  });

  it("renders selected system details and filters to 4 default fields", () => {
    mockAPIs({
      data: {
        totalItems: 1,
        items: [
          {
            id: "sys1",
            name: "MySystem",
            status: "up",
            updated: 123,
            info: { cpu: 10, mp: 20, dp: 30, b: 40 },
          },
        ],
      },
      error: undefined,
    });

    const service = { widget: { type: "beszel", systemId: "sys1" } };
    const { container } = renderWithProviders(<Component service={service} />, { settings: { hideErrors: false } });

    expect(service.widget.fields).toBeUndefined();
    expect(container.querySelectorAll(".service-block")).toHaveLength(4);

    expectBlockValue(container, "beszel.name", "MySystem");
    expectBlockValue(container, "beszel.status", "beszel.up");
    expectBlockValue(container, "beszel.cpu", 10);
    expectBlockValue(container, "beszel.memory", 20);
    expect(screen.queryByText("beszel.updated")).toBeNull();
  });

  it("renders optional fields", () => {
    mockAPIs({
      data: {
        totalItems: 1,
        items: [
          {
            id: "sys1",
            name: "MySystem",
            status: "up",
            updated: 123,
            info: { cpu: 10, mp: 20, dp: 30, b: 40, bb: 14.5 },
          },
        ],
      },
      error: undefined,
    });

    const service = {
      widget: { type: "beszel", systemId: "sys1", fields: ["name", "disk", "network"] },
    };
    const { container } = renderWithProviders(<Component service={service} />, { settings: { hideErrors: false } });

    expect(service.widget.fields).toEqual(["name", "disk", "network"]);
    expect(container.querySelectorAll(".service-block")).toHaveLength(3);
    expectBlockValue(container, "beszel.name", "MySystem");
    expectBlockValue(container, "beszel.disk", 30);
    expectBlockValue(container, "beszel.network", 14.5);
  });

  it("renders error when systemId is not found", () => {
    mockAPIs({
      data: { totalItems: 1, items: [{ id: "sys1", name: "MySystem", status: "up", info: {} }] },
      error: undefined,
    });

    renderWithProviders(<Component service={{ widget: { type: "beszel", systemId: "missing" } }} />, {
      settings: { hideErrors: false },
    });

    expect(screen.getByText("System with id missing not found")).toBeInTheDocument();
  });

  it("renders alerts count in overview mode when alerts field is specified", () => {
    mockAPIs(
      {
        data: { totalItems: 2, items: [{ status: "up" }, { status: "up" }] },
        error: undefined,
      },
      {
        data: { items: [{ id: "a1" }, { id: "a2" }, { id: "a3" }], totalItems: 3 },
        error: undefined,
      },
    );

    const service = { widget: { type: "beszel", fields: ["systems", "up", "alerts"] } };
    const { container } = renderWithProviders(<Component service={service} />, { settings: { hideErrors: false } });

    expect(container.querySelectorAll(".service-block")).toHaveLength(3);
    expectBlockValue(container, "beszel.alerts", 3);
  });

  it("renders alerts count in single system mode when alerts field is specified", () => {
    mockAPIs(
      {
        data: {
          totalItems: 1,
          items: [{ id: "sys1", name: "MySystem", status: "up", updated: 123, info: { cpu: 10, mp: 20, dp: 30, bb: 14.5 } }],
        },
        error: undefined,
      },
      {
        // Two alerts for sys1, one for a different system — only sys1's two should be counted.
        data: { items: [{ id: "a1", system: "sys1" }, { id: "a2", system: "sys1" }, { id: "a3", system: "other" }], totalItems: 3 },
        error: undefined,
      },
    );

    const service = { widget: { type: "beszel", systemId: "sys1", fields: ["name", "alerts"] } };
    const { container } = renderWithProviders(<Component service={service} />, { settings: { hideErrors: false } });

    expect(container.querySelectorAll(".service-block")).toHaveLength(2);
    expectBlockValue(container, "beszel.alerts", 2);
  });

  it("renders zero alerts with no highlight in overview mode", () => {
    mockAPIs(
      { data: { totalItems: 1, items: [{ status: "up" }] }, error: undefined },
      { data: { items: [], totalItems: 0 }, error: undefined },
    );

    const service = { widget: { type: "beszel", fields: ["alerts"] } };
    const { container } = renderWithProviders(<Component service={service} />, { settings: { hideErrors: false } });

    expectBlockValue(container, "beszel.alerts", 0);
  });
});
