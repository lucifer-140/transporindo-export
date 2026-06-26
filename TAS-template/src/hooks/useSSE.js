import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useSSE() {
  const queryClient = useQueryClient();
  const retryDelay = useRef(1000);

  useEffect(() => {
    let es;
    let retryTimer;
    let active = true;

    function connect() {
      es = new EventSource('/api/events', { withCredentials: true });

      es.addEventListener('invalidate', (e) => {
        const keys = JSON.parse(e.data);
        for (const key of keys) {
          queryClient.invalidateQueries({ queryKey: [key] });
        }
        retryDelay.current = 1000;
      });

      es.onopen = () => { retryDelay.current = 1000; };

      es.onerror = () => {
        es.close();
        if (!active) return;
        retryTimer = setTimeout(() => {
          retryDelay.current = Math.min(retryDelay.current * 2, 30000);
          connect();
        }, retryDelay.current);
      };
    }

    connect();

    return () => {
      active = false;
      clearTimeout(retryTimer);
      es?.close();
    };
  }, [queryClient]);
}
