import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import BottomNav from "@/components/BottomNav";
import {
  Search, Briefcase, Settings, MapPin, Moon, Sun, LogOut,
  Heart, Bell, Loader2, Inbox, Zap, X, ChevronRight,
} from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ProfileEditor from "@/components/ProfileEditor";

type Job = {
  id: string;
  company_id: string;
  title: string;
  description: string;
  location: string;
  salary: string;
  type: string;
  tags: string[];
  active: boolean;
  created_at: string;
  company_name?: string;
};

const FILTERS = ["Todas", "Remoto", "Híbrido", "Presencial"];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
};

const formatDate = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (d === 0) return "Hoy";
  if (d === 1) return "Ayer";
  if (d < 7) return `Hace ${d} días`;
  if (d < 30) return `Hace ${Math.floor(d / 7)} sem`;
  return `Hace ${Math.floor(d / 30)} meses`;
};

const WorkerDashboard = () => {
  const navigate = useNavigate();
  const { isDark, toggle: toggleDark } = useDarkMode();

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"ofertas" | "aplicaciones" | "guardadas" | "perfil">("ofertas");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todas");

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [appliedRows, setAppliedRows] = useState<{ id: string; job_id: string; status: string; created_at: string }[]>([]);

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Auth + initial load
  useEffect(() => {
    let unsub: (() => void) | undefined;
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u) { navigate("/"); return; }
      setUserId(u.id);
      setUserEmail(u.email ?? "");
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("user_id", u.id).maybeSingle();
      const name = prof?.full_name || u.email?.split("@")[0] || "";
      setUserName(name.split(" ")[0]);
    });
    return () => unsub?.();
  }, [navigate]);

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar las ofertas", variant: "destructive" });
      setLoadingJobs(false);
      return;
    }
    const rows = (data ?? []) as Job[];
    // Hydrate company names
    const ids = Array.from(new Set(rows.map((r) => r.company_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, company_name, full_name").in("user_id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.user_id, p.company_name || p.full_name || "Empresa"]));
      rows.forEach((r) => { r.company_name = map.get(r.company_id) || "Empresa"; });
    }
    setJobs(rows);
    setLoadingJobs(false);
  }, []);

  const loadUserData = useCallback(async (uid: string) => {
    const [{ data: saved }, { data: apps }] = await Promise.all([
      supabase.from("saved_jobs").select("job_id").eq("worker_id", uid),
      supabase.from("applications").select("id, job_id, status, created_at").eq("worker_id", uid),
    ]);
    setSavedIds(new Set((saved ?? []).map((s: any) => s.job_id)));
    setAppliedRows(apps ?? []);
    setAppliedIds(new Set((apps ?? []).map((a: any) => a.job_id)));
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);
  useEffect(() => { if (userId) loadUserData(userId); }, [userId, loadUserData]);

  // Realtime updates for jobs and own apps/saves
  useEffect(() => {
    const ch = supabase
      .channel("worker-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => loadJobs())
      .on("postgres_changes", { event: "*", schema: "public", table: "applications", filter: `worker_id=eq.${userId}` }, () => userId && loadUserData(userId))
      .on("postgres_changes", { event: "*", schema: "public", table: "saved_jobs", filter: `worker_id=eq.${userId}` }, () => userId && loadUserData(userId))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, loadJobs, loadUserData]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    toast({ title: "Sesión cerrada", description: "Hasta pronto 👋" });
    navigate("/");
  };

  const toggleSave = async (jobId: string) => {
    if (!userId) return;
    setBusyId(jobId);
    if (savedIds.has(jobId)) {
      await supabase.from("saved_jobs").delete().eq("worker_id", userId).eq("job_id", jobId);
      toast({ title: "Eliminada de guardadas" });
    } else {
      await supabase.from("saved_jobs").insert({ worker_id: userId, job_id: jobId });
      toast({ title: "Guardada", description: "La encontrarás en tu pestaña Guardadas" });
    }
    await loadUserData(userId);
    setBusyId(null);
  };

  const apply = async (jobId: string) => {
    if (!userId) return;
    setIsApplying(true);
    const { error } = await supabase.from("applications").insert({ worker_id: userId, job_id: jobId });
    if (error) {
      toast({ title: "Error", description: error.message.includes("duplicate") ? "Ya te postulaste" : "No se pudo postular", variant: "destructive" });
    } else {
      toast({ title: "Postulación enviada", description: "La empresa recibió tu candidatura" });
      await loadUserData(userId);
      setSelectedJob(null);
    }
    setIsApplying(false);
  };

  const withdraw = async (appId: string) => {
    setBusyId(appId);
    await supabase.from("applications").delete().eq("id", appId);
    toast({ title: "Postulación retirada" });
    await loadUserData(userId);
    setBusyId(null);
  };

  const filteredJobs = useMemo(() => {
    let r = jobs;
    if (activeFilter !== "Todas") {
      r = r.filter((j) => j.location.toLowerCase().includes(activeFilter.toLowerCase()) || j.type.toLowerCase().includes(activeFilter.toLowerCase()));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter((j) => j.title.toLowerCase().includes(q) || (j.company_name ?? "").toLowerCase().includes(q) || j.tags.some((t) => t.toLowerCase().includes(q)));
    }
    return r;
  }, [jobs, activeFilter, searchQuery]);

  const savedJobs = useMemo(() => jobs.filter((j) => savedIds.has(j.id)), [jobs, savedIds]);
  const myApps = useMemo(() => {
    return appliedRows.map((a) => ({ ...a, job: jobs.find((j) => j.id === a.job_id) })).filter((a) => a.job);
  }, [appliedRows, jobs]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="JobConnect" className="w-8 h-8 object-contain" />
            <span className="font-bold text-foreground">JobConnect</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleDark} aria-label="Tema">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" aria-label="Notificaciones">
              <Bell className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {activeTab === "ofertas" && (
          <>
            {/* Greeting */}
            <div className="animate-fade-in">
              <p className="text-xs text-muted-foreground">{getGreeting()},</p>
              <h1 className="text-xl font-bold text-foreground">{userName || "bienvenido"} 👋</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Encuentra tu próxima oportunidad</p>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar puesto, empresa o tecnología"
                className="pl-9 h-11 bg-muted/50 border-border rounded-xl"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`flex-shrink-0 px-3 h-8 rounded-full text-xs font-medium transition-all ${
                    activeFilter === f ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Job list */}
            <div className="space-y-3">
              {loadingJobs ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-2xl" />
                ))
              ) : filteredJobs.length === 0 ? (
                <EmptyState
                  icon={<Briefcase className="w-8 h-8 text-muted-foreground" />}
                  title={jobs.length === 0 ? "Aún no hay ofertas" : "Sin resultados"}
                  subtitle={jobs.length === 0 ? "Las nuevas ofertas aparecerán aquí en tiempo real." : "Prueba con otras palabras o filtros."}
                />
              ) : (
                filteredJobs.map((job) => (
                  <article key={job.id} className="bg-card rounded-2xl p-4 shadow-card border border-border animate-fade-in">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{job.title}</h3>
                        <p className="text-xs text-muted-foreground">{job.company_name}</p>
                      </div>
                      <button
                        onClick={() => toggleSave(job.id)}
                        disabled={busyId === job.id}
                        aria-label="Guardar oferta"
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                      >
                        {busyId === job.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Heart className={`w-4 h-4 ${savedIds.has(job.id) ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                        )}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                      {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
                      {job.salary && <span className="font-semibold text-foreground">{job.salary}</span>}
                    </div>
                    {job.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {job.tags.slice(0, 4).map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px] font-normal">{t}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] text-muted-foreground">{formatDate(job.created_at)}</span>
                      <Button size="sm" onClick={() => setSelectedJob(job)} className="h-8 rounded-lg text-xs">
                        Ver detalle
                      </Button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === "aplicaciones" && (
          <section className="space-y-3 animate-fade-in">
            <h2 className="text-lg font-bold text-foreground">Mis postulaciones</h2>
            {myApps.length === 0 ? (
              <EmptyState
                icon={<Inbox className="w-8 h-8 text-muted-foreground" />}
                title="Sin postulaciones"
                subtitle="Cuando te postules a una oferta, aparecerá aquí."
              />
            ) : (
              myApps.map((a) => (
                <article key={a.id} className="bg-card rounded-2xl p-4 shadow-card border border-border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{a.job?.title}</h3>
                      <p className="text-xs text-muted-foreground">{a.job?.company_name}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{a.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[10px] text-muted-foreground">Postulado {formatDate(a.created_at)}</span>
                    <Button size="sm" variant="ghost" disabled={busyId === a.id} onClick={() => withdraw(a.id)} className="h-8 text-xs text-destructive hover:text-destructive">
                      {busyId === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Retirar"}
                    </Button>
                  </div>
                </article>
              ))
            )}
          </section>
        )}

        {activeTab === "guardadas" && (
          <section className="space-y-3 animate-fade-in">
            <h2 className="text-lg font-bold text-foreground">Guardadas</h2>
            {savedJobs.length === 0 ? (
              <EmptyState
                icon={<Heart className="w-8 h-8 text-muted-foreground" />}
                title="Sin ofertas guardadas"
                subtitle="Guarda ofertas con el corazón para revisarlas más tarde."
              />
            ) : (
              savedJobs.map((j) => (
                <article key={j.id} className="bg-card rounded-2xl p-4 shadow-card border border-border">
                  <h3 className="font-semibold text-foreground">{j.title}</h3>
                  <p className="text-xs text-muted-foreground">{j.company_name}</p>
                  <div className="flex justify-end mt-3">
                    <Button size="sm" onClick={() => setSelectedJob(j)} className="h-8 rounded-lg text-xs">Ver detalle</Button>
                  </div>
                </article>
              ))
            )}
          </section>
        )}

        {activeTab === "perfil" && (
          <section className="space-y-4 animate-fade-in pb-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Mi perfil</h2>
              <div className="grid grid-cols-3 gap-2 text-center">
                <MiniStat label="Postul." value={appliedRows.length} />
                <MiniStat label="Guard." value={savedIds.size} />
                <MiniStat label="Activ." value={jobs.length} />
              </div>
            </div>
            {userId && <ProfileEditor userId={userId} email={userEmail} variant="worker" />}
            <div className="space-y-2 pt-2">
              <Button variant="outline" className="w-full justify-between h-11 rounded-xl" onClick={() => navigate("/terminos")}>
                Términos <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between h-11 rounded-xl" onClick={() => navigate("/privacidad")}>
                Privacidad <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="destructive" className="w-full h-11 rounded-xl" onClick={handleLogout} disabled={isLoggingOut}>
                {isLoggingOut ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
                Cerrar sesión
              </Button>
            </div>
          </section>
        )}
      </main>

      {/* Detail modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedJob(null)} />
          <div className="relative w-full max-w-lg bg-card rounded-t-2xl shadow-elevated max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex justify-between items-start p-5 sticky top-0 bg-card border-b border-border">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-foreground truncate">{selectedJob.title}</h2>
                <p className="text-xs text-muted-foreground">{selectedJob.company_name}</p>
              </div>
              <button onClick={() => setSelectedJob(null)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-3 text-xs text-foreground">
                {selectedJob.location && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" />{selectedJob.location}</span>}
                {selectedJob.salary && <span className="font-semibold">{selectedJob.salary}</span>}
              </div>
              <Badge variant="outline" className="text-xs border-primary/20 text-primary">{selectedJob.type}</Badge>
              {selectedJob.description && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{selectedJob.description}</p>}
              {selectedJob.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedJob.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px] font-normal">{t}</Badge>)}
                </div>
              )}
              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => apply(selectedJob.id)}
                  disabled={appliedIds.has(selectedJob.id) || isApplying}
                  className="w-full h-11 gradient-primary text-primary-foreground rounded-xl"
                >
                  {isApplying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : appliedIds.has(selectedJob.id) ? "Ya postulado" : <><Zap className="w-4 h-4 mr-1.5" /> Postularme</>}
                </Button>
                <Button variant="outline" onClick={() => toggleSave(selectedJob.id)} className="w-full h-10 rounded-xl text-sm">
                  <Heart className={`w-4 h-4 mr-1.5 ${savedIds.has(selectedJob.id) ? "fill-destructive text-destructive" : ""}`} />
                  {savedIds.has(selectedJob.id) ? "Quitar de guardadas" : "Guardar"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav
        items={[
          { icon: <Briefcase className="w-5 h-5" />, label: "Ofertas", active: activeTab === "ofertas", onClick: () => setActiveTab("ofertas") },
          { icon: <Inbox className="w-5 h-5" />, label: "Aplicado", active: activeTab === "aplicaciones", onClick: () => setActiveTab("aplicaciones"), badge: appliedRows.length },
          { icon: <Heart className="w-5 h-5" />, label: "Guardadas", active: activeTab === "guardadas", onClick: () => setActiveTab("guardadas"), badge: savedIds.size },
          { icon: <Settings className="w-5 h-5" />, label: "Perfil", active: activeTab === "perfil", onClick: () => setActiveTab("perfil") },
        ]}
      />
    </div>
  );
};

const EmptyState = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) => (
  <div className="flex flex-col items-center text-center py-12 px-6">
    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">{icon}</div>
    <h3 className="font-semibold text-foreground">{title}</h3>
    <p className="text-xs text-muted-foreground mt-1 max-w-xs">{subtitle}</p>
  </div>
);

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="text-center bg-muted/50 rounded-xl py-2">
    <p className="text-lg font-bold text-foreground">{value}</p>
    <p className="text-[10px] text-muted-foreground">{label}</p>
  </div>
);

const MiniStat = ({ label, value }: { label: string; value: number }) => (
  <div className="px-2 py-1 bg-muted/50 rounded-lg min-w-[44px]">
    <p className="text-sm font-bold text-foreground leading-tight">{value}</p>
    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
  </div>
);

export default WorkerDashboard;
