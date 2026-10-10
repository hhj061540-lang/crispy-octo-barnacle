import React, { useEffect, useState } from 'react';
import NotFound from './pages/notfound';

interface Country {
  code: string;
  name: string;
  flag: string;
  load: string;
}

interface VpnStatus {
  status: 'connected' | 'disconnected' | 'connecting';
  currentCountry: string | null;
  currentIp: string | null;
  connectedAt: number | null;
}

interface ActivityItem {
  id: string;
  timestamp: string;
  action: string;
  details: string;
}

export default function App() {
  const [route] = useState(window.location.pathname);
  const [countries, setCountries] = useState<Country[]>([]);
  const [vpnStatus, setVpnStatus] = useState<VpnStatus>({ status: 'disconnected', currentCountry: null, currentIp: null, connectedAt: null });
  const [currentIp, setCurrentIp] = useState<string>('Checking...');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('US');
  const [error, setError] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState<string>('00:00:00');

  const fetchAllData = async () => {
    try {
      const [statusRes, countriesRes, ipRes, activityRes, logsRes] = await Promise.all([
        fetch('/api/vpn/status'),
        fetch('/api/vpn/countries'),
        fetch('/api/vpn/ip'),
        fetch('/api/vpn/activity'),
        fetch('/api/vpn/logs')
      ]);

      if (statusRes.ok) setVpnStatus(await statusRes.json());
      if (countriesRes.ok) setCountries(await countriesRes.json());
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        setCurrentIp(ipData.ip);
      }
      if (activityRes.ok) {
        const actData = await activityRes.json();
        setActivities(actData.activities);
      }
      if (logsRes.ok) {
        const logData = await logsRes.json();
        setLogs(logData.logs);
      }
    } catch (e) {
      console.error('Data poll error:', e);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Connection Duration Timer Ticker
  useEffect(() => {
    if (vpnStatus.status === 'connected' && vpnStatus.connectedAt) {
      const timerInterval = setInterval(() => {
        const diffMs = Date.now() - vpnStatus.connectedAt!;
        const totalSecs = Math.floor(diffMs / 1000);
        const hrs = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
        const mins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
        const secs = String(totalSecs % 60).padStart(2, '0');
        setSessionDuration(`${hrs}:${mins}:${secs}`);
      }, 1000);
      return () => clearInterval(timerInterval);
    } else {
      setSessionDuration('00:00:00');
    }
  }, [vpnStatus.status, vpnStatus.connectedAt]);

  const handleConnect = async () => {
    setError(null);
    try {
      const res = await fetch('/api/vpn/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode: selectedCountry }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Connection failed.');
      } else {
        setVpnStatus(data.data);
      }
    } catch (e) {
      setError('Network transmission failed.');
    }
  };

  const handleDisconnect = async () => {
    setError(null);
    try {
      const res = await fetch('/api/vpn/disconnect', { method: 'POST' });
      const data = await res.json();
      setVpnStatus(data.data);
    } catch (e) {
      setError('Network transmission failed.');
    }
  };

  if (route !== '/') {
    return <NotFound />;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🛡️ Enterprise VPN Security Dashboard</h1>
        <span style={styles.portBadge}>Port: 5900</span>
      </header>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <div style={styles.grid}>
        {/* Connection Control Panel */}
        <div style={styles.card}>
          <h2>Connection Manager</h2>
          <div style={styles.statusBox}>
            <span style={{
              ...styles.dot,
              backgroundColor: vpnStatus.status === 'connected' ? '#2ecc71' : '#e74c3c'
            }} />
            <span style={styles.statusText}>{vpnStatus.status.toUpperCase()}</span>
          </div>

          <div style={styles.metaRow}>
            <span><strong>Active Node:</strong> {vpnStatus.currentCountry || 'None'}</span>
            <span><strong>External IP:</strong> {currentIp}</span>
            {vpnStatus.status === 'connected' && (
              <span><strong>Connection Time:</strong> <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{sessionDuration}</span></span>
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Select Server Region (10 Available):</label>
            <select
              style={styles.select}
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name} (Load: {c.load})
                </option>
              ))}
            </select>

            {vpnStatus.status === 'connected' ? (
              <button style={styles.disconnectBtn} onClick={handleDisconnect}>
                Disconnect Tunnel
              </button>
            ) : (
              <button style={styles.connectBtn} onClick={handleConnect}>
                Establish Connection
              </button>
            )}
          </div>
        </div>

        {/* Activity & System Logs Panel */}
        <div style={styles.card}>
          <h2>VPN Activity Audit</h2>
          <div style={styles.auditBox}>
            {activities.map((act) => (
              <div key={act.id} style={styles.auditItem}>
                <span style={styles.timestamp}>[{act.timestamp}]</span>
                <span style={styles.actionTag}>{act.action}</span>
                <span style={styles.details}>{act.details}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Raw Logs Stream */}
      <div style={{ ...styles.card, marginTop: '1.5rem' }}>
        <h3>Daemon Logs Stream</h3>
        <div style={styles.logsConsole}>
          {logs.map((log, idx) => (
            <div key={idx}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem', color: '#222' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ddd', paddingBottom: '1rem', marginBottom: '1.5rem' },
  title: { fontSize: '1.4rem', margin: 0 },
  portBadge: { background: '#2c3e50', color: '#fff', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', fontFamily: 'JetBrains Mono, monospace' },
  errorBanner: { background: '#f8d7da', color: '#721c24', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', border: '1px solid #f5c6cb' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' },
  card: { background: '#fdfdfd', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e1e1e1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  statusBox: { display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1rem 0', fontSize: '1.1rem', fontWeight: 'bold' },
  dot: { width: '12px', height: '12px', borderRadius: '50%' },
  statusText: { letterSpacing: '0.5px' },
  metaRow: { background: '#f1f2f6', padding: '0.75rem', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.9rem', marginBottom: '1rem' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  label: { fontSize: '0.85rem', fontWeight: 600 },
  select: { padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.95rem', fontFamily: 'Inter, sans-serif' },
  connectBtn: { background: '#27ae60', color: '#fff', border: 'none', padding: '0.75rem', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' },
  disconnectBtn: { background: '#c0392b', color: '#fff', border: 'none', padding: '0.75rem', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' },
  auditBox: { background: '#fafafa', border: '1px solid #ddd', borderRadius: '4px', height: '210px', overflowY: 'auto', padding: '0.5rem', fontSize: '0.8rem' },
  auditItem: { marginBottom: '0.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.3rem', display: 'flex', gap: '0.5rem', alignItems: 'center' },
  timestamp: { color: '#666', fontFamily: 'JetBrains Mono, monospace' },
  actionTag: { background: '#3498db', color: '#fff', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.7rem', fontWeight: 'bold' },
  details: { color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  logsConsole: { background: '#111', color: '#00ffcc', padding: '0.75rem', borderRadius: '4px', height: '140px', overflowY: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }
};
