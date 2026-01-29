interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header>
      <h1>{title}</h1>
      {subtitle && (
        <div className="session-info">
          <span>{subtitle}</span>
        </div>
      )}
    </header>
  );
}
