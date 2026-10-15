import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// next/navigation requires app-router context; provide a lightweight stub
// so components using usePathname/useRouter render in unit tests.
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    prefetch: () => {},
    back: () => {},
  }),
}));
