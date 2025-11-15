import { session } from 'electron';
import { configManager } from './config';

export async function applyVpn(serverId?: string) {
  const { vpn } = configManager.getConfig();
  if (!vpn.enabled) {
    await session.defaultSession.setProxy({ mode: 'direct' });
    return;
  }
  const target = vpn.servers.find((s) => s.id === (serverId ?? vpn.defaultServer));
  if (!target) return;

  await session.defaultSession.setProxy({ proxyRules: target.socks5 });
}

export function disableVpn() {
  return session.defaultSession.setProxy({ mode: 'direct' });
}
