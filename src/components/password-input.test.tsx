import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PasswordInput from "./password-input";

describe("PasswordInput", () => {
  it("começa oculto e alterna a visibilidade", async () => {
    render(<PasswordInput placeholder="Senha" />);
    const input = screen.getByPlaceholderText("Senha") as HTMLInputElement;
    expect(input.type).toBe("password");

    const toggle = screen.getByRole("button");
    await userEvent.click(toggle);
    expect(input.type).toBe("text");

    await userEvent.click(toggle);
    expect(input.type).toBe("password");
  });

  it("repassa props (value/onChange) ao input", async () => {
    render(<PasswordInput placeholder="Senha" defaultValue="abc" />);
    const input = screen.getByPlaceholderText("Senha") as HTMLInputElement;
    expect(input.value).toBe("abc");
  });
});
