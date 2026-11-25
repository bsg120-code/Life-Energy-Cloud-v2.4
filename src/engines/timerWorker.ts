// Background Precision Timer Worker for Life Energy Cloud (Blob URL inline worker + fallback)

export interface TimerWorkerHandle {
  stop: () => void;
}

export function createPrecisionTimerWorker(
  onTick: (timestamp: number) => void,
  interval = 1000
): TimerWorkerHandle {
  if (
    typeof Worker !== 'undefined' &&
    typeof Blob !== 'undefined' &&
    typeof URL.createObjectURL === 'function'
  ) {
    try {
      const workerCode = `
        let timerId = null;

        self.onmessage = function (e) {
          const { action, interval = 1000 } = e.data || {};

          if (action === 'start') {
            if (timerId !== null) clearInterval(timerId);
            timerId = setInterval(() => {
              self.postMessage({ type: 'tick', timestamp: Date.now() });
            }, interval);
          } else if (action === 'stop') {
            if (timerId !== null) {
              clearInterval(timerId);
              timerId = null;
            }
          }
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      const worker = new Worker(blobUrl);

      worker.onmessage = (e: MessageEvent<{ type?: string; timestamp?: number }>) => {
        if (e.data?.type === 'tick') {
          onTick(e.data.timestamp ?? Date.now());
        }
      };

      worker.postMessage({ action: 'start', interval });

      return {
        stop: () => {
          worker.postMessage({ action: 'stop' });
          worker.terminate();
          URL.revokeObjectURL(blobUrl);
        },
      };
    } catch {
      // Fall back to setInterval below
    }
  }

  const intervalId = window.setInterval(() => {
    onTick(Date.now());
  }, interval);

  return {
    stop: () => {
      window.clearInterval(intervalId);
    },
  };
}
