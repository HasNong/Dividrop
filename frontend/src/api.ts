let ws: WebSocket | null = null;
let serverAvailable = false;
let liveMode = false;
let onStateChangeCallbacks: Array<(state: any) => void> = [];

export async function initServer(): Promise<boolean> {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  return new Promise((resolve) => {
    try {
      const socket = new WebSocket(wsUrl);
      const timeout = setTimeout(() => {
        socket.close();
        serverAvailable = false;
        resolve(false);
      }, 3000);

      socket.onopen = () => {
        clearTimeout(timeout);
        serverAvailable = true;
        ws = socket;

        fetch('/api/mode')
          .then((r) => r.json())
          .then((data) => {
            liveMode = data.live === true;
          })
          .catch(() => {});

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'stateUpdate' && data.state) {
              for (const cb of onStateChangeCallbacks) {
                cb(data.state);
              }
            }
          } catch {}
        };

        socket.onclose = () => {
          ws = null;
          setTimeout(() => initServer(), 2000);
        };

        resolve(true);
      };

      socket.onerror = () => {
        clearTimeout(timeout);
        serverAvailable = false;
        resolve(false);
      };
    } catch {
      serverAvailable = false;
      resolve(false);
    }
  });
}

export function onServerStateChange(cb: (state: any) => void): () => void {
  onStateChangeCallbacks.push(cb);
  return () => {
    onStateChangeCallbacks = onStateChangeCallbacks.filter((c) => c !== cb);
  };
}

export async function fetchState() {
  if (!serverAvailable) throw new Error('Server not available');
  const res = await fetch('/api/state');
  const json = await res.json();
  return json.state;
}

export async function declareDividend(
  companyId: string,
  rate: number,
  announcementDate?: string,
  recordDate?: string,
  distributionDate?: string,
  distributionTime?: string,
) {
  if (!serverAvailable) throw new Error('Server not available');
  const endpoint = liveMode ? '/api/dividend/announce' : '/api/dividend/announce';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId, rate, announcementDate, recordDate, distributionDate, distributionTime }),
  });
  return res.json();
}

export async function executeDividend(roundId: number) {
  if (!serverAvailable) throw new Error('Server not available');
  const res = await fetch('/api/dividend/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundId }),
  });
  return res.json();
}

export async function initializeHoldings(companyId: string) {
  if (!serverAvailable || !liveMode) throw new Error('Chipnet mode required');
  const res = await fetch(`/api/init/${companyId}`, { method: 'POST' });
  return res.json();
}

export async function snapshotDividend(roundId: number) {
  if (!serverAvailable) throw new Error('Server not available');
  const res = await fetch('/api/dividend/snapshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundId }),
  });
  return res.json();
}

export async function verifyDividend(roundId: number, holderLabel: string) {
  if (!serverAvailable) throw new Error('Server not available');
  const res = await fetch(`/api/verify/${roundId}/${encodeURIComponent(holderLabel)}`);
  return res.json();
}

export async function resetState() {
  if (!serverAvailable) return;
  await fetch('/api/reset', { method: 'POST' });
}

export function isServerAvailable() {
  return serverAvailable;
}

export function isLiveMode() {
  return liveMode;
}
