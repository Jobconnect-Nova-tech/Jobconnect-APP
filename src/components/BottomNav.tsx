import { ReactNode } from "react";

interface BottomNavProps {
  items: { icon: ReactNode; label: string; active?: boolean; onClick?: () => void; badge?: number }[];
}

const BottomNav = ({ items }: BottomNavProps) => (
  <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border safe-bottom z-50">
    <div className="flex justify-around items-stretch h-16 max-w-lg mx-auto">
      {items.map((item, i) => (
        <button
          key={i}
          onClick={item.onClick}
          className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 px-2 transition-all ${
            item.active ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
          aria-current={item.active ? "page" : undefined}
        >
          {item.active && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full bg-primary" />
          )}
          <div className="relative">
            {item.icon}
            {item.badge !== undefined && item.badge > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                {item.badge > 9 ? "9+" : item.badge}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
        </button>
      ))}
    </div>
  </nav>
);

export default BottomNav;
