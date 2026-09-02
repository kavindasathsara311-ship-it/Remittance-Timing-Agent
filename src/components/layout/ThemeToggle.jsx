import { useTheme } from '../../context/ThemeContext';
import Icon from '../Icon';
import { t } from '../../i18n/strings';

/* Sun/moon toggle. Reads the shared ThemeContext so the whole app (including
 * charts) re-colours together. Accessible via aria-label + title. */
export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();
  const label = isDark ? t.theme.toLight : t.theme.toDark;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      className={`flex h-10 w-10 items-center justify-center rounded-full text-primary transition-colors hover:bg-surface-variant active:scale-95 ${className}`}
    >
      <Icon name={isDark ? 'light_mode' : 'dark_mode'} className="text-[22px]" />
    </button>
  );
}
