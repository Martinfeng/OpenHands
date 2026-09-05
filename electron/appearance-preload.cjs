const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopAppearance", {
  setTheme(preference) {
    if (["system", "light", "dark"].includes(preference)) {
      ipcRenderer.send("appearance:set", preference);
    }
  },
});
