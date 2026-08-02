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
        clearTimeout(timeout); ws = socket;
        socket.onmessage = (event) => {
          try { const data = JSON.parse(event.data); if (data.type === 'stateUpdate' && data.state) for (const cb of onStateChangeCallbacks) cb(data.state); } catch {}
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

export async function fetchState() { const res = await fetch('/api/state'); return (await res.json()).state; }
export async function executeDividend(roundId: number) { return (await fetch('/api/dividend/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roundId }) })).json(); }
export async function initializeHoldings(companyId: string) { return (await fetch(`/api/init/${companyId}`, { method: 'POST' })).json(); }
export async function verifyDividend(roundId: number, holderLabel: string) { return (await fetch(`/api/verify/${roundId}/${encodeURIComponent(holderLabel)}`)).json(); }
export async function resetState() { await fetch('/api/reset', { method: 'POST' }); }

export async function declareDividend(
  companyId: string, rate: number,
  announcementDate?: string, recordDate?: string, distributionDate?: string, distributionTime?: string,
) {
  return (await fetch('/api/dividend/announce', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyId, rate, announcementDate, recordDate, distributionDate, distributionTime }) })).json();
}

export async function loginUser(username: string, password: string) {
  return (await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })).json();
}

export async function registerUser(
  role: 'company' | 'shareholder', username: string, fullName: string, password: string, companyId?: string,
) {
  return (await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role, username, fullName, password, companyId }) })).json();
}
