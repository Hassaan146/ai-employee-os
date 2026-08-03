import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmount anything a test rendered so state cannot leak into the next test.
afterEach(() => {
  cleanup();
});
