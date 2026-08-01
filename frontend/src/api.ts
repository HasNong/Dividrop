let ws: WebSocket | null = null;
let onStateChangeCallbacks: Array<(state: any) => void> = [];

export async function initServer(): Promise<boolean> {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  return new Promise((resolve) => {
    try {
      const socket = new WebSocket(wsUrl);
      const timeout = setTimeout(() => { socket.close(); resolve(false); }, 3000);

      socket.onopen = () => {
        clearTimeout(timeout);
        ws = socket;

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'stateUpdate' && data.state) {
              for (const cb of onStateChangeCallbacks) cb(data.state);
            }
          } catch {}
        };

        socket.onclose = () => { ws = null; setTimeout(() => initServer(), 2000); };
        resolve(true);
      };

      socket.onerror = () => { clearTimeout(timeout); resolve(false); };
    } catch { resolve(false); }
  });
}

export function onServerStateChange(cb: (state: any) => void): () => void {
  onStateChangeCallbacks.push(cb);
  return () => { onStateChangeCallbacks = onStateChangeCallbacks.filter((c) => c !== cb); };
}

export async function fetchState() {
  const res = await fetch('/api/state');
  const json = await res.json();
  return json.state;
}

export async function declareDividend(
  companyId: string, rate: number,
  announcementDate?: string, recordDate?: string, distributionDate?: string, distributionTime?: string,
) {
  const res = await fetch('/api/dividend/announce', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId, rate, announcementDate, recordDate, distributionDate, distributionTime }),
  });
  return res.json();
}

export async function executeDividend(roundId: number) {
  const res = await fetch('/api/dividend/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundId }),
  });
  return res.json();
}

export async function initializeHoldings(companyId: string) {
  const res = await fetch(`/api/init/${companyId}`, { method: 'POST' });
  return res.json();
}

export async function verifyDividend(roundId: number, holderLabel: string) {
  const res = await fetch(`/api/verify/${roundId}/${encodeURIComponent(holderLabel)}`);
  return res.json();
}

export async function resetState() {
  await fetch('/api/reset', { method: 'POST' });
}
