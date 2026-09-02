import { t } from '../../i18n/strings';

/* Single source of truth for navigation, shared by the desktop top bar and the
 * mobile bottom bar. `end` makes "/" only active on the exact dashboard route. */
export const NAV_ITEMS = [
  { to: '/', label: t.nav.home, icon: 'home', end: true },
  { to: '/coach', label: t.nav.coach, icon: 'chat_bubble', end: false },
  { to: '/channels', label: t.nav.channels, icon: 'compare_arrows', end: false },
  { to: '/history', label: t.nav.history, icon: 'history', end: false },
];

export default NAV_ITEMS;
