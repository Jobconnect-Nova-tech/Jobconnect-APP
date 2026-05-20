import logo from "@/assets/logo.png";

interface AuthHeaderProps {
  title: string;
  subtitle?: string;
}

const AuthHeader = ({ title, subtitle }: AuthHeaderProps) => {
  return (
    <div className="flex flex-col items-center mb-5 sm:mb-6">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <img
          src={logo}
          alt="JobConnect"
          width={32}
          height={32}
          className="rounded-lg shadow-card sm:w-9 sm:h-9"
        />
        <span className="text-sm sm:text-base font-bold text-foreground tracking-tight">
          JobConnect
        </span>
      </div>
      <h1 className="text-lg sm:text-xl font-bold text-foreground text-center leading-tight px-2">
        {title}
      </h1>
      {subtitle && (
        <p className="text-[11px] sm:text-xs text-muted-foreground text-center mt-1 sm:mt-1.5 max-w-[240px] sm:max-w-[260px] leading-snug">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default AuthHeader;
