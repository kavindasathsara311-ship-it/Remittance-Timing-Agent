import { useCallback, useEffect, useRef, useState } from 'react';

/* =============================================================================
 * useAsync — tiny data hook so pages/components don't repeat loading & error
 * plumbing. Pass a function returning a promise and a (fixed-length) deps array.
 *
 *   const { data, loading, error, reload } = useAsync(
 *     () => getRecommendation(pair),
 *     [pair]
 *   );
 *
 * Guards against out-of-order responses when deps change quickly.
 * ===========================================================================*/
export function useAsync(asyncFn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [nonce, setNonce] = useState(0);

  // Keep the latest callback without forcing re-runs on identity changes.
  const fnRef = useRef(asyncFn);
  fnRef.current = asyncFn;

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));

    Promise.resolve()
      .then(() => fnRef.current())
      .then((data) => {
        if (alive) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (alive) setState({ data: null, loading: false, error });
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { ...state, reload };
}

export default useAsync;
