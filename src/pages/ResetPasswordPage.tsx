import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthHeader from "@/components/AuthHeader";
import loginBg from "@/assets/login-bg.jpg";
import { ArrowRight, Loader2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase pone la sesión de recovery automáticamente al llegar con el enlace
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    // Verifica si ya hay sesión activa (caso recovery)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const validate = () => {
    const next: typeof errors = {};
    if (!password) next.password = "Ingresa una nueva contraseña";
    else if (password.length < 8) next.password = "Mínimo 8 caracteres";
    else if (password.length > 100) next.password = "Contraseña demasiado larga";
    if (confirm !== password) next.confirm = "Las contraseñas no coinciden";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({
        title: "Contraseña actualizada",
        description: "Ya puedes iniciar sesión con tu nueva contraseña.",
      });
      await supabase.auth.signOut();
      navigate("/");
    } catch (err: any) {
      const msg: string = err?.message ?? "No se pudo actualizar la contraseña";
      let friendly = msg;
      if (msg.toLowerCase().includes("weak") || msg.toLowerCase().includes("pwned")) {
        friendly = "Esa contraseña es insegura o fue filtrada. Elige otra.";
      }
      toast({ title: "Error", description: friendly, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-10 relative"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-sm bg-card/95 backdrop-blur-md rounded-2xl shadow-elevated p-6 animate-fade-in">
        <AuthHeader
          title="Nueva contraseña"
          subtitle="Crea una contraseña segura para tu cuenta."
        />

        {!ready ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Verificando enlace... Si llegaste aquí sin un enlace válido, solicita uno nuevo.
            </p>
            <Button
              type="button"
              onClick={() => navigate("/forgot-password")}
              variant="outline"
              className="w-full h-11 rounded-xl"
            >
              Solicitar enlace nuevo
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <fieldset disabled={loading} className="space-y-4 disabled:opacity-70">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Nueva contraseña</label>
              <Input
                type="password"
                autoComplete="new-password"
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
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Confirmar contraseña</label>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  if (errors.confirm) setErrors((p) => ({ ...p, confirm: undefined }));
                }}
                aria-invalid={!!errors.confirm}
                className={`h-11 bg-muted/50 border-border rounded-xl ${errors.confirm ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {errors.confirm && <p className="text-[11px] text-destructive mt-1">{errors.confirm}</p>}
            </div>
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
                  Guardando...
                </>
              ) : (
                <>
                  Actualizar contraseña
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
