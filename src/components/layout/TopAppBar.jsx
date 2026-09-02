import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import Icon from '../Icon';
import ThemeToggle from './ThemeToggle';
import { NAV_ITEMS } from './navItems';
import { t } from '../../i18n/strings';

/* Sticky top app bar. On desktop it carries the primary nav; on mobile the nav
 * moves to the bottom bar, so here we only show brand + theme toggle. A subtle
 * shadow appears once the page is scrolled (mirrors the Stitch behaviour). */
export default function TopAppBar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 w-full bg-background/90 backdrop-blur-md transition-shadow ${
        scrolled ? 'shadow-bar' : ''
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-container-max items-center justify-between gap-4 px-4 md:h-20 md:px-margin-page">
        {/* Brand */}
        <NavLink to="/" className="flex items-center gap-3 rounded-lg" aria-label={t.app.name}>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
            <Icon name="account_balance_wallet" className="text-[22px]" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-headline-md text-[18px] font-semibold text-secondary md:text-headline-md">
              {t.app.name}
            </span>
            <span className="hidden font-label-sm text-label-sm font-normal text-on-surface-variant sm:block">
              {t.app.tagline}
            </span>
          </span>
        </NavLink>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-full px-4 py-2 font-label-md transition-colors ${
                  isActive
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-on-surface-variant hover:bg-surface-variant'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} filled={isActive} className="text-[20px]" />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            aria-label={t.nav.openMenu}
            className="hidden h-10 w-10 items-center justify-center rounded-full text-primary transition-colors hover:bg-surface-variant md:flex"
          >
            <Icon name="account_circle" className="text-[24px]" />
          </button>
        </div>
      </div>
    </header>
  );
}
