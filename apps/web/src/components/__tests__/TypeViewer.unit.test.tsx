import { render, screen } from "@testing-library/react";
import type { RuntimeTypeViewV1 } from "@graphdown/runtime";
import TypeViewer from "../TypeViewer";

const baseType: RuntimeTypeViewV1 = {
  typeId: "note",
  fields: { name: "Note", description: "A note record" },
  body: "Type docs live here."
};

describe("TypeViewer", () => {
  it("renders the type fields and body content", () => {
    render(<TypeViewer typeDef={baseType} />);

    expect(screen.getByTestId("type-fields").textContent).toContain("description: A note record");
    expect(screen.getByTestId("type-body")).toHaveTextContent("Type docs live here.");
  });

  it("shows a placeholder when no type body is present", () => {
    render(<TypeViewer typeDef={{ ...baseType, body: "" }} />);

    expect(screen.getByTestId("type-body")).toHaveTextContent("(no body)");
  });
});
