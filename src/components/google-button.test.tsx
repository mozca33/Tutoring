import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GoogleButton from "./google-button";

describe("GoogleButton", () => {
  it("mostra o rótulo e dispara onClick", async () => {
    const onClick = vi.fn();
    render(<GoogleButton onClick={onClick} label="Entrar com Google" />);
    await userEvent.click(screen.getByRole("button", { name: /Google/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("respeita disabled", () => {
    render(<GoogleButton onClick={() => {}} disabled label="X" />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
