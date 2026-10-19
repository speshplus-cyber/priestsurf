'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const on = channel => cb => {
  const h = (_e, data) => cb(data);
  ipcRenderer.on(channel, h);
  return () => ipcRenderer.removeListener(channel, h);
};

contextBridge.exposeInMainWorld('priest', {
  getSettings: () => ipcRenderer.invoke('settings-get'),
  setSettings: patch => ipcRenderer.invoke('settings-set', patch),
  newIdentity: () => ipcRenderer.invoke('new-identity'),
  torStatus: () => ipcRenderer.invoke('tor-status'),
  setTor: enabled => ipcRenderer.invoke('tor-set', enabled),
  getStats: wcId => ipcRenderer.invoke('stats-get', wcId),
  toggleShields: host => ipcRenderer.invoke('shields-toggle', host),
  allowInsecure: host => ipcRenderer.invoke('allow-insecure', host),
  respondPermission: (id, allow) => ipcRenderer.invoke('permission-respond', id, allow),
  execInPage: (wcId, code) => ipcRenderer.invoke('page-exec', wcId, code),
  askAI:(prompt, context) => ipcRenderer.invoke('ai-ask', { prompt, context }),
  phoneStatus: () => ipcRenderer.invoke('phone-status'),
  setPhoneLink: enabled => ipcRenderer.invoke('phone-set', enabled),
  unpairPhones: () => ipcRenderer.invoke('phone-unpair'),
  sendToPhone: item => ipcRenderer.invoke('phone-push', item),
  publishTabs: list => ipcRenderer.send('phone-tabs', list),
  onPhoneCommand: on('phone-command'),
  onOpenTab: on('open-tab'),
  onStats: on('stats'),
  onPermission: on('permission-request'),
  onShortcut: on('shortcut'),
  onTor: on('tor-changed'),
  onToast: on('toast'),
  onSearchSelection: on('search-selection'),
  onAssistantAsk: on('assistant-ask')
});
