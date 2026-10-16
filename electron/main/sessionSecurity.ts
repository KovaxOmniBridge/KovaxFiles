/**
 * KovaxFiles Desktop — Electron Session Security & CSP Policy
 * Controla permissões, isolamento de rede e Content-Security-Policy estrita.
 */

import { session, app } from 'electron';

export function configureSessionSecurity(): void {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  // 1. Rejeitar solicitações de permissões não requeridas pela aplicação
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  // 2. Controlar domínios de conexões: restringir tráfego de rede (aplicação 100% offline)
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url;

    // Permitir arquivos locais empacotados e esquemas em memória
    if (url.startsWith('file://') || url.startsWith('devtools://') || url.startsWith('blob:') || url.startsWith('data:')) {
      return callback({ cancel: false });
    }

    // Permitir estritamente o servidor de desenvolvimento local quando em modo DEV
    if (isDev && process.env.VITE_DEV_SERVER_URL) {
      if (
        url.startsWith(process.env.VITE_DEV_SERVER_URL) ||
        url.startsWith('http://localhost:') ||
        url.startsWith('http://127.0.0.1:') ||
        url.startsWith('ws://localhost:') ||
        url.startsWith('ws://127.0.0.1:')
      ) {
        return callback({ cancel: false });
      }
    }

    // Bloquear qualquer tentativa de conexão externa
    console.warn(`[Segurança Electron] Requisição de rede externa bloqueada (aplicativo 100% local): ${url}`);
    callback({ cancel: true });
  });

  // 3. Enforçar Content-Security-Policy estrita em headers HTTP/file
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    const strictCsp = isDev
      ? "default-src 'self' blob: data:; connect-src 'self' data: blob: http://127.0.0.1:* http://localhost:* ws: ws://localhost:* ws://127.0.0.1:*; worker-src 'self' blob:; img-src 'self' data: blob:; script-src 'self' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; object-src 'none'; base-uri 'none';"
      : "default-src 'self' blob: data:; connect-src 'self' data: blob:; worker-src 'self' blob:; img-src 'self' data: blob:; script-src 'self' blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none';";

    responseHeaders['Content-Security-Policy'] = [strictCsp];
    callback({ responseHeaders });
  });
}
