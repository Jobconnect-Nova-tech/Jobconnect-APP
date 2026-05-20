import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthHeader from "@/components/AuthHeader";
import loginBg from "@/assets/login-bg.jpg";
import { ArrowLeft, ArrowRight, Loader2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !emailRegex.test(trimmed)) {
      setError("Ingresa un correo válido");
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) throw err;
      setSent(true);
      toast({
        title: "Correo enviado",
        description: "Revisa tu bandeja de entrada para restablecer tu contraseña.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message ?? "No se pudo enviar el correo",
        variant: "destructive",
      });
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
        <button
          type="button"
          onClick={() => navigate("/")}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
        </button>

        <AuthHeader
          title="Recupera tu contraseña"
          subtitle={sent
            ? "Te enviamos un enlace para restablecer tu contraseña."
            : "Te enviaremos un enlace seguro a tu correo."}
        />

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Correo electrónico</label>
              <Input
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                value={email}
                disabled={loading}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(undefined);
                }}
                aria-invalid={!!error}
                className={`h-11 bg-muted/50 border-border rounded-xl ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {error && <p className="text-[11px] text-destructive mt-1">{error}</p>}
            </div>

            <Button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full h-11 gradient-primary text-primary-foreground font-semibold text-sm rounded-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  Enviar enlace
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-xl p-4 text-xs text-foreground">
              Si no ves el correo en unos minutos, revisa tu carpeta de spam o intenta de nuevo.
            </div>
            <Button
              type="button"
              onClick={() => navigate("/")}
              className="w-full h-11 gradient-primary text-primary-foreground font-semibold text-sm rounded-xl"
            >
              Volver al inicio
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
