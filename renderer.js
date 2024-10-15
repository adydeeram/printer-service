const { ipcRenderer } = require("electron");

document.getElementById("startServiceBtn").addEventListener("click", () => {
  ipcRenderer.send("start-service");
});

ipcRenderer.on("service-status", (event, message) => {
  document.getElementById("status").innerText = message;
});
