const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { fork, exec } = require("child_process");

let mainWindow;
let printerService;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, "/logo.jpeg"), // Add this line
    webPreferences: {
      // preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile("index.html");

  // Comment out the line that opens DevTools automatically
  // mainWindow.webContents.openDevTools();

  // When the window is closed, terminate the printer service
  mainWindow.on("closed", () => {
    if (printerService) {
      printerService.kill();
    }
    mainWindow = null;
  });
}

function listPrinters() {
  exec("lpstat -p", (error, stdout, stderr) => {
    if (error) {
      console.error(`Error listing printers: ${error}`);
      return;
    }
    console.log("Available printers:");
    console.log(stdout);
  });
}

// Create the window when Electron has initialized
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Add this line to list printers on startup
  listPrinters();
});

// Quit the app when all windows are closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Handle starting the printer service when the button is clicked
ipcMain.on("start-service", (event) => {
  if (!printerService) {
    printerService = fork(path.join(__dirname, "printer-service.js"));

    printerService.on("message", (data) => {
      console.log("Printer service message:", data);
    });

    printerService.on("exit", (code) => {
      console.log("Printer service exited with code:", code);
    });

    event.reply("service-status", "Printer service started");
  }
});
