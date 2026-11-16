import { SEED_DEVICES, SEED_REQUESTS, SEED_NEXT_ID, NEXT_DEVICE_ID } from './seed.js';

const SCHEMA_VERSION = 1;
const KEYS = {
  version: 'muondo_version',
  devices: 'muondo_devices',
  requests: 'muondo_requests',
  nextRequestId: 'muondo_nextRequestId',
  nextDeviceId: 'muondo_nextDeviceId',
  log: 'muondo_log',
  settings: 'muondo_settings',
};

export const Store = {
  _available: null, // cache kết quả isAvailable

  // Kiểm tra localStorage có khả dụng không
  isAvailable() {
    if (this._available !== null) return this._available;
    try {
      const testKey = '__muondo_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      this._available = true;
    } catch (e) {
      this._available = false;
    }
    return this._available;
  },

  // Đọc an toàn từ localStorage, bắt lỗi JSON hỏng
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn(`[Store] Lỗi đọc key "${key}":`, e);
      return null;
    }
  },

  // Ghi an toàn vào localStorage, bắt lỗi khi đầy
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      // QuotaExceededError hoặc SecurityError
      console.error(`[Store] Lỗi ghi key "${key}":`, e);
      return false;
    }
  },

  // Khởi tạo lần đầu - gọi seed nếu trống
  init() {
    if (!this.isAvailable()) {
      showStorageWarning();
      return;
    }
    const version = this.get(KEYS.version);
    if (!version) {
      // Lần đầu: nạp dữ liệu mẫu
      this.resetToSeed();
      return;
    }
    // Migrate nếu version cũ hơn SCHEMA_VERSION
    if (version < SCHEMA_VERSION) {
      this._migrate(version);
    }
  },

  // Migrate dữ liệu từ version cũ lên version mới
  _migrate(fromVersion) {
    console.info(`[Store] Migrate từ version ${fromVersion} -> ${SCHEMA_VERSION}`);
    // Hiện tại chỉ có version 1, dành chỗ cho future migrations
    this.set(KEYS.version, SCHEMA_VERSION);
  },

  // Nạp lại dữ liệu mẫu (xóa tất cả rồi nạp seed)
  resetToSeed() {
    this.saveDevices([...SEED_DEVICES.map(d => ({ ...d }))]);
    this.saveRequests([...SEED_REQUESTS.map(r => ({ ...r }))]);
    this.setNextRequestId(SEED_NEXT_ID);
    this.setNextDeviceId(NEXT_DEVICE_ID);
    this.clearLog();
    this.set(KEYS.version, SCHEMA_VERSION);
  },

  // ── Devices ──────────────────────────────────────────────────────────────

  getDevices() {
    return this.get(KEYS.devices) || [];
  },

  saveDevices(devices) {
    return this.set(KEYS.devices, devices);
  },

  getDevice(id) {
    return this.getDevices().find(d => d.id === id) || null;
  },

  updateDevice(device) {
    const devices = this.getDevices();
    const idx = devices.findIndex(d => d.id === device.id);
    if (idx >= 0) devices[idx] = device;
    else devices.push(device);
    return this.saveDevices(devices);
  },

  deleteDevice(id) {
    const devices = this.getDevices().filter(d => d.id !== id);
    return this.saveDevices(devices);
  },

  // ── Requests ─────────────────────────────────────────────────────────────

  getRequests() {
    return this.get(KEYS.requests) || [];
  },

  saveRequests(requests) {
    return this.set(KEYS.requests, requests);
  },

  getRequest(id) {
    return this.getRequests().find(r => r.id === id) || null;
  },

  updateRequest(request) {
    const requests = this.getRequests();
    const idx = requests.findIndex(r => r.id === request.id);
    if (idx >= 0) requests[idx] = request;
    else requests.push(request);
    return this.saveRequests(requests);
  },

  deleteRequest(id) {
    const requests = this.getRequests().filter(r => r.id !== id);
    return this.saveRequests(requests);
  },

  // ── ID Generators ─────────────────────────────────────────────────────────

  getNextRequestId() {
    return this.get(KEYS.nextRequestId) || SEED_NEXT_ID;
  },

  setNextRequestId(id) {
    return this.set(KEYS.nextRequestId, id);
  },

  generateRequestId() {
    const id = this.getNextRequestId();
    this.setNextRequestId(id + 1);
    // YC-104, YC-105 ... với id >= 1000 sẽ là YC-1000 (không pad cắt ngắn)
    return 'YC-' + String(id).padStart(3, '0');
  },

  getNextDeviceId() {
    return this.get(KEYS.nextDeviceId) || NEXT_DEVICE_ID;
  },

  setNextDeviceId(id) {
    return this.set(KEYS.nextDeviceId, id);
  },

  generateDeviceId() {
    const id = this.getNextDeviceId();
    this.setNextDeviceId(id + 1);
    // TB-06, TB-07 ... TB-10, TB-11 ...
    return 'TB-' + String(id).padStart(2, '0');
  },

  // ── Activity Log ──────────────────────────────────────────────────────────

  getLog() {
    return this.get(KEYS.log) || [];
  },

  addLog(entry) {
    const log = this.getLog();
    log.unshift({ ...entry, timestamp: new Date().toISOString() });
    // Giới hạn 100 dòng gần nhất tránh bộ nhớ phình to
    this.set(KEYS.log, log.slice(0, 100));
  },

  clearLog() {
    this.set(KEYS.log, []);
  },

  // ── Settings ──────────────────────────────────────────────────────────────

  getSettings() {
    return this.get(KEYS.settings) || { role: 'member' };
  },

  saveSettings(s) {
    return this.set(KEYS.settings, s);
  },
};

// Helper: hiển thị cảnh báo khi localStorage không khả dụng
function showStorageWarning() {
  console.error('[Store] localStorage không khả dụng. Dữ liệu sẽ không được lưu.');
  // Tạo banner cảnh báo nếu DOM đã sẵn sàng
  if (typeof document !== 'undefined') {
    const existing = document.getElementById('storage-warning');
    if (existing) return;
    const banner = document.createElement('div');
    banner.id = 'storage-warning';
    banner.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:9999',
      'background:#ef4444', 'color:#fff', 'text-align:center',
      'padding:10px 16px', 'font-size:14px', 'font-family:sans-serif',
    ].join(';');
    banner.textContent =
      '⚠️ Trình duyệt đang chặn localStorage. Dữ liệu sẽ không được lưu giữa các phiên.';
    document.body?.prepend(banner);
  }
}
