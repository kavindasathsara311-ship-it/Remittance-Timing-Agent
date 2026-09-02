import TopAppBar from './TopAppBar';
import BottomNavBar from './BottomNavBar';
import { t } from '../../i18n/strings';
import { USE_MOCK_DATA } from '../../services/api';

/* AppShell — the persistent frame around every page: top bar, content well,
 * a small trust/disclaimer footer, and the mobile bottom nav. */
export default function AppShell({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopAppBar />

      <main
        id="main"
        className="mx-auto w-full max-w-container-max flex-1 px-4 pt-4 pb-10 md:px-margin-page md:pt-6 md:pb-12"
      >
        {children}
      </main>

      <footer className="mx-auto w-full max-w-container-max px-4 pb-28 md:px-margin-page md:pb-10">
        <div className="flex flex-col gap-2 border-t border-outline-variant/40 pt-4">
          <p className="max-w-3xl font-label-sm text-label-sm font-normal text-on-surface-variant">
            {t.footer.disclaimer}
          </p>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-label-sm text-label-sm ${
                USE_MOCK_DATA
                  ? 'bg-wait-container text-on-wait-container'
                  : 'bg-good-container text-on-good-container'
              }`}
              title={USE_MOCK_DATA ? 'USE_MOCK_DATA = true' : 'Live backend'}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  USE_MOCK_DATA ? 'bg-wait' : 'bg-good'
                }`}
              />
              {USE_MOCK_DATA ? t.common.dataSource : t.common.liveData}
            </span>
          </div>
        </div>
      </footer>

      <BottomNavBar />
    </div>
  );
}
