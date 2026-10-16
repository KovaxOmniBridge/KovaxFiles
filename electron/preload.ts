/**
 * KovaxFiles Desktop — Electron Preload Process Entry Point
 */

import { exposeElectronApi } from './preload/apiBridge';

exposeElectronApi();
