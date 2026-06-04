import { describe, it, expect } from "vitest";
import { validateUpload, ACCEPT_ATTR, ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES } from "./uploads";

function makeFile(name: string, size: number, type = ""): File {
  const f = new File([new Uint8Array(0)], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

describe("validateUpload", () => {
  it("aceita PDF dentro do limite", () => expect(validateUpload(makeFile("aula.pdf", 1000)).ok).toBe(true));
  it("aceita imagem", () => expect(validateUpload(makeFile("foto.PNG", 1000)).ok).toBe(true));
  it("aceita áudio e vídeo", () => {
    expect(validateUpload(makeFile("a.mp3", 1000)).ok).toBe(true);
    expect(validateUpload(makeFile("v.mp4", 1000)).ok).toBe(true);
  });
  it("rejeita extensão não permitida", () => expect(validateUpload(makeFile("vírus.exe", 1000)).ok).toBe(false));
  it("rejeita .zip (removido)", () => expect(validateUpload(makeFile("pack.zip", 1000)).ok).toBe(false));
  it("rejeita sem extensão", () => expect(validateUpload(makeFile("arquivo", 1000)).ok).toBe(false));
  it("rejeita acima do tamanho máximo", () => expect(validateUpload(makeFile("a.pdf", MAX_UPLOAD_BYTES + 1)).ok).toBe(false));
});

describe("ACCEPT_ATTR / ALLOWED_EXTENSIONS", () => {
  it("accept contém .pdf", () => expect(ACCEPT_ATTR).toContain(".pdf"));
  it("não contém zip", () => expect(ALLOWED_EXTENSIONS as readonly string[]).not.toContain("zip"));
  it("contém docx/xls/csv", () => {
    const list = ALLOWED_EXTENSIONS as readonly string[];
    expect(list).toContain("docx");
    expect(list).toContain("xls");
    expect(list).toContain("csv");
  });
});
