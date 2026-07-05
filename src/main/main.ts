// ─────────────────────────────────────────────
// Electron Main Process — Entry point.
// Boots Prisma, registers IPC handlers, then
// opens the BrowserWindow pointing at Vite or
// the production build depending on environment.
// ─────────────────────────────────────────────

import { app, BrowserWindow } from 'electron';
import path from 'path';
import { getPrismaClient } from './prisma/client.js';
import { createPosService } from './services/posService.js';
import { registerIpcHandlers } from './ipcHandlers.js';

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
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // 1. Boot Prisma
  const prisma = getPrismaClient();

  // 2. Create the service layer
  const posService = createPosService(prisma);

  // 3. Register all IPC handlers
  registerIpcHandlers(posService);

  // 4. Open the window
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
