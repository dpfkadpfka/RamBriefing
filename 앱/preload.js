const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("rb", {
  status: () => ipcRenderer.invoke("status"),
  setSecret: v => ipcRenderer.invoke("setSecret", v),
  login: () => ipcRenderer.invoke("login"),
  logout: () => ipcRenderer.invoke("logout"),
  addEvent: a => ipcRenderer.invoke("addEvent", a),
  chat: p => ipcRenderer.invoke("chat", p),
  getIcon: () => ipcRenderer.invoke("getIcon"),
  setIcon: n => ipcRenderer.invoke("setIcon", n),
});
