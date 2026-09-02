import { NavLink } from 'react-router-dom';
import Icon from '../Icon';
import { NAV_ITEMS } from './navItems';

/* Mobile-only bottom navigation (hidden from md up). Active item gets the teal
 * pill treatment from the design; icons fill when selected. */
export default function BottomNavBar() {
  return (
    <nav
      className="fixed bottom-0 left-0 z-50 flex w-full items-stretch justify-around rounded-t-xl bg-surface-container-lowest px-2 py-2 shadow-[0px_-4px_20px_rgba(27,38,49,0.08)] md:hidden"
      aria-label="Primary"
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex min-w-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-full px-2 py-1.5 transition-colors ${
              isActive
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant hover:bg-surface-variant'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon name={item.icon} filled={isActive} className="text-[22px]" />
              <span className="font-label-sm text-label-sm">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
