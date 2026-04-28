import { Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { ChevronDown, ChevronRight, LayoutGrid, FileText, Users, Building2, LogOut, BookOpen } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useMySites } from '../../hooks/useSite';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { data: sites } = useMySites();
  const [expandedSite, setExpandedSite] = useState<string | null>(null);

  if (!user) return null;
  const isProgram = ['PROGRAM_MANAGER', 'PMO', 'ADMIN'].includes(user.role);
  const isAdmin = user.role === 'ADMIN';
  const isAdminOrPM = isAdmin || user.role === 'PROGRAM_MANAGER';

  const linkBase =
    'block px-4 py-2 text-sm rounded transition-colors';
  const linkActive = 'bg-prj text-white';
  const linkInactive = 'text-gray-300 hover:bg-white/5';

  return (
    <aside className="w-60 bg-dark text-white h-full flex flex-col flex-shrink-0">
      <div className="p-5 border-b border-white/10">
        <Link to="/" className="block">
          <div className="font-bold text-base">TIS CommPlatform</div>
          <div className="text-xs text-gray-400">D365 Rollout</div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
        {isProgram && (
          <div>
            <div className="px-3 mb-2 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              Program
            </div>
            <NavLink to="/dashboard" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive} flex items-center gap-2`}>
              <LayoutGrid size={14} /> Dashboard
            </NavLink>
          </div>
        )}

        <div>
          <div className="px-3 mb-2 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
            Sites
          </div>
          {(sites || []).map((s) => (
            <div key={s.code}>
              <button
                className={`${linkBase} ${linkInactive} w-full flex items-center justify-between text-left`}
                onClick={() => setExpandedSite(expandedSite === s.code ? null : s.code)}
              >
                <span className="flex items-center gap-2">
                  <Building2 size={14} /> {s.name}
                </span>
                {expandedSite === s.code ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {expandedSite === s.code && (
                <div className="ml-4 mt-1 space-y-0.5">
                  {[
                    { tab: 'overview', label: 'Overview' },
                    { tab: 'calendar', label: 'Calendar' },
                    { tab: 'report', label: 'Weekly Report' },
                    { tab: 'risks', label: 'Risks' },
                    { tab: 'stakeholders', label: 'Stakeholders' },
                    { tab: 'milestones', label: 'Milestones' },
                    { tab: 'escalations', label: 'Escalations' },
                    { tab: 'kpis', label: 'KPIs' },
                  ].map((t) => (
                    <NavLink
                      key={t.tab}
                      to={`/sites/${s.code}/${t.tab}`}
                      className={({ isActive }) => `block px-3 py-1.5 text-xs rounded ${isActive ? 'bg-prj/40 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                      {t.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div>
          <div className="px-3 mb-2 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
            Templates
          </div>
          <NavLink to="/templates" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive} flex items-center gap-2`}>
            <BookOpen size={14} /> Template Catalogue
          </NavLink>
        </div>

        {isAdminOrPM && (
          <div>
            <div className="px-3 mb-2 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              Admin
            </div>
            {isAdmin && (
              <NavLink to="/admin/users" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive} flex items-center gap-2`}>
                <Users size={14} /> Users
              </NavLink>
            )}
            <NavLink to="/admin/sites" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive} flex items-center gap-2`}>
              <FileText size={14} /> Sites
            </NavLink>
          </div>
        )}
      </nav>

      <div className="border-t border-white/10 p-4 text-xs">
        <div className="font-semibold">{user.name}</div>
        <div className="text-gray-400 mb-2">{user.role.replace(/_/g, ' ')}</div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-gray-300 hover:text-white"
        >
          <LogOut size={12} /> Log out
        </button>
      </div>
    </aside>
  );
}
