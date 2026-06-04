import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FileActionsMenu from "./file-actions-menu";

describe("FileActionsMenu", () => {
  it("abre o menu e mostra só as ações fornecidas", async () => {
    const onView = vi.fn();
    const onDownload = vi.fn();
    render(<FileActionsMenu onView={onView} onDownload={onDownload} />);

    await userEvent.click(screen.getByLabelText("Mais ações"));
    expect(screen.getByText("Visualizar")).toBeInTheDocument();
    expect(screen.getByText("Baixar")).toBeInTheDocument();
    expect(screen.queryByText("Anotar")).toBeNull();
    expect(screen.queryByText("Remover")).toBeNull();

    await userEvent.click(screen.getByText("Visualizar"));
    expect(onView).toHaveBeenCalledTimes(1);
  });

  it("mostra Anotar e Remover quando fornecidos", async () => {
    render(<FileActionsMenu onAnnotate={() => {}} onRemove={() => {}} />);
    await userEvent.click(screen.getByLabelText("Mais ações"));
    expect(screen.getByText("Anotar")).toBeInTheDocument();
    expect(screen.getByText("Remover")).toBeInTheDocument();
  });
});
