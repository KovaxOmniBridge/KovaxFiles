import React, { useState, useEffect } from 'react';
import { ShieldCheck, WifiOff, CheckCircle2 } from 'lucide-react';

export const OfflineBadge: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="flex items-center space-x-2">
      {isOnline ? (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-inner">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Selo 100% Offline (Sem Upload)</span>
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold shadow-lg shadow-purple-950">
          <WifiOff className="w-4 h-4 text-purple-400" />
          <span>Offline Isolado (Wi-Fi Desligado)</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        </div>
      )}
    </div>
  );
};
