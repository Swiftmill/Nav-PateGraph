import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

type TabModel = {
  id: string;
  title: string;
  url: string;
  favicon?: string | null;
  isActive: boolean;
  group?: string | null;
};

type Download = {
  url: string;
  filename: string;
  receivedBytes: number;
  totalBytes: number;
  state: string;
  paused: boolean;
  savePath: string;
};

type Note = { id: string; content: string; updatedAt: string };
type Session = { id: string; name: string; createdAt: string; tabs: TabModel[] };

const sidebarItems = [
  { id: 'history', label: 'Historique', icon: '🕘' },
  { id: 'downloads', label: 'Téléchargements', icon: '⬇️' },
  { id: 'notes', label: 'Notes', icon: '📝' },
  { id: 'sessions', label: 'Sessions', icon: '🗂️' },
  { id: 'settings', label: 'Réglages', icon: '⚙️' }
];

const App: React.FC = () => {
  const [tabs, setTabs] = useState<TabModel[]>([]);
  const [address, setAddress] = useState('');
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [mode, setMode] = useState<'normal' | 'gaming' | 'focus'>('normal');
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [vpnServers, setVpnServers] = useState<{ id: string; name: string }[]>([]);
  const [vpnEnabled, setVpnEnabled] = useState(false);
  const [sidebar, setSidebar] = useState('history');
  const [config, setConfig] = useState<any>(null);
  const [metrics, setMetrics] = useState(() => window.pg.system.metrics());
  const [splitSelection, setSplitSelection] = useState<{ primary: string | null; secondary: string | null }>({
    primary: null,
    secondary: null
  });

  const activeTab = useMemo(() => tabs.find((tab) => tab.isActive) ?? null, [tabs]);

  useEffect(() => {
    window.pg.tabs.onUpdate((nextTabs) => {
      const typed = nextTabs as TabModel[];
      setTabs(typed);
      const current = typed.find((tab) => tab.isActive);
      if (current) {
        setAddress(current.url);
      }
      setSplitSelection((prev) => {
        const nextSelection = {
          primary: typed.find((tab) => tab.id === prev.primary) ? prev.primary : null,
          secondary: typed.find((tab) => tab.id === prev.secondary) ? prev.secondary : null
        };
        if (nextSelection.primary !== prev.primary || nextSelection.secondary !== prev.secondary) {
          window.pg.tabs.setSplit(nextSelection);
        }
        return nextSelection;
      });
    });
    window.pg.downloads.onUpdate((items) => setDownloads(items as Download[]));
    refreshConfig();
    refreshNotes();
    refreshSessions();
    loadVpnState();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => refreshSessions(), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setMetrics(window.pg.system.metrics()), 2000);
    return () => clearInterval(interval);
  }, []);

  async function refreshConfig() {
    const cfg = await window.pg.config.get();
    setConfig(cfg);
    setVpnEnabled(cfg.vpn.enabled);
    setVpnServers(cfg.vpn.servers ?? []);
  }

  async function refreshNotes() {
    const list = (await window.pg.notes.list()) as Note[];
    setNotes(list);
    if (list.length > 0) {
      setActiveNote(list[0]);
    }
  }

  async function refreshSessions() {
    const list = (await window.pg.sessions.list()) as Session[];
    setSessions(list);
  }

  async function loadVpnState() {
    const cfg = await window.pg.config.get();
    setVpnEnabled(cfg.vpn.enabled);
    setVpnServers(cfg.vpn.servers ?? []);
  }

  const handleAddressSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeTab) return;
    const url = normalizeUrl(address, config);
    window.pg.tabs.updateUrl({ id: activeTab.id, url });
  };

  const handleAddTab = () => window.pg.tabs.create();

  const handleCloseTab = (id: string) => window.pg.tabs.close(id);

  const handleMode = (next: 'normal' | 'gaming' | 'focus') => {
    setMode(next);
    window.pg.focus.setMode(next);
  };

  const handleVpnToggle = async () => {
    const next = !vpnEnabled;
    setVpnEnabled(next);
    await window.pg.config.set({ vpn: { enabled: next } });
    if (next) {
      await window.pg.vpn.apply();
    } else {
      await window.pg.vpn.disable();
    }
  };

  const handleNoteSave = async (content: string) => {
    const id = await window.pg.notes.save({ id: activeNote?.id ?? null, content });
    await refreshNotes();
    if (typeof id === 'string') {
      const updated = (await window.pg.notes.list()) as Note[];
      const note = updated.find((n) => n.id === id) ?? null;
      setActiveNote(note);
    }
  };

  const handleNoteDelete = async (id: string) => {
    await window.pg.notes.remove(id);
    await refreshNotes();
    setActiveNote(null);
  };

  const memoryUsage = useMemo(() => {
    const used = metrics.totalMem - metrics.freeMem;
    return {
      percent: Math.round((used / metrics.totalMem) * 100),
      used,
      total: metrics.totalMem
    };
  }, [metrics]);

  return (
    <div className="pg-app">
      <aside className="pg-sidebar-container">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            className={`pg-sidebar-button ${sidebar === item.id ? 'active' : ''}`}
            onClick={() => setSidebar(item.id)}
            title={item.label}
          >
            <span>{item.icon}</span>
          </button>
        ))}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ModeSwitch current={mode} onChange={handleMode} />
          <button className={`pg-sidebar-button ${vpnEnabled ? 'active' : ''}`} onClick={handleVpnToggle} title="Activer le VPN">
            🛡️
          </button>
        </div>
      </aside>

      <div className="pg-chrome">
        <div className="pg-tabstrip">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`pg-tab ${tab.isActive ? 'active' : ''}`}
              onClick={() => window.pg.tabs.activate(tab.id)}
            >
              <span className="pg-tab-title">{tab.title}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={(event) => (event.stopPropagation(), window.pg.tabs.duplicate(tab.id))}>⧉</button>
                <button onClick={(event) => (event.stopPropagation(), window.pg.tabs.detach(tab.id))}>🗗</button>
                <button onClick={(event) => (event.stopPropagation(), handleCloseTab(tab.id))}>✕</button>
              </div>
            </div>
          ))}
          <div className="pg-add-tab" onClick={handleAddTab}>
            +
          </div>
        </div>

        <form className="pg-address-bar" onSubmit={handleAddressSubmit}>
          <span role="img" aria-label="url">
            🔍
          </span>
          <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Rechercher ou entrer une URL" />
          <button type="submit" style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            Aller
          </button>
        </form>

        <div className="pg-status">
          <div className="pg-status-metric">Onglets : {tabs.length}</div>
          <div className="pg-status-metric">RAM : {memoryUsage.percent}%</div>
          <div className="pg-status-metric">Mode : {mode.toUpperCase()}</div>
        </div>
      </div>

      <section className="pg-content">
        {sidebar === 'downloads' && <DownloadsPanel downloads={downloads} />}
        {sidebar === 'notes' && (
          <NotesPanel
            notes={notes}
            active={activeNote}
            onSelect={(note) => setActiveNote(note)}
            onSave={handleNoteSave}
            onDelete={handleNoteDelete}
          />
        )}
        {sidebar === 'sessions' && <SessionsPanel sessions={sessions} onRefresh={refreshSessions} />}
        {sidebar === 'settings' && config && <SettingsPanel config={config} vpnServers={vpnServers} onRefresh={refreshConfig} />}
        {sidebar === 'history' && (
          <SplitViewTabs
            tabs={tabs}
            selection={splitSelection}
            onSelect={(selection) => {
              setSplitSelection(selection);
              window.pg.tabs.setSplit(selection);
            }}
          />
        )}
      </section>
    </div>
  );
};

const ModeSwitch: React.FC<{ current: 'normal' | 'gaming' | 'focus'; onChange: (mode: 'normal' | 'gaming' | 'focus') => void }> = ({
  current,
  onChange
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {['normal', 'focus', 'gaming'].map((mode) => (
      <button key={mode} className={`pg-sidebar-button ${current === mode ? 'active' : ''}`} onClick={() => onChange(mode as any)}>
        {mode === 'normal' ? '✨' : mode === 'focus' ? '🎯' : '🎮'}
      </button>
    ))}
  </div>
);

const DownloadsPanel: React.FC<{ downloads: Download[] }> = ({ downloads }) => (
  <div className="pg-extensions">
    <h3>Téléchargements</h3>
    {downloads.map((download) => (
      <div key={download.url} className="pg-session-item">
        <span>
          {download.filename}
          <br />
          <small>
            {formatBytes(download.receivedBytes)} / {formatBytes(download.totalBytes)}
          </small>
        </span>
        <span>{download.state}</span>
      </div>
    ))}
  </div>
);

const NotesPanel: React.FC<{
  notes: Note[];
  active: Note | null;
  onSelect: (note: Note | null) => void;
  onSave: (content: string) => void;
  onDelete: (id: string) => void;
}> = ({ notes, active, onSelect, onSave, onDelete }) => {
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setDraft(active?.content ?? '');
  }, [active]);

  return (
    <div className="pg-notes">
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="pg-sidebar-button" onClick={() => onSelect(null)}>
          ➕
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          {notes.map((note) => (
            <button key={note.id} className={`pg-sidebar-button ${active?.id === note.id ? 'active' : ''}`} onClick={() => onSelect(note)}>
              📝
            </button>
          ))}
        </div>
      </div>
      <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Écrivez vos idées..." />
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="pg-sidebar-button" onClick={() => onSave(draft)}>
          💾
        </button>
        {active && (
          <button className="pg-sidebar-button" onClick={() => onDelete(active.id)}>
            🗑️
          </button>
        )}
      </div>
    </div>
  );
};

const SessionsPanel: React.FC<{ sessions: Session[]; onRefresh: () => void }> = ({ sessions, onRefresh }) => (
  <div className="pg-session-list">
    <h3>Sessions enregistrées</h3>
    <button className="pg-sidebar-button" onClick={() => window.pg.sessions.save(`Session ${new Date().toLocaleString()}`).then(onRefresh)}>
      💾
    </button>
    {sessions.map((session) => (
      <div key={session.id} className="pg-session-item">
        <span>
          {session.name}
          <br />
          <small>{new Date(session.createdAt).toLocaleString()}</small>
        </span>
        <button className="pg-sidebar-button" onClick={() => window.pg.sessions.remove(session.id).then(onRefresh)}>
          ❌
        </button>
      </div>
    ))}
  </div>
);

const SettingsPanel: React.FC<{ config: any; vpnServers: { id: string; name: string }[]; onRefresh: () => void }> = ({ config, vpnServers, onRefresh }) => {
  const [selectedVpn, setSelectedVpn] = useState(config.vpn.defaultServer ?? '');

  useEffect(() => {
    setSelectedVpn(config.vpn.defaultServer ?? '');
  }, [config.vpn.defaultServer]);

  const handleApplyVpn = async () => {
    await window.pg.vpn.apply(selectedVpn);
    await window.pg.config.set({ vpn: { defaultServer: selectedVpn } });
    onRefresh();
  };

  return (
    <div className="pg-extensions">
      <h3>Paramètres</h3>
      <label>
        <span>Serveur VPN</span>
        <select value={selectedVpn} onChange={(event) => setSelectedVpn(event.target.value)} style={{ marginLeft: 12 }}>
          {vpnServers.map((server) => (
            <option key={server.id} value={server.id}>
              {server.name}
            </option>
          ))}
        </select>
      </label>
      <button className="pg-sidebar-button" onClick={handleApplyVpn}>
        Appliquer
      </button>
    </div>
  );
};

const SplitViewTabs: React.FC<{
  tabs: TabModel[];
  selection: { primary: string | null; secondary: string | null };
  onSelect: (selection: { primary: string | null; secondary: string | null }) => void;
}> = ({ tabs, selection, onSelect }) => {
  const primary = tabs.find((tab) => tab.id === selection.primary) ?? null;
  const secondary = tabs.find((tab) => tab.id === selection.secondary) ?? null;
  return (
    <div className="pg-split-layout">
      <div className="pg-split-panel">
        <h3>Gestion de la vue scindée</h3>
        <p style={{ opacity: 0.7 }}>Choisissez deux onglets pour les afficher côte à côte.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tabs.map((tab) => (
            <div key={tab.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.title}</span>
              <button
                className={`pg-sidebar-button ${selection.primary === tab.id ? 'active' : ''}`}
                onClick={() => onSelect({ primary: tab.id, secondary: selection.secondary })}
                title="Définir comme panneau gauche"
              >
                ⬅️
              </button>
              <button
                className={`pg-sidebar-button ${selection.secondary === tab.id ? 'active' : ''}`}
                onClick={() => onSelect({ primary: selection.primary, secondary: tab.id })}
                title="Définir comme panneau droit"
              >
                ➡️
              </button>
            </div>
          ))}
        </div>
        <button className="pg-sidebar-button" style={{ marginTop: 12 }} onClick={() => onSelect({ primary: null, secondary: null })}>
          ❎
        </button>
      </div>
      <div className="pg-split-panel">
        <h3>Prévisualisation</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <strong>{primary?.title ?? '—'}</strong>
            <p style={{ opacity: 0.7 }}>{primary?.url ?? 'Sélectionnez un onglet'}</p>
          </div>
          <div>
            <strong>{secondary?.title ?? '—'}</strong>
            <p style={{ opacity: 0.7 }}>{secondary?.url ?? 'Sélectionnez un onglet'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(1)} ${units[index]}`;
}

function normalizeUrl(input: string, config: any) {
  if (!input) return 'about:blank';
  if (/^https?:\/\//i.test(input)) {
    return input;
  }
  if (input.includes('.')) {
    return `https://${input}`;
  }
  return (config?.general?.searchEngine ?? 'https://duckduckgo.com/?q=%s').replace('%s', encodeURIComponent(input));
}

export default App;
