// Sidebar navigation component
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/',                label: 'Dashboard'         },
  { path: '/predict',         label: 'Predict Claim'     },
  { path: '/profiles',        label: 'Risk Profiles'     },
  { path: '/explainability',  label: 'Explainability'    },
  { path: '/performance',     label: 'Model Performance' },
  { path: '/explorer',        label: 'Data Explorer'     },
];

export default function Sidebar() {
  return (
    <aside
      className="fixed top-0 left-0 h-full w-52 bg-sidebar flex flex-col z-30"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <span className="text-white font-bold text-lg tracking-tight">InsureSight</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map(({ path, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item-active' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    isActive ? 'bg-accent' : 'bg-transparent'
                  }`}
                  aria-hidden="true"
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-xs text-slate-500">Sample data for demonstration</p>
      </div>
    </aside>
  );
}
