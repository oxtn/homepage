// @vitest-environment jsdom

import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "test-utils/render-with-providers";
import { expectBlockValue } from "test-utils/widget-assertions";

const { useWidgetAPI } = vi.hoisted(() => ({ useWidgetAPI: vi.fn() }));

vi.mock("utils/proxy/use-widget-api", () => ({ default: useWidgetAPI }));

import Component from "./component";

const fullSystem = {
  id: "sys1",
  name: "MySystem",
  status: "up",
  updated: 123,
  info: {
    cpu: 10,
    mp: 20,
    dp: 30,
    dt: 43.5,
    la: [1.75, 1.17, 0.85],
    g: 12,
    u: 90061,
    sv: [60, 2],
    pu: [7, 1],
    bat: [85, 4],
    v: "0.21.1",
  },
};

describe("widgets/beszel/component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders placeholders while loading (systems view)", () => {
    useWidgetAPI.mockReturnValue({ data: undefined, error: undefined });

    const service = { widget: { type: "beszel" } };
    const { container } = renderWithProviders(<Component service={service} />, { settings: { hideErrors: false } });

    expect(service.widget.fields).toBeUndefined();
    expect(container.querySelectorAll(".service-block")).toHaveLength(2);
    expect(screen.getByText("beszel.systems")).toBeInTheDocument();
    expect(screen.getByText("beszel.up")).toBeInTheDocument();
  });

  it("renders system totals when loaded (systems view)", () => {
    useWidgetAPI.mockReturnValue({
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
    useWidgetAPI.mockReturnValue({
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
    useWidgetAPI.mockReturnValue({
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

  it("renders temperature, load, gpu and uptime fields", () => {
    useWidgetAPI.mockReturnValue({ data: { totalItems: 1, items: [fullSystem] }, error: undefined });

    const service = { widget: { type: "beszel", systemId: "sys1", fields: ["temp", "load", "gpu", "uptime"] } };
    const { container } = renderWithProviders(<Component service={service} />, { settings: { hideErrors: false } });

    expect(container.querySelectorAll(".service-block")).toHaveLength(4);
    expectBlockValue(container, "beszel.temp", 43.5);
    expectBlockValue(container, "beszel.load", 1.75);
    expectBlockValue(container, "beszel.gpu", 12);
    expectBlockValue(container, "beszel.uptime", 90061);
  });

  it("renders services, updates, battery and agent fields", () => {
    useWidgetAPI.mockReturnValue({ data: { totalItems: 1, items: [fullSystem] }, error: undefined });

    const service = {
      widget: { type: "beszel", systemId: "sys1", fields: ["services", "updates", "battery", "agent"] },
    };
    const { container } = renderWithProviders(<Component service={service} />, { settings: { hideErrors: false } });

    expect(container.querySelectorAll(".service-block")).toHaveLength(4);
    expectBlockValue(container, "beszel.services", "58 / 60");
    expectBlockValue(container, "beszel.updates", 7);
    expectBlockValue(container, "beszel.battery", 85);
    expectBlockValue(container, "beszel.agent", "0.21.1");
  });

  it("renders error when systemId is not found", () => {
    useWidgetAPI.mockReturnValue({
      data: { totalItems: 1, items: [{ id: "sys1", name: "MySystem", status: "up", info: {} }] },
      error: undefined,
    });

    renderWithProviders(<Component service={{ widget: { type: "beszel", systemId: "missing" } }} />, {
      settings: { hideErrors: false },
    });

    expect(screen.getByText("System with id missing not found")).toBeInTheDocument();
  });

  it("renders alerts count in overview mode when alerts field is specified", () => {
    useWidgetAPI
      .mockReturnValueOnce({
        data: { totalItems: 2, items: [{ status: "up" }, { status: "up" }] },
        error: undefined,
      })
      .mockReturnValueOnce({
        data: { items: [{ id: "a1" }, { id: "a2" }, { id: "a3" }], totalItems: 3 },
        error: undefined,
      });

    const service = { widget: { type: "beszel", fields: ["systems", "up", "alerts"] } };
    const { container } = renderWithProviders(<Component service={service} />, { settings: { hideErrors: false } });

    expect(container.querySelectorAll(".service-block")).toHaveLength(3);
    expectBlockValue(container, "beszel.alerts", 3);
  });

  it("renders alerts count in single system mode when alerts field is specified", () => {
    useWidgetAPI
      .mockReturnValueOnce({
        data: {
          totalItems: 1,
          items: [
            { id: "sys1", name: "MySystem", status: "up", updated: 123, info: { cpu: 10, mp: 20, dp: 30, bb: 14.5 } },
          ],
        },
        error: undefined,
      })
      .mockReturnValueOnce({
        data: {
          items: [
            { id: "a1", system: "sys1" },
            { id: "a2", system: "sys1" },
            { id: "a3", system: "other" },
          ],
          totalItems: 3,
        },
        error: undefined,
      });

    const service = { widget: { type: "beszel", systemId: "sys1", fields: ["name", "alerts"] } };
    const { container } = renderWithProviders(<Component service={service} />, { settings: { hideErrors: false } });

    expect(container.querySelectorAll(".service-block")).toHaveLength(2);
    expectBlockValue(container, "beszel.alerts", 2);
  });

  it("renders loading placeholders while alerts are still loading", () => {
    useWidgetAPI
      .mockReturnValueOnce({ data: { totalItems: 1, items: [{ status: "up" }] }, error: undefined })
      .mockReturnValueOnce({ data: undefined, error: undefined });

    const service = { widget: { type: "beszel", fields: ["systems", "alerts"] } };
    const { container } = renderWithProviders(<Component service={service} />, { settings: { hideErrors: false } });

    expect(container.querySelectorAll(".service-block")).toHaveLength(2);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(2);
  });

  it("does not request alerts endpoint when alerts field is not enabled", () => {
    useWidgetAPI.mockReturnValue({ data: { totalItems: 1, items: [{ status: "up" }] }, error: undefined });

    const service = { widget: { type: "beszel", fields: ["systems", "up"] } };
    renderWithProviders(<Component service={service} />, { settings: { hideErrors: false } });

    expect(useWidgetAPI).toHaveBeenCalledWith(expect.objectContaining({ type: "beszel" }), "systems");
    expect(useWidgetAPI).toHaveBeenCalledWith(expect.objectContaining({ type: "beszel" }), "");
  });

  it("renders error when alerts endpoint returns an error", () => {
    useWidgetAPI
      .mockReturnValueOnce({ data: { totalItems: 1, items: [{ status: "up" }] }, error: undefined })
      .mockReturnValueOnce({ data: undefined, error: { message: "Alerts API failed" } });

    const service = { widget: { type: "beszel", fields: ["systems", "alerts"] } };
    renderWithProviders(<Component service={service} />, { settings: { hideErrors: false } });

    expect(screen.getByText("Alerts API failed")).toBeInTheDocument();
  });
});
