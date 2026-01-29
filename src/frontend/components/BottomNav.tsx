import type { PageType } from '../store/uiStore';
import '../styles/BottomNav.css';

interface BottomNavProps {
  activePage: PageType;
  onNavigate: (page: PageType) => void;
  isOwner: boolean;
  draftCount: number;
}

export function BottomNav({ activePage, onNavigate, isOwner, draftCount }: BottomNavProps) {
  if (activePage === 'start') return null;

  const navItems = [
    ...(isOwner ? [{
      id: 'lab' as PageType,
      label: 'Lab',
      icon: '🧪',
      badge: draftCount > 0 ? draftCount : undefined,
    }] : []),
    ...(!isOwner ? [{
      id: 'quiz' as PageType,
      label: 'Quiz',
      icon: '✓',
    }] : []),
    {
      id: 'lobby' as PageType,
      label: 'Lobby',
      icon: '👥',
    },
    {
      id: 'vybes' as PageType,
      label: 'Vybes',
      icon: '✨',
    },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className={`nav-item ${activePage === item.id ? 'active' : ''}`}
        >
          <div className="nav-icon">
            <span>{item.icon}</span>
            {item.badge && <span className="nav-badge">{item.badge}</span>}
          </div>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
