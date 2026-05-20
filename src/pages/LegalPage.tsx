import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "@/components/icons";
import logo from "@/assets/logo.png";

interface LegalPageProps {
  variant: "terms" | "privacy";
}

const termsSections = [
  {
    title: "1. Aceptación de los términos",
    body: "Al acceder y utilizar JobConnect aceptas quedar vinculado por estos Términos y Condiciones. Si no estás de acuerdo con alguna parte, te pedimos que no utilices la aplicación.",
  },
  {
    title: "2. Uso de la plataforma",
    body: "JobConnect conecta profesionales con empresas. Te comprometes a usar la app de forma honesta, proporcionar información veraz y no publicar contenido ofensivo, fraudulento o ilegal.",
  },
  {
    title: "3. Cuentas de usuario",
    body: "Eres responsable de mantener la confidencialidad de tu contraseña y de toda actividad realizada desde tu cuenta. Notifícanos de inmediato cualquier uso no autorizado.",
  },
  {
    title: "4. Contenido publicado",
    body: "Las ofertas, perfiles y mensajes son responsabilidad de quien los publica. NovaTech no garantiza la veracidad de cada publicación, aunque trabajamos para moderar la plataforma.",
  },
  {
    title: "5. Limitación de responsabilidad",
    body: "JobConnect actúa como intermediario. No somos parte de los acuerdos laborales que se generen entre profesionales y empresas a través de la app.",
  },
  {
    title: "6. Cambios en los términos",
    body: "Podemos actualizar estos términos para reflejar mejoras del servicio o cambios legales. Te avisaremos dentro de la app cuando ocurra un cambio relevante.",
  },
];

const privacySections = [
  {
    title: "1. Información que recopilamos",
    body: "Guardamos los datos que nos proporcionas al registrarte (nombre, correo, tipo de cuenta) y los que generas al usar la app (postulaciones, mensajes, preferencias).",
  },
  {
    title: "2. Cómo usamos tus datos",
    body: "Usamos tu información para mostrarte ofertas relevantes, conectar perfiles con empresas, mejorar la experiencia y enviarte notificaciones importantes sobre tu cuenta.",
  },
  {
    title: "3. Con quién compartimos información",
    body: "Solo compartimos datos con las empresas a las que postulas y con proveedores tecnológicos que nos ayudan a operar la app, siempre bajo acuerdos de confidencialidad.",
  },
  {
    title: "4. Seguridad",
    body: "Aplicamos cifrado y buenas prácticas de seguridad para proteger tu información. Ningún sistema es 100% infalible, pero trabajamos para minimizar cualquier riesgo.",
  },
  {
    title: "5. Tus derechos",
    body: "Puedes acceder, corregir o eliminar tu información personal en cualquier momento desde la configuración de tu cuenta o escribiéndonos a soporte.",
  },
  {
    title: "6. Contacto",
    body: "Para consultas sobre privacidad escríbenos a privacidad@novatech.app. Responderemos a la brevedad posible.",
  },
];

const LegalPage = ({ variant }: LegalPageProps) => {
  const navigate = useNavigate();
  const isTerms = variant === "terms";
  const title = isTerms ? "Términos y Condiciones" : "Política de Privacidad";
  const subtitle = isTerms
    ? "Las reglas que rigen el uso de JobConnect."
    : "Cómo cuidamos y usamos tu información personal.";
  const sections = isTerms ? termsSections : privacySections;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/90 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <img src={logo} alt="JobConnect" className="w-7 h-7 rounded-lg" />
          <span className="font-semibold text-foreground text-sm">JobConnect</span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-5 py-8">
        <div className="mb-8 animate-fade-in">
          <span className="inline-block text-[10px] uppercase tracking-widest text-primary font-semibold mb-2">
            Legal
          </span>
          <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
          <p className="text-[11px] text-muted-foreground mt-3">Última actualización: 1 de mayo de 2026</p>
        </div>

        <div className="space-y-4">
          {sections.map((s, i) => (
            <article
              key={i}
              className="bg-card border border-border rounded-2xl p-5 shadow-card"
            >
              <h2 className="text-sm font-semibold text-foreground mb-2">{s.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </article>
          ))}
        </div>

        <footer className="mt-10 pb-8 text-center">
          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} NovaTech · Todos los derechos reservados
          </p>
        </footer>
      </main>
    </div>
  );
};

export default LegalPage;
