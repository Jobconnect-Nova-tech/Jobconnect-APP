import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthHeader from "@/components/AuthHeader";
import loginBg from "@/assets/login-bg.jpg";
import { ArrowRight, Loader2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Briefcase, Building2 } from "@/components/icons";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = "signin" | "signup";
type Role = "worker" | "company";

const routeForRole = (role: Role | null) => (role === "company" ? "/empresa" : "/dashboard");

const fetchRole = async (userId: string): Promise<Role> => {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.role as Role) || "worker";
};

const LoginPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [role, setRole] = useState<Role>("worker");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    const redirectIfSession = async (userId?: string) => {
      if (!userId) return;
      setSessionUserId(userId);
      const r = await fetchRole(userId);
      setRole(r);
      navigate(routeForRole(r));
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) redirectIfSession(data.session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        redirectIfSession(session.user.id);
      } else {
        setSessionUserId(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  // Cambia el rol y, si hay sesión, sincroniza con BD y redirige al dashboard correcto.
  const selectRole = async (next: Role) => {
    setRole(next);
    if (!sessionUserId || loading) return;
    try {
      // Limpia roles previos y deja solo el nuevo (worker o company)
      await supabase.from("user_roles").delete().eq("user_id", sessionUserId);
      await supabase.from("user_roles").insert({ user_id: sessionUserId, role: next });
      navigate(routeForRole(next));
    } catch (err: any) {
      toast({ title: "No se pudo cambiar el rol", description: err?.message ?? "", variant: "destructive" });
    }
  };


  const validate = () => {
    const next: { email?: string; password?: string } = {};
    const trimmed = email.trim();
    if (!trimmed) next.email = "Ingresa tu correo electrónico";
    else if (trimmed.length > 255) next.email = "Correo demasiado largo";
    else if (!emailRegex.test(trimmed)) next.email = "Correo no válido";

    if (!password) next.password = "Ingresa tu contraseña";
    else if (password.length < 6) next.password = "Mínimo 6 caracteres";
    else if (password.length > 100) next.password = "Contraseña demasiado larga";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || loading) return;
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { role },
          },
        });
        if (error) throw error;
        toast({
          title: "Cuenta creada",
          description: "Tu cuenta está lista. Iniciando sesión...",
        });
        // Auto-confirm está activo: intentamos iniciar sesión inmediatamente.
        await supabase.auth.signInWithPassword({ email: email.trim(), password });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        // onAuthStateChange hará la redirección
      }
    } catch (err: any) {
      const msg: string = err?.message ?? "No se pudo completar la operación";
      let friendly = msg;
      if (msg.includes("Invalid login credentials")) friendly = "Correo o contraseña incorrectos";
      else if (msg.includes("already registered")) friendly = "Ese correo ya está registrado";
      else if (msg.includes("Email not confirmed")) friendly = "Confirma tu correo antes de iniciar sesión";
      toast({ title: "Error", description: friendly, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({
          title: "Error con Google",
          description: result.error.message ?? "No se pudo iniciar sesión con Google",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      // tokens recibidos, onAuthStateChange redirige
    } catch (err: any) {
      toast({
        title: "Error con Google",
        description: err?.message ?? "No se pudo iniciar sesión",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-10 relative"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm bg-card/95 backdrop-blur-md rounded-2xl shadow-elevated p-5 sm:p-6 animate-fade-in">
        <AuthHeader
          title={mode === "signin" ? "Bienvenido de vuelta" : "Crea tu cuenta"}
          subtitle={mode === "signin" ? "Accede a tu cuenta para continuar" : "Comienza a usar JobConnect en segundos"}
        />

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <fieldset disabled={loading} className="space-y-4 disabled:opacity-70">

          {/* Segmented role toggle — prominente */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Soy</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted/60 rounded-xl">
              <button
                type="button"
                onClick={() => selectRole("worker")}
                disabled={loading}
                className={`flex items-center justify-center gap-1.5 h-10 rounded-lg text-xs font-semibold transition-all ${
                  role === "worker"
                    ? "bg-card shadow-card text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Briefcase className="w-4 h-4" /> Profesional
              </button>
              <button
                type="button"
                onClick={() => selectRole("company")}
                disabled={loading}
                className={`flex items-center justify-center gap-1.5 h-10 rounded-lg text-xs font-semibold transition-all ${
                  role === "company"
                    ? "bg-card shadow-card text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 className="w-4 h-4" /> Empresa
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Correo electrónico</label>
            <Input
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
              }}
              aria-invalid={!!errors.email}
              className={`h-11 bg-muted/50 border-border rounded-xl ${errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
            {errors.email && <p className="text-[11px] text-destructive mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Contraseña</label>
            <Input
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
              }}
              aria-invalid={!!errors.password}
              className={`h-11 bg-muted/50 border-border rounded-xl ${errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
            {errors.password && <p className="text-[11px] text-destructive mt-1">{errors.password}</p>}
          </div>

          {mode === "signin" && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                disabled={loading}
                className="text-xs font-medium text-primary hover:underline disabled:opacity-50 disabled:pointer-events-none"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}
          </fieldset>

          <Button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full h-11 gradient-primary text-primary-foreground font-semibold text-sm rounded-xl"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                {mode === "signin" ? "Continuar" : "Crear cuenta"}
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>

          <div className="relative flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">o</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            aria-busy={loading}
            variant="outline"
            className="w-full h-11 text-sm rounded-xl bg-card gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loading ? "Conectando..." : "Continuar con Google"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            {mode === "signin" ? (
              <>
                ¿No tienes cuenta?{" "}
                <button type="button" onClick={() => setMode("signup")} disabled={loading} className="font-semibold text-primary hover:underline disabled:opacity-50 disabled:pointer-events-none">
                  Regístrate gratis
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{" "}
                <button type="button" onClick={() => setMode("signin")} disabled={loading} className="font-semibold text-primary hover:underline disabled:opacity-50 disabled:pointer-events-none">
                  Inicia sesión
                </button>
              </>
            )}
          </p>
        </form>
      </div>

      {/* Brand footer */}
      <div className="relative z-10 mt-6 sm:mt-8 flex items-center gap-2 text-[10px] sm:text-[11px] text-white/80 tracking-wide">
        <span>Powered by</span>
        <span className="font-semibold text-white">NovaTech</span>
        <span className="w-px h-3 bg-white/30" />
        <button type="button" onClick={() => navigate("/terminos")} className="hover:text-white transition-colors">Términos</button>
        <span className="text-white/40">·</span>
        <button type="button" onClick={() => navigate("/privacidad")} className="hover:text-white transition-colors">Privacidad</button>
      </div>
    </div>
  );
};

export default LoginPage;
