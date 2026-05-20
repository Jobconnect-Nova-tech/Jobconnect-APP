import { MapPin, DollarSign, Heart, Zap, X, ChevronRight, Loader2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Job {
  id: string;
  title: string;
  company: string;
  verified: boolean;
  location: string;
  salary: string;
  type: string;
  description: string;
  tags: string[];
  date: string;
  image?: string;
  requirements?: string[];
  benefits?: string[];
}

interface JobDetailModalProps {
  job: Job;
  onClose: () => void;
  onApply?: () => void;
  onSave?: () => void;
  isSaved?: boolean;
  isApplied?: boolean;
  isApplying?: boolean;
}

const JobDetailModal = ({ job, onClose, onApply, onSave, isSaved, isApplied, isApplying }: JobDetailModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-2xl shadow-elevated max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Image header */}
        {job.image && (
          <div className="relative">
            <img src={job.image} alt={job.title} className="w-full h-44 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
            <button onClick={onClose} className="absolute top-3 right-3 p-2 bg-card/80 backdrop-blur-sm text-foreground rounded-full hover:bg-card transition-colors" aria-label="Cerrar">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {!job.image && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>
        )}

        <div className="px-5 pb-6 pt-3 space-y-4">
          {/* Title */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-foreground">{job.title}</h2>
              {job.verified && (
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 20 20" fill="hsl(var(--stat-green))">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{job.company}</p>
          </div>

          {/* Key info */}
          <div className="flex flex-wrap gap-3 text-sm text-foreground">
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" />{job.location}</span>
            <span className="flex items-center gap-1.5 font-semibold"><DollarSign className="w-4 h-4 text-primary" />{job.salary}</span>
          </div>

          <Badge variant="outline" className="text-xs border-primary/20 text-primary">{job.type}</Badge>

          <p className="text-sm text-muted-foreground leading-relaxed">{job.description}</p>

          {/* Requirements */}
          {job.requirements && job.requirements.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Requisitos</h4>
              <ul className="space-y-1.5">
                {job.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ChevronRight className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Benefits */}
          {job.benefits && job.benefits.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Beneficios</h4>
              <div className="flex flex-wrap gap-2">
                {job.benefits.map((b, i) => (
                  <span key={i} className="text-xs bg-accent text-accent-foreground px-3 py-1 rounded-full">
                    {b}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 space-y-2">
            <Button
              onClick={onApply}
              disabled={isApplied || isApplying}
              aria-busy={isApplying}
              className="w-full h-12 gradient-primary text-primary-foreground font-semibold text-sm rounded-xl disabled:opacity-70"
            >
              {isApplying ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Enviando...</>
              ) : (
                <><Zap className="w-4 h-4 mr-1.5" />{isApplied ? "Ya postulado" : "Postularme ahora"}</>
              )}
            </Button>
            <Button onClick={onSave} variant="outline" className="w-full h-10 rounded-xl text-sm">
              <Heart className={`w-4 h-4 mr-1.5 ${isSaved ? "fill-destructive text-destructive" : ""}`} />
              {isSaved ? "Quitar de guardadas" : "Guardar oferta"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetailModal;
