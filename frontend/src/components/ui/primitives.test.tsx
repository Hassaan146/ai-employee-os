/**
 * Tests for the shared UI primitives.
 *
 * Focus is on behaviour that other pages rely on — accessible labelling,
 * disabled handling, and the class merger — rather than on styling details
 * that are expected to change.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Input,
  PageHeader,
  cn,
} from "@/components/ui/primitives";

describe("cn", () => {
  it("joins truthy class names and drops falsy ones", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("returns an empty string when nothing is truthy", () => {
    expect(cn(false, null, undefined)).toBe("");
  });
});

describe("Button", () => {
  it("fires onClick when activated", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save changes</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not fire when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Save changes
      </Button>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("defaults to type=button so it cannot accidentally submit a form", () => {
    render(<Button>Cancel</Button>);

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it("honours an explicit submit type", () => {
    render(<Button type="submit">Create</Button>);

    expect(screen.getByRole("button", { name: "Create" })).toHaveAttribute(
      "type",
      "submit",
    );
  });
});

describe("Field", () => {
  it("associates its label with the control via htmlFor", () => {
    render(
      <Field label="Work email" htmlFor="email">
        <Input id="email" />
      </Field>,
    );

    // Querying by label proves the association is wired correctly.
    expect(screen.getByLabelText("Work email")).toBeInTheDocument();
  });

  it("renders the hint text when provided", () => {
    render(
      <Field label="Password" htmlFor="pw" hint="At least 8 characters.">
        <Input id="pw" />
      </Field>,
    );

    expect(screen.getByText("At least 8 characters.")).toBeInTheDocument();
  });
});

describe("Card", () => {
  it("renders its header, description, and body content", () => {
    render(
      <Card>
        <CardHeader title="Service health" description="Polled from live endpoints." />
        <CardBody>Backend API</CardBody>
      </Card>,
    );

    expect(screen.getByRole("heading", { name: "Service health" })).toBeInTheDocument();
    expect(screen.getByText("Polled from live endpoints.")).toBeInTheDocument();
    expect(screen.getByText("Backend API")).toBeInTheDocument();
  });
});

describe("PageHeader", () => {
  it("renders the title as a level-1 heading", () => {
    render(<PageHeader title="AI employees" description="Manage the workforce." />);

    expect(
      screen.getByRole("heading", { level: 1, name: "AI employees" }),
    ).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("shows the title, description, and any action passed in", () => {
    render(
      <EmptyState
        title="No AI employees match these filters"
        description="Adjust the filters above."
        action={<Button>New AI employee</Button>}
      />,
    );

    expect(screen.getByText("No AI employees match these filters")).toBeInTheDocument();
    expect(screen.getByText("Adjust the filters above.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New AI employee" })).toBeInTheDocument();
  });
});

describe("Badge", () => {
  it("renders its content", () => {
    render(<Badge tone="ok">Live</Badge>);

    expect(screen.getByText("Live")).toBeInTheDocument();
  });
});
