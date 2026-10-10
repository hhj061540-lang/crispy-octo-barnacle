import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5900;

app.use(express.json());

// VPN State & Mock Data Stores
let vpnState = {
  status: 'disconnected' as 'connected' | 'disconnected' | 'connecting',
  currentCountry: null as string | null,
  currentIp: null as string | null,
  connectedAt: null as number | null,
};

let vpnLogs: string[] = ['[System] VPN daemon initialized on port 5900.'];
let vpnActivities: { id: string; timestamp: string; action: string; details: string }[] = [
  { id: 'act-1', timestamp: new Date().toLocaleTimeString(), action: 'SYSTEM_BOOT', details: 'Service started successfully' }
];

const countries = [
  { code: 'US', name: 'United States', flag: '🇺🇸', load: '24%' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', load: '45%' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', load: '32%' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', load: '18%' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', load: '60%' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', load: '29%' },
  { code: 'FR', name: 'France', flag: '🇫🇷', load: '41%' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', load: '12%' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', load: '55%' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', load: '38%' },
];

// Zod Validation Schema for Connection Payload
const ConnectSchema = z.object({
  countryCode: z.string().length(2, 'CountryCode must be a 2-letter ISO code (e.g., US)'),
});

// 1. Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), port: PORT });
});

// 2. VPN Countries List Endpoint
app.get('/api/vpn/countries', (req, res) => {
  res.json(countries);
});

// 3. VPN Status Endpoint
app.get('/api/vpn/status', (req, res) => {
  res.json(vpnState);
});

// 4. Current IP Endpoint
app.get('/api/vpn/ip', (req, res) => {
  res.json({ ip: vpnState.currentIp || '127.0.0.1 (Local)' });
});

// 5. VPN Activity Endpoint
app.get('/api/vpn/activity', (req, res) => {
  res.json({ activities: vpnActivities });
});

// 6. VPN Logs Endpoint
app.get('/api/vpn/logs', (req, res) => {
  res.json({ logs: vpnLogs });
});

// 7. Testing Sleep Endpoint
app.get('/api/vpn/test/sleep', async (req, res) => {
  const msParam = req.query.ms ? parseInt(req.query.ms as string, 10) : 1000;
  const delay = isNaN(msParam) ? 1000 : Math.min(msParam, 10000);
  await new Promise((resolve) => setTimeout(resolve, delay));
  res.json({ success: true, sleptMs: delay, timestamp: new Date().toISOString() });
});

// 8. Connect VPN Endpoint (Zod Validated)
app.post('/api/vpn/connect', (req, res) => {
  const validation = ConnectSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors[0].message });
  }

  const { countryCode } = validation.data;
  const target = countries.find(c => c.code.toLowerCase() === countryCode.toLowerCase());

  if (!target) {
    return res.status(404).json({ error: 'Specified country node not found.' });
  }

  vpnState.status = 'connected';
  vpnState.currentCountry = target.name;
  vpnState.currentIp = `198.51.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 255)}`;
  vpnState.connectedAt = Date.now();

  const timeStr = new Date().toLocaleTimeString();
  vpnLogs.unshift(`[${timeStr}] Connected to ${target.name} (${target.code}) [IP: ${vpnState.currentIp}]`);
  vpnActivities.unshift({
    id: `act-${Date.now()}`,
    timestamp: timeStr,
    action: 'CONNECT',
    details: `Successfully established tunnel to ${target.name}`
  });

  res.json({ success: true, message: `Connected to ${target.name}`, data: vpnState });
});

// 9. Disconnect VPN Endpoint
app.post('/api/vpn/disconnect', (req, res) => {
  vpnState.status = 'disconnected';
  vpnState.currentCountry = null;
  vpnState.currentIp = null;
  vpnState.connectedAt = null;

  const timeStr = new Date().toLocaleTimeString();
  vpnLogs.unshift(`[${timeStr}] VPN tunnel disconnected.`);
  vpnActivities.unshift({
    id: `act-${Date.now()}`,
    timestamp: timeStr,
    action: 'DISCONNECT',
    details: 'Terminated active secure connection'
  });

  res.json({ success: true, message: 'VPN disconnected successfully', data: vpnState });
});

// Express Static Serving of Vite Build (`dist`)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Frontend build (dist) not found. Run "npm run build".');
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Express] Server running on http://0.0.0.0:${PORT}`);
});
