import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname を取得するための処理
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Reactアプリを起動するために必要
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));

  // DevToolsを開く（開発時）
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// アプリが起動したらウィンドウを作成
app.whenReady().then(() => {
  createWindow();

  // macOSでアプリがすでに起動している場合、ウィンドウを作成
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// アプリが終了した場合
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
