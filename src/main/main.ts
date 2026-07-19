// ─────────────────────────────────────────────
// Electron Main Process — Entry point.
// Boots Prisma, registers IPC handlers, then
// opens the BrowserWindow pointing at Vite or
// the production build depending on environment.
// ─────────────────────────────────────────────

import { app, BrowserWindow } from 'electron';
import path from 'path';
import { getPrismaClient, ensureDatabase } from './prisma/client.js';
import { createPosService } from './services/posService.js';
import { registerIpcHandlers } from './ipcHandlers.js';

// ── Globals set by vite-plugin-electron ──────
// VITE_DEV_SERVER_URL is injected automatically
// when the Vite dev server is running.
// dist/ and dist-electron/ are the build outputs.
//
// NOTE: __dirname is available natively because the output
// is compiled to CommonJS (.cjs) format by Vite.
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // In dev, Vite serves on localhost. In production, load the built file.
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // Production: the renderer is built into dist/
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // 1. Boot Prisma
  const prisma = getPrismaClient();

  // 2. Connect and ensure schema exists
  //    In production, on first launch this creates all tables
  //    from the embedded DDL. In dev it's a no-op.
  try {
    await prisma.$connect();
    console.log('[Main] Prisma connected successfully');
    await ensureDatabase(prisma);
  } catch (err) {
    console.error('[Main] Failed to connect to database:', err);
  }

  // 3. Create the service layer
  const posService = createPosService(prisma);

  // 4. Register all IPC handlers (prisma passed for restore/disconnect)
  registerIpcHandlers(posService, prisma);

  // 5. Open the window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
