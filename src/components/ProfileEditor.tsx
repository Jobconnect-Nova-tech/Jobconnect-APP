import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Camera, Loader2, Save, FileText, Upload, X, Download, Award,
} from "@/components/icons";

type Variant = "worker" | "company";

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  company_logo_url: string | null;
  headline: string | null;
  bio: string | null;
  phone: string | null;
  location: string | null;
  website: string | null;
  skills: string[] | null;
  cv_url: string | null;
};

interface Props {
  userId: string;
  email: string;
  variant: Variant;
}

const ProfileEditor = ({ userId, email, variant }: Props) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [form, setForm] = useState<ProfileRow>({
    user_id: userId, full_name: "", company_name: "", avatar_url: "",
    company_logo_url: "", headline: "", bio: "", phone: "",
    location: "", website: "", skills: [], cv_url: "",
  });
  const [skillInput, setSkillInput] = useState("");
  const imgInput = useRef<HTMLInputElement>(null);
  const cvInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles").select("*").eq("user_id", userId).maybeSingle();
      if (data) setForm({ ...form, ...data, skills: data.skills ?? [] });
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const update = <K extends keyof ProfileRow>(k: K, v: ProfileRow[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Archivo inválido", description: "Selecciona una imagen", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagen muy grande", description: "Máximo 5 MB", variant: "destructive" });
      return;
    }
    setUploadingImg(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${variant === "company" ? "logo" : "avatar"}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Error al subir", description: error.message, variant: "destructive" });
    } else {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl;
      if (variant === "company") update("company_logo_url", url);
      else update("avatar_url", url);
      toast({ title: variant === "company" ? "Logo actualizado" : "Foto actualizada" });
    }
    setUploadingImg(false);
  };

  const uploadCv = async (file: File) => {
    const okTypes = ["application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!okTypes.includes(file.type)) {
      toast({ title: "Archivo inválido", description: "Sube un PDF o Word", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "CV muy grande", description: "Máximo 10 MB", variant: "destructive" });
      return;
    }
    setUploadingCv(true);
    const ext = file.name.split(".").pop() || "pdf";
    const path = `${userId}/cv.${ext}`;
    const { error } = await supabase.storage.from("cvs").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Error al subir CV", description: error.message, variant: "destructive" });
    } else {
      update("cv_url", path);
      toast({ title: "CV actualizado" });
    }
    setUploadingCv(false);
  };

  const downloadCv = async () => {
    if (!form.cv_url) return;
    const { data, error } = await supabase.storage.from("cvs").createSignedUrl(form.cv_url, 60);
    if (error || !data) {
      toast({ title: "Error", description: "No se pudo abrir el CV", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const removeCv = async () => {
    if (!form.cv_url) return;
    await supabase.storage.from("cvs").remove([form.cv_url]);
    update("cv_url", "");
    toast({ title: "CV eliminado" });
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (!s) return;
    if ((form.skills ?? []).includes(s)) { setSkillInput(""); return; }
    update("skills", [...(form.skills ?? []), s]);
    setSkillInput("");
  };

  const removeSkill = (s: string) =>
    update("skills", (form.skills ?? []).filter((x) => x !== s));

  const save = async () => {
    setSaving(true);
    const payload: any = {
      user_id: userId,
      full_name: form.full_name || null,
      company_name: form.company_name || null,
      avatar_url: form.avatar_url || null,
      company_logo_url: form.company_logo_url || null,
      headline: form.headline || null,
      bio: form.bio || null,
      phone: form.phone || null,
      location: form.location || null,
      website: form.website || null,
      skills: form.skills ?? [],
      cv_url: form.cv_url || null,
    };
    // Upsert
    const { data: existing } = await supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    const { error } = existing
      ? await supabase.from("profiles").update(payload).eq("user_id", userId)
      : await supabase.from("profiles").insert(payload);
    if (error) toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    else toast({ title: "Perfil guardado" });
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  const imgUrl = variant === "company" ? form.company_logo_url : form.avatar_url;
  const initials = (variant === "company" ? form.company_name : form.full_name)?.slice(0, 2).toUpperCase() || (email[0] ?? "U").toUpperCase();

  return (
    <div className="space-y-4">
      {/* Avatar / Logo */}
      <div className="bg-card rounded-2xl p-5 border border-border flex items-center gap-4">
        <div className="relative">
          <Avatar className="w-20 h-20">
            {imgUrl && <AvatarImage src={imgUrl} alt="Foto" />}
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">{initials}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => imgInput.current?.click()}
            disabled={uploadingImg}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-card hover:scale-105 transition-transform disabled:opacity-60"
            aria-label="Cambiar imagen"
          >
            {uploadingImg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          </button>
          <input
            ref={imgInput} type="file" accept="image/*" hidden
            onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">
            {variant === "company" ? (form.company_name || "Tu empresa") : (form.full_name || "Tu nombre")}
          </p>
          <p className="text-xs text-muted-foreground truncate">{email}</p>
          {form.headline && <p className="text-xs text-primary mt-1 truncate">{form.headline}</p>}
        </div>
      </div>

      {/* Form */}
      <div className="bg-card rounded-2xl p-5 border border-border space-y-4">
        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">
            {variant === "company" ? "Nombre de la empresa" : "Nombre completo"}
          </label>
          {variant === "company" ? (
            <Input value={form.company_name ?? ""} onChange={(e) => update("company_name", e.target.value)} placeholder="Acme Inc." />
          ) : (
            <Input value={form.full_name ?? ""} onChange={(e) => update("full_name", e.target.value)} placeholder="Tu nombre" />
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">
            {variant === "company" ? "Tagline" : "Titular profesional"}
          </label>
          <Input
            value={form.headline ?? ""}
            onChange={(e) => update("headline", e.target.value)}
            placeholder={variant === "company" ? "Construimos el futuro del trabajo" : "Desarrollador Frontend Senior"}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">
            {variant === "company" ? "Acerca de la empresa" : "Sobre mí"}
          </label>
          <Textarea
            value={form.bio ?? ""} rows={4}
            onChange={(e) => update("bio", e.target.value)}
            placeholder={variant === "company" ? "Describe tu empresa, cultura y misión..." : "Cuenta tu experiencia, intereses y lo que te apasiona..."}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Teléfono</label>
            <Input value={form.phone ?? ""} onChange={(e) => update("phone", e.target.value)} placeholder="+34 600 000 000" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Ubicación</label>
            <Input value={form.location ?? ""} onChange={(e) => update("location", e.target.value)} placeholder="Madrid, España" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">Sitio web</label>
          <Input value={form.website ?? ""} onChange={(e) => update("website", e.target.value)} placeholder="https://tu-sitio.com" />
        </div>

        {variant === "worker" && (
          <>
            {/* Skills */}
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block flex items-center gap-1">
                <Award className="w-3 h-3" /> Habilidades
              </label>
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                  placeholder="React, TypeScript..."
                />
                <Button type="button" variant="outline" onClick={addSkill}>Añadir</Button>
              </div>
              {(form.skills ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.skills!.map((s) => (
                    <Badge key={s} variant="secondary" className="text-[10px] gap-1 pr-1">
                      {s}
                      <button onClick={() => removeSkill(s)} className="ml-1 hover:text-destructive" aria-label={`Quitar ${s}`}>
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* CV */}
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block flex items-center gap-1">
                <FileText className="w-3 h-3" /> Currículum (PDF o Word)
              </label>
              {form.cv_url ? (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl border border-border">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-xs flex-1 truncate text-foreground">CV cargado</span>
                  <Button type="button" size="sm" variant="ghost" onClick={downloadCv}>
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={removeCv} className="text-destructive">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button" variant="outline" disabled={uploadingCv}
                  className="w-full h-11 rounded-xl border-dashed"
                  onClick={() => cvInput.current?.click()}
                >
                  {uploadingCv ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Subir CV
                </Button>
              )}
              <input
                ref={cvInput} type="file" accept=".pdf,.doc,.docx" hidden
                onChange={(e) => e.target.files?.[0] && uploadCv(e.target.files[0])}
              />
            </div>
          </>
        )}

        <Button onClick={save} disabled={saving} className="w-full h-11 gradient-primary text-primary-foreground rounded-xl">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : <><Save className="w-4 h-4 mr-2" />Guardar perfil</>}
        </Button>
      </div>
    </div>
  );
};

export default ProfileEditor;
