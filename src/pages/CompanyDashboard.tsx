import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import BottomNav from "@/components/BottomNav";
import {
  Briefcase, Settings, MapPin, Users, Plus, ChevronRight, Moon, Sun, LogOut,
  Eye, Loader2, X, Inbox, Trash2, Edit,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ProfileEditor from "@/components/ProfileEditor";

type Offer = {
  id: string;
  company_id: string;
  title: string;
  description: string;
  location: string;
  salary: string;
  type: string;
  tags: string[];
  active: boolean;
  views: number;
  created_at: string;
};

type Application = {
  id: string;
  job_id: string;
  worker_id: string;
  status: string;
  created_at: string;
  worker_name?: string;
  job_title?: string;
};

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  nuevo: { label: "Nuevo", class: "bg-stat-blue/10 text-stat-blue" },
  revisando: { label: "En revisión", class: "bg-stat-orange/10 text-stat-orange" },
  entrevista: { label: "Entrevista", class: "bg-stat-green/10 text-stat-green" },
  rechazado: { label: "Rechazado", class: "bg-destructive/10 text-destructive" },
};

const emptyForm = { title: "", description: "", location: "", salary: "", type: "Tiempo completo", tags: "" };

const CompanyDashboard = () => {
  const [userEmail, setUserEmail] = useState("");
  const navigate = useNavigate();
  const { isDark, toggle: toggleDark } = useDarkMode();

  const [companyName, setCompanyName] = useState("");
  const [userId, setUserId] = useState("");
  const [activeTab, setActiveTab] = useState<"ofertas" | "candidatos" | "perfil">("ofertas");

  const [offers, setOffers] = useState<Offer[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u) { navigate("/"); return; }
      setUserId(u.id);
      setUserEmail(u.email ?? "");
      const { data: prof } = await supabase.from("profiles").select("company_name, full_name").eq("user_id", u.id).maybeSingle();
      setCompanyName(prof?.company_name || prof?.full_name || u.email?.split("@")[0] || "Tu empresa");
    });
  }, [navigate]);

  const loadAll = useCallback(async (uid: string) => {
    setLoading(true);
    const { data: jobsData } = await supabase
      .from("jobs").select("*").eq("company_id", uid).order("created_at", { ascending: false });
    const offerRows = (jobsData ?? []) as Offer[];
    setOffers(offerRows);

    const jobIds = offerRows.map((j) => j.id);
    if (jobIds.length) {
      const { data: appsData } = await supabase
        .from("applications").select("*").in("job_id", jobIds).order("created_at", { ascending: false });
      const apps = (appsData ?? []) as Application[];
      const workerIds = Array.from(new Set(apps.map((a) => a.worker_id)));
      if (workerIds.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", workerIds);
        const map = new Map((profs ?? []).map((p: any) => [p.user_id, p.full_name || "Candidato"]));
        apps.forEach((a) => {
          a.worker_name = map.get(a.worker_id) || "Candidato";
          a.job_title = offerRows.find((o) => o.id === a.job_id)?.title;
        });
      }
      setApplications(apps);
    } else {
      setApplications([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (userId) loadAll(userId); }, [userId, loadAll]);

  // Realtime
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel("company-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs", filter: `company_id=eq.${userId}` }, () => loadAll(userId))
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, () => loadAll(userId))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, loadAll]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    toast({ title: "Sesión cerrada" });
    navigate("/");
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (o: Offer) => {
    setEditing(o);
    setForm({
      title: o.title, description: o.description, location: o.location,
      salary: o.salary, type: o.type, tags: (o.tags ?? []).join(", "),
    });
    setShowModal(true);
  };

  const submitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast({ title: "Título requerido", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      salary: form.salary.trim(),
      type: form.type,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    if (editing) {
      const { error } = await supabase.from("jobs").update(payload).eq("id", editing.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Oferta actualizada" });
    } else {
      const { error } = await supabase.from("jobs").insert({ ...payload, company_id: userId, active: true });
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Oferta publicada" });
    }
    setSaving(false);
    setShowModal(false);
    loadAll(userId);
  };

  const toggleActive = async (o: Offer) => {
    setBusyId(o.id);
    await supabase.from("jobs").update({ active: !o.active }).eq("id", o.id);
    toast({ title: o.active ? "Oferta pausada" : "Oferta activada" });
    setBusyId(null);
  };

  const deleteOffer = async (id: string) => {
    if (!confirm("¿Eliminar esta oferta?")) return;
    setBusyId(id);
    await supabase.from("jobs").delete().eq("id", id);
    toast({ title: "Oferta eliminada" });
    setBusyId(null);
  };

  const updateAppStatus = async (id: string, status: string) => {
    setBusyId(id);
    await supabase.from("applications").update({ status }).eq("id", id);
    toast({ title: "Estado actualizado" });
    setBusyId(null);
  };

  const totals = useMemo(() => ({
    offers: offers.length,
    active: offers.filter((o) => o.active).length,
    candidates: applications.length,
  }), [offers, applications]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="JobConnect" className="w-8 h-8 object-contain" />
            <span className="font-bold text-foreground">JobConnect</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleDark}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Greeting + KPIs */}
        <div>
          <p className="text-xs text-muted-foreground">Hola,</p>
          <h1 className="text-xl font-bold text-foreground">{companyName} 👋</h1>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <KPI label="Ofertas" value={totals.offers} />
          <KPI label="Activas" value={totals.active} />
          <KPI label="Candidatos" value={totals.candidates} />
        </div>

        {activeTab === "ofertas" && (
          <section className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Mis ofertas</h2>
              <Button size="sm" onClick={openCreate} className="rounded-lg h-9">
                <Plus className="w-4 h-4 mr-1" /> Nueva
              </Button>
            </div>
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
            ) : offers.length === 0 ? (
              <EmptyState
                icon={<Briefcase className="w-8 h-8 text-muted-foreground" />}
                title="Aún no has publicado ofertas"
                subtitle="Publica tu primera oferta para empezar a recibir candidatos."
              />
            ) : (
              offers.map((o) => {
                const candCount = applications.filter((a) => a.job_id === o.id).length;
                return (
                  <article key={o.id} className="bg-card rounded-2xl p-4 border border-border shadow-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{o.title}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />{o.location || "Sin ubicación"}
                        </p>
                      </div>
                      <Switch checked={o.active} onCheckedChange={() => toggleActive(o)} disabled={busyId === o.id} />
                    </div>
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{candCount} candidatos</span>
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{o.views} vistas</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => openEdit(o)} className="flex-1 h-8 text-xs"><Edit className="w-3 h-3 mr-1" />Editar</Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteOffer(o.id)} disabled={busyId === o.id} className="h-8 text-destructive hover:text-destructive">
                        {busyId === o.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      </Button>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        )}

        {activeTab === "candidatos" && (
          <section className="space-y-3 animate-fade-in">
            <h2 className="text-lg font-bold text-foreground">Candidatos</h2>
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
            ) : applications.length === 0 ? (
              <EmptyState
                icon={<Inbox className="w-8 h-8 text-muted-foreground" />}
                title="Aún no hay candidatos"
                subtitle="Cuando alguien se postule a tus ofertas, aparecerá aquí."
              />
            ) : (
              applications.map((a) => {
                const meta = STATUS_LABELS[a.status] || { label: a.status, class: "bg-muted text-muted-foreground" };
                return (
                  <article key={a.id} className="bg-card rounded-2xl p-4 border border-border">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{a.worker_name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{a.job_title}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${meta.class}`}>{meta.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(["nuevo", "revisando", "entrevista", "rechazado"] as const).map((s) => (
                        <button
                          key={s}
                          disabled={busyId === a.id || a.status === s}
                          onClick={() => updateAppStatus(a.id, s)}
                          className={`text-[10px] px-2 py-1 rounded-md transition-all ${a.status === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                        >
                          {STATUS_LABELS[s].label}
                        </button>
                      ))}
                    </div>
                  </article>
                );
              })
            )}
          </section>
        )}

        {activeTab === "perfil" && (
          <section className="space-y-4 animate-fade-in pb-2">
            <h2 className="text-lg font-bold text-foreground">Perfil de empresa</h2>
            {userId && <ProfileEditor userId={userId} email={userEmail} variant="company" />}
            <div className="space-y-2 pt-2">
              <Button variant="outline" className="w-full justify-between h-11 rounded-xl" onClick={() => navigate("/terminos")}>Términos <ChevronRight className="w-4 h-4" /></Button>
              <Button variant="outline" className="w-full justify-between h-11 rounded-xl" onClick={() => navigate("/privacidad")}>Privacidad <ChevronRight className="w-4 h-4" /></Button>
              <Button variant="destructive" className="w-full h-11 rounded-xl" onClick={handleLogout} disabled={isLoggingOut}>
                {isLoggingOut ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
                Cerrar sesión
              </Button>
            </div>
          </section>
        )}
      </main>

      {/* Create/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm animate-fade-in" onClick={() => !saving && setShowModal(false)} />
          <form onSubmit={submitOffer} className="relative w-full max-w-lg bg-card rounded-t-2xl shadow-elevated max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex justify-between items-center p-5 sticky top-0 bg-card border-b border-border">
              <h2 className="text-lg font-bold text-foreground">{editing ? "Editar oferta" : "Nueva oferta"}</h2>
              <button type="button" onClick={() => setShowModal(false)} className="p-2 hover:bg-muted rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <fieldset disabled={saving} className="p-5 space-y-3 disabled:opacity-70">
              <Field label="Título *">
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej. Desarrollador Frontend" />
              </Field>
              <Field label="Descripción">
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Describe la posición..." />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ubicación"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Madrid (Híbrido)" /></Field>
                <Field label="Salario"><Input value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="35k - 45k €" /></Field>
              </div>
              <Field label="Tipo">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full h-10 px-3 bg-muted/50 rounded-md border border-border text-sm">
                  <option>Tiempo completo</option><option>Medio tiempo</option><option>Remoto</option><option>Híbrido</option><option>Presencial</option><option>Prácticas</option>
                </select>
              </Field>
              <Field label="Etiquetas (separadas por coma)">
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="React, TypeScript, Node" />
              </Field>
              <Button type="submit" disabled={saving} className="w-full h-11 gradient-primary text-primary-foreground rounded-xl">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{editing ? "Guardando..." : "Publicando..."}</> : (editing ? "Guardar cambios" : "Publicar oferta")}
              </Button>
            </fieldset>
          </form>
        </div>
      )}

      <BottomNav
        items={[
          { icon: <Briefcase className="w-5 h-5" />, label: "Ofertas", active: activeTab === "ofertas", onClick: () => setActiveTab("ofertas") },
          { icon: <Users className="w-5 h-5" />, label: "Candidatos", active: activeTab === "candidatos", onClick: () => setActiveTab("candidatos"), badge: applications.length },
          { icon: <Settings className="w-5 h-5" />, label: "Perfil", active: activeTab === "perfil", onClick: () => setActiveTab("perfil") },
        ]}
      />
    </div>
  );
};

const KPI = ({ label, value }: { label: string; value: number }) => (
  <div className="bg-card rounded-xl p-3 border border-border text-center">
    <p className="text-xl font-bold text-foreground">{value}</p>
    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs font-medium text-foreground mb-1 block">{label}</label>
    {children}
  </div>
);

const EmptyState = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) => (
  <div className="flex flex-col items-center text-center py-12 px-6">
    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">{icon}</div>
    <h3 className="font-semibold text-foreground">{title}</h3>
    <p className="text-xs text-muted-foreground mt-1 max-w-xs">{subtitle}</p>
  </div>
);

export default CompanyDashboard;
