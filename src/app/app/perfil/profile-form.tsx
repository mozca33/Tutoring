"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  applyPreferences, THEMES, DENSITIES, THEME_LABEL, DENSITY_LABEL,
  type Theme, type Density,
} from "@/lib/preferences";
import { validateName } from "@/lib/validation";

type Initial = {
  full_name: string;
  bio: string;
  email: string;
  role: string;
  avatar_url: string | null;
  theme: Theme;
  density: Density;
};

export default function ProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initial.full_name);
  const [bio, setBio] = useState(initial.bio);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url);
  const [theme, setTheme] = useState<Theme>(initial.theme);
  const [density, setDensity] = useState<Density>(initial.density);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const initials = fullName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  async function uid() {
    return (await createClient().auth.getUser()).data.user!.id;
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMsg("Selecione uma imagem."); return; }
    if (file.size > 5 * 1024 * 1024) { setMsg("Imagem muito grande (máx. 5MB)."); return; }
    setMsg(null);
    setUploading(true);
    const supabase = createClient();
    const id = await uid();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { setUploading(false); e.target.value = ""; return setMsg(upErr.message); }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = pub.publicUrl;
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", id);
    setUploading(false);
    e.target.value = "";
    if (error) return setMsg(error.message);
    setAvatarUrl(url);
    setMsg("Foto atualizada!");
    router.refresh();
  }

  async function changeTheme(next: Theme) {
    setTheme(next);
    applyPreferences(next, density);
    await createClient().from("profiles").update({ theme: next }).eq("id", await uid());
  }

  async function changeDensity(next: Density) {
    setDensity(next);
    applyPreferences(theme, next);
    await createClient().from("profiles").update({ density: next }).eq("id", await uid());
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const name = validateName(fullName);
    if (!name.ok) return setMsg(name.error!);
    setLoading(true);
    const { error } = await createClient()
      .from("profiles")
      .update({ full_name: name.value, bio: bio.trim() || null })
      .eq("id", await uid());
    setLoading(false);
    if (error) return setMsg(error.message);
    setMsg("Perfil atualizado!");
    router.refresh();
  }

  const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="bg-surface border border-border rounded-xl p-6 flex items-center gap-4">
        {avatarUrl ? (
          <Image src={avatarUrl} alt="Foto de perfil" width={80} height={80} className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <span className="h-20 w-20 rounded-full bg-indigo-600 text-white grid place-items-center text-2xl font-semibold">
            {initials || "?"}
          </span>
        )}
        <div>
          <label className="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background transition-colors">
            <Camera size={16} />
            {uploading ? "Enviando..." : "Trocar foto"}
            <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} disabled={uploading} />
          </label>
          <p className="text-xs text-muted mt-1">JPG ou PNG, até 5MB.</p>
        </div>
      </div>

      {/* Dados */}
      <form onSubmit={onSubmit} className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nome completo</label>
          <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">E-mail</label>
          <input className={`${inputClass} opacity-60`} value={initial.email} disabled />
          <p className="text-xs text-muted mt-1">O e-mail não pode ser alterado por aqui.</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Bio</label>
          <textarea className={inputClass} rows={3} placeholder="Conte um pouco sobre você..." value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        {msg && <p className={`text-sm ${msg.includes("!") ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{msg}</p>}
        <button disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors">
          {loading ? "Salvando..." : "Salvar"}
        </button>
      </form>

      {/* Preferências de aparência */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-5">
        <h2 className="font-semibold">Aparência</h2>
        <div>
          <label className="block text-sm font-medium mb-2">Tema</label>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((t) => (
              <button key={t} type="button" onClick={() => changeTheme(t)}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  theme === t ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "border-border hover:bg-background"
                }`}>
                {THEME_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Tamanho do layout</label>
          <div className="grid grid-cols-3 gap-2">
            {DENSITIES.map((d) => (
              <button key={d} type="button" onClick={() => changeDensity(d)}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  density === d ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "border-border hover:bg-background"
                }`}>
                {DENSITY_LABEL[d]}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted mt-2">Pequeno, médio ou grande — ajusta o tamanho de toda a interface.</p>
        </div>
      </div>
    </div>
  );
}
