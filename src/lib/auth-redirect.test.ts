import { describe, it, expect } from "vitest";
import { authRedirectTo } from "./auth-redirect";

describe("authRedirectTo", () => {
  it("aponta para /auth/callback com o next codificado", () => {
    const url = authRedirectTo("/app");
    expect(url).toContain("/auth/callback");
    expect(url).toContain("next=%2Fapp");
  });
  it("inclui intent quando fornecido", () => {
    expect(authRedirectTo("/app", "login")).toContain("intent=login");
    expect(authRedirectTo("/app", "signup")).toContain("intent=signup");
  });
  it("não inclui intent quando ausente", () => {
    expect(authRedirectTo("/reset-password")).not.toContain("intent=");
  });
});
