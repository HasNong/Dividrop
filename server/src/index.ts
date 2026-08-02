import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { getState, resetState, declareDividend, announceDividend, executeDividend, takeSnapshot, onStateChange, syncChipnetIdentifiers, getScheduledDividends } from './state.js';
import { getPastPayments } from './dividend.js';
import { initChipnet, getLiveCompanies, getLiveHoldings, broadcastDividend, initializeHoldings, getDeployment } from './blockchain.js';
import { generateProof } from './merkle.js';
import { login, register, seedUserPasswords } from './auth.js';
import type { AuthPayload } from './types.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;

const distPath = join(__dirname, '..', '..', 'frontend', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
}

const httpServer = createServer(app);

const wss = new WebSocketServer({ server: httpServer });

const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.send(JSON.stringify({ type: 'connected' }));

  ws.on('close', () => {
    clients.delete(ws);
  });
});

const unsub = onStateChange((state) => {
  const message = JSON.stringify({ type: 'stateUpdate', state });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
});

function broadcastState(): void {
  const state = getState();
  const message = JSON.stringify({ type: 'stateUpdate', state });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

app.get('/api/state', (_req, res) => {
  res.json({ success: true, state: getState() });
});

app.post('/api/auth', async (req, res) => {
  const { username, password } = req.body as AuthPayload;
  if (!username || !password) {
    res.status(400).json({ success: false, error: 'Username and password required' });
    return;
  }
  const result = await login(username, password);
  if (!result.success) { res.status(401).json(result); return; }
  res.json(result);
});

app.post('/api/register', async (req, res) => {
  const { role, username, password, fullName, companyId } = req.body as AuthPayload;
  if (!role || !username || !password || !fullName) {
    res.status(400).json({ success: false, error: 'All fields required' });
    return;
  }
  if (role !== 'company' && role !== 'shareholder') {
    res.status(400).json({ success: false, error: 'Role must be company or shareholder' });
    return;
  }
  const result = await register(role, username, fullName, password, companyId);
  if (!result.success) { res.status(400).json(result); return; }
  res.json(result);
});

app.post('/api/dividend', (req, res) => {
  const { companyId, rate, announcementDate, recordDate, distributionDate } = req.body as {
    companyId: string;
    rate: number;
    announcementDate?: string;
    recordDate?: string;
    distributionDate?: string;
  };
  if (!companyId || typeof rate !== 'number') {
    res.status(400).json({ success: false, error: 'companyId and rate required' });
    return;
  }

  const result = declareDividend(companyId, rate, announcementDate, recordDate, distributionDate);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  // ensure all connected clients get the latest state
  setTimeout(() => broadcastState(), 50);

  res.json(result);
});

app.post('/api/reset', (_req, res) => {
  resetState();
  setTimeout(() => broadcastState(), 50);
  res.json({ success: true });
});

app.post('/api/dividend/announce', (req, res) => {
  const { companyId, rate, announcementDate, recordDate, distributionDate, distributionTime } = req.body as {
    companyId: string; rate: number; announcementDate: string; recordDate: string; distributionDate: string; distributionTime?: string;
  };
  if (!companyId || typeof rate !== 'number') {
    res.status(400).json({ success: false, error: 'companyId and rate required' });
    return;
  }
  const result = announceDividend(companyId, rate, announcementDate, recordDate, distributionDate, distributionTime);
  if (!result.success) { res.status(400).json(result); return; }
  setTimeout(() => broadcastState(), 50);
  res.json(result);
});

app.post('/api/dividend/execute', async (req, res) => {
  const { roundId } = req.body as { roundId: number };
  const round = getState().dividends.find((d) => d.id === roundId);
  if (!round) { res.status(404).json({ success: false, error: 'Round not found' }); return; }
  const bcResult = await broadcastDividend(round.companyId, round.rate);
  if (!bcResult.success) { res.status(400).json({ success: false, error: `Chain error: ${bcResult.error}` }); return; }
  const result = executeDividend(roundId, bcResult.round.txid);
  if (!result.success) { res.status(400).json(result); return; }
  setTimeout(() => broadcastState(), 50);
  res.json(result);
});

app.post('/api/dividend/snapshot', (req, res) => {
  const { roundId } = req.body as { roundId: number };
  const result = takeSnapshot(roundId);
  if (!result.success) { res.status(400).json(result); return; }
  setTimeout(() => broadcastState(), 50);
  res.json(result);
});

app.get('/api/verify/:roundId/:holderLabel', (req, res) => {
  const roundId = Number(req.params.roundId);
  const holderLabel = req.params.holderLabel;
  const state = getState();
  const round = state.dividends.find((d) => d.id === roundId);
  if (!round || !round.snapshot) {
    res.status(404).json({ success: false, error: 'Dividend or snapshot not found' });
    return;
  }
  const leaves = Object.entries(round.snapshot).map(([label, shares]) => ({ label, shares }));
  const proof = generateProof(leaves, holderLabel);
  if (!proof) {
    res.status(404).json({ success: false, error: `Holder "${holderLabel}" not found in snapshot` });
    return;
  }
  res.json({ success: true, proof, tree: proof.siblings.map(s =>
    `${s.direction}:${s.hash.substring(0, 12)}`
  )});
});

app.post('/api/init/:companyId', async (req, res) => {
  try {
    const result = await initializeHoldings(req.params.companyId);
    if (!result.success) { res.status(400).json(result); return; }
    res.json(result);
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/payments/:holderIndex/:companyId', (req, res) => {
  const holderIndex = Number(req.params.holderIndex);
  const { companyId } = req.params;

  const state = getState();
  const holder = state.shareholders[holderIndex];
  if (!holder) {
    res.status(404).json({ success: false, error: 'Holder not found' });
    return;
  }

  const payments = getPastPayments(holder, companyId, state.dividends);
  res.json({ success: true, payments });
});

app.get('/api/state/live', async (_req, res) => {
  try {
    const companies = await getLiveCompanies();
    res.json({ success: true, companies });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/holdings/:companyId', async (req, res) => {
  try {
    const holdings = await getLiveHoldings(req.params.companyId);
    res.json({ success: true, holdings });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

if (existsSync(distPath)) {
  app.get('/{*path}', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

httpServer.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`WebSocket ready`);

  const ok = await initChipnet();
  if (!ok) { console.error('FATAL: Cannot connect to chipnet. Run genesis first.'); process.exit(1); }
  const deployment = getDeployment();
  if (deployment) syncChipnetIdentifiers(deployment);
  await seedUserPasswords();
  console.log(`Chipnet mode active — live blockchain data`);

  if (existsSync(distPath)) {
    console.log(`Serving frontend from ${distPath}`);
  } else {
    console.log(`Frontend not built — run "npm run frontend:build" first`);
  }

  const failedDividends = new Set<number>();

  setInterval(async () => {
    const due = getScheduledDividends();
    for (const d of due) {
      if (failedDividends.has(d.id)) continue;
      const bcResult = await broadcastDividend(d.companyId, d.rate);
      if (!bcResult.success) {
        failedDividends.add(d.id);
        console.log(`[Scheduler] Dividend #${d.id} failed — won't retry`);
        continue;
      }
      const result = executeDividend(d.id, bcResult.round.txid);
      if (result.success) console.log(`[Scheduler] Auto-executed dividend #${d.id} for ${d.companyId}`);
    }
  }, 60_000);
});
