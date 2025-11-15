declare global {
  interface Window {
    pg: {
      config: {
        get: () => Promise<any>;
        set: (partial: any) => Promise<any>;
      };
      vpn: {
        apply: (serverId?: string) => Promise<any>;
        disable: () => Promise<any>;
      };
      downloads: {
        list: () => Promise<any>;
        onUpdate: (callback: (downloads: any) => void) => void;
      };
      mods: {
        list: () => Promise<any>;
      };
      passwords: {
        list: (master: string) => Promise<any>;
        save: (entry: any, master: string) => Promise<any>;
        remove: (id: string) => Promise<any>;
        setMaster: (password: string) => Promise<any>;
        getMaster: () => Promise<any>;
      };
      sessions: {
        list: () => Promise<any>;
        save: (name: string) => Promise<any>;
        remove: (id: string) => Promise<any>;
      };
      notes: {
        list: () => Promise<any>;
        save: (payload: { id: string | null; content: string }) => Promise<any>;
        remove: (id: string) => Promise<any>;
      };
      tabs: {
        create: (url?: string) => Promise<any>;
        close: (id: string) => Promise<any>;
        activate: (id: string) => Promise<any>;
        duplicate: (id: string) => Promise<any>;
        detach: (id: string) => Promise<any>;
        setGroup: (id: string, group: string | null) => Promise<any>;
        move: (payload: { id: string; index: number }) => Promise<any>;
        updateUrl: (payload: { id: string; url: string }) => Promise<any>;
        reload: (id: string) => Promise<any>;
        setSplit: (payload: { primary: string | null; secondary: string | null }) => Promise<any>;
        onUpdate: (callback: (tabs: any) => void) => void;
      };
      focus: {
        setMode: (mode: 'gaming' | 'focus' | 'normal') => Promise<any>;
      };
      system: {
        metrics: () => { totalMem: number; freeMem: number; load: number };
      };
    };
  }
}

export {};
