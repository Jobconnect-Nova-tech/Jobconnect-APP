import { ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  value: string;
  label: string;
  colorClass: string;
}

const StatCard = ({ icon, value, label, colorClass }: StatCardProps) => (
  <div className={`${colorClass} rounded-xl p-3 flex flex-col gap-1 min-w-0 flex-1`}>
    <span className="text-primary-foreground/80">{icon}</span>
    <span className="text-xl font-bold text-primary-foreground">{value}</span>
    <span className="text-xs text-primary-foreground/80 truncate">{label}</span>
  </div>
);

export default StatCard;
