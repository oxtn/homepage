import { describe, expect, it } from "vitest";

import { expectWidgetConfigShape } from "test-utils/widget-config";

import widget from "./widget";

describe("beszel widget config", () => {
  it("exports a valid widget config", () => {
    expectWidgetConfigShape(widget);
  });

  it("configures the alerts mapping with allowEmpty enabled", () => {
    expect(widget.mappings.alerts).toEqual({
      endpoint: "collections/alerts/records?filter=triggered%3Dtrue&fields=id%2Ctriggered%2Csystem&perPage=500",
      allowEmpty: true,
    });
  });
});
