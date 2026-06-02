// Tipos de arquivo permitidos em uploads de materiais e lição de casa.
// Validamos pela extensão (simples e previsível) + limite de tamanho.

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

export const ALLOWED_EXTENSIONS = [
  // Documentos
  "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt", "csv",
  "odt", "odp", "ods",
  // Imagens (úteis para fotos de exercícios feitos à mão)
  "jpg", "jpeg", "png", "gif", "webp", "heic",
  // Áudio
  "mp3", "wav", "m4a", "ogg",
  // Vídeo
  "mp4", "webm", "mov",
] as const;

// String para o atributo `accept` do <input type="file">
export const ACCEPT_ATTR = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",");

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function validateUpload(file: File): { ok: boolean; error?: string } {
  const ext = extOf(file.name);
  if (!ext || !(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
    return {
      ok: false,
      error: "Tipo de arquivo não permitido. Aceitos: documentos, imagens, áudio e vídeo.",
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `Arquivo muito grande (máx. ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).` };
  }
  return { ok: true };
}
