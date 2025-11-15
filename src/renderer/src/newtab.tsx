import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';

type Widget = 'clock' | 'rss' | 'system-stats';

type RssItem = { title: string; link: string };

const NewTab: React.FC = () => {
  const [widgets, setWidgets] = useState<Widget[]>(['clock', 'system-stats']);
  const [rssFeeds, setRssFeeds] = useState<string[]>([]);
  const [rssItems, setRssItems] = useState<RssItem[]>([]);
  const [metrics, setMetrics] = useState(() => window.pg.system.metrics());

  useEffect(() => {
    window.pg.config.get().then((config) => {
      setWidgets(config.newTab.widgets);
      setRssFeeds(config.newTab.rssFeeds ?? []);
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(window.pg.system.metrics());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchFeeds() {
      const feeds: RssItem[] = [];
      for (const feed of rssFeeds) {
        try {
          const response = await fetch(feed);
          const text = await response.text();
          const parser = new DOMParser();
          const xml = parser.parseFromString(text, 'text/xml');
          const items = Array.from(xml.querySelectorAll('item')).slice(0, 5);
          items.forEach((item) => {
            const title = item.querySelector('title')?.textContent ?? 'Article';
            const link = item.querySelector('link')?.textContent ?? '#';
            feeds.push({ title, link });
          });
        } catch (err) {
          console.error('RSS error', err);
        }
      }
      setRssItems(feeds);
    }
    if (rssFeeds.length > 0) {
      fetchFeeds();
    }
  }, [rssFeeds]);

  return (
    <div className="pg-widget-grid" style={{ paddingTop: 40 }}>
      {widgets.includes('clock') && <ClockWidget />}
      {widgets.includes('system-stats') && <StatsWidget metrics={metrics} />}
      {widgets.includes('rss') && <RssWidget items={rssItems} />}
    </div>
  );
};

const ClockWidget: React.FC = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pg-widget">
      <h3>Heure locale</h3>
      <div style={{ fontSize: 48, fontWeight: 600 }}>{now.toLocaleTimeString()}</div>
      <div style={{ opacity: 0.7 }}>{now.toLocaleDateString('fr-FR', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
    </div>
  );
};

const StatsWidget: React.FC<{ metrics: { totalMem: number; freeMem: number; load: number } }> = ({ metrics }) => {
  const usedMem = metrics.totalMem - metrics.freeMem;
  const usedPercent = Math.round((usedMem / metrics.totalMem) * 100);
  return (
    <div className="pg-widget">
      <h3>Statistiques système</h3>
      <p>Charge CPU (1 min): {(metrics.load * 100).toFixed(0)}%</p>
      <p>RAM utilisée: {(usedMem / 1024 / 1024 / 1024).toFixed(2)} / {(metrics.totalMem / 1024 / 1024 / 1024).toFixed(2)} Go</p>
      <div style={{ height: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${usedPercent}%`,
            background: 'linear-gradient(135deg, rgba(127, 90, 240, 0.9), rgba(44, 177, 255, 0.7))'
          }}
        />
      </div>
    </div>
  );
};

const RssWidget: React.FC<{ items: RssItem[] }> = ({ items }) => (
  <div className="pg-widget">
    <h3>Flux RSS</h3>
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item) => (
        <li key={item.link}>
          <a href={item.link} style={{ color: '#7fbdff', textDecoration: 'none' }}>
            {item.title}
          </a>
        </li>
      ))}
    </ul>
  </div>
);

ReactDOM.createRoot(document.getElementById('newtab-root') as HTMLElement).render(
  <React.StrictMode>
    <NewTab />
  </React.StrictMode>
);
