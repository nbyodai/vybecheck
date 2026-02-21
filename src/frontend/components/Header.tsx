interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="bg-gradient-to-br from-vybe-blue to-vybe-purple pt-[60px] pb-6 px-5 flex-shrink-0 shadow-[0_2px_20px_rgba(83,157,192,0.3)]">
      <h1 className="m-0 mb-3 text-white text-[32px] font-bold tracking-tight">{title}</h1>
      {subtitle && (
        <div className="flex flex-wrap gap-2 items-center text-[13px] text-white/95">
          <span className="bg-white/20 py-1.5 px-3 rounded-xl backdrop-blur-sm font-medium">{subtitle}</span>
        </div>
      )}
    </header>
  );
}
