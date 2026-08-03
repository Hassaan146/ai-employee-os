/**
 * Tests for the preview-data banner.
 *
 * This component is the safeguard that stops fixture records being mistaken
 * for real ones. If it ever renders without naming the missing endpoint, a
 * reviewer could reasonably believe they are looking at live data.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DataSourceNotice } from "@/components/DataSourceNotice";

describe("DataSourceNotice", () => {
  it("labels the content as preview data", () => {
    render(<DataSourceNotice endpoint="GET /api/v1/users" />);

    expect(screen.getByText("Preview data")).toBeInTheDocument();
  });

  it("names the endpoint that is missing", () => {
    render(<DataSourceNotice endpoint="GET /api/v1/companies/me" />);

    expect(screen.getByText("GET /api/v1/companies/me")).toBeInTheDocument();
  });

  it("explains that the view will switch to live data on its own", () => {
    render(<DataSourceNotice endpoint="GET /api/v1/users" />);

    expect(screen.getByText(/switch to live data automatically/i)).toBeInTheDocument();
  });

  it("shows the underlying reason when one is supplied", () => {
    render(<DataSourceNotice endpoint="GET /api/v1/users" reason="404 Not Found" />);

    expect(screen.getByText(/404 Not Found/)).toBeInTheDocument();
  });

  it("renders without a reason", () => {
    render(<DataSourceNotice endpoint="GET /api/v1/users" />);

    expect(screen.getByText("Preview data")).toBeInTheDocument();
  });
});
