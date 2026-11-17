import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Dashboard from "./Dashboard";

afterEach(() => {
  window.location.hash = "";
  window.localStorage.removeItem("sipena.accessToken");
});

describe("dashboard awal setelah login", () => {
  it("mengarahkan admin dan guru ke dashboard tanpa memakai hash halaman sebelumnya", async () => {
    window.localStorage.removeItem("sipena.accessToken");

    for (const role of ["admin", "guru"]) {
      window.location.hash = "#grade-entry";
      const { unmount } = render(
        <Dashboard
          onLogout={() => undefined}
          user={{ id: "1", name: "Pengguna SIPENA", email: "user@sekolah.sch.id", role }}
        />,
      );

      await waitFor(() => {
        expect(window.location.hash).toBe("#dashboard");
      });
      expect(
        within(screen.getByRole("navigation", { name: "Navigasi utama" })).getByRole("link", {
          name: "Dashboard",
        }),
      ).toHaveAttribute("aria-current", "page");
      if (role === "admin") {
        expect(screen.getByRole("heading", { name: "Dashboard Admin" })).toBeInTheDocument();
      }

      unmount();
    }
  });
});
