/**
 * app.js – Điều phối chính cho ứng dụng MượnĐồ.
 * Kết nối Store, Logic và UI.
 */

import { Store } from './store.js';
import {
  validateRequest,
  findConflicts,
  searchRequests,
  normalizeSearch,
  escapeHtml,
  dateToISO,
  formatDate,
  formatDateTime,
  STATUS_LABELS,
  isOverdue,
  runTests,
} from './logic.js';
import {
  renderDevicesPage,
  renderBorrowForm,
  renderRequestsPage,
  renderDashboardPage,
  renderCalendar,
  renderDeviceCard,
  renderRequestCard,
  renderEmptyState,
  showToast,
  showConfirm,
} from './ui.js';

// Ngày hiện tại dạng ISO 'YYYY-MM-DD'
function getToday() {
  return dateToISO(new Date());
}

// State nội bộ của app
let currentRole = 'member';
let activePage = 'devices';
let deviceStatusFilter = 'all';
let deviceTypeFilter = 'all';
let deviceSearchTerm = '';
let requestStatusFilter = 'all';
let requestSearchTerm = '';

// ─────────────────────────────────────────────────────────────────────────────
// Khởi tạo ứng dụng
// ─────────────────────────────────────────────────────────────────────────────

async function init() {
  // 1. Khởi tạo store (nạp seed nếu trống)
  Store.init();

  // 2. Tải role từ settings
  const settings = Store.getSettings();
  currentRole = settings.role || 'member';

  // 3. Setup header role toggle & bottom nav
  setupRoleToggle();
  setupNavigation();

  // 4. Lắng nghe hash change
  window.addEventListener('hashchange', handleRouting);

  // 5. Điều hướng trang đầu tiên
  handleRouting();

  // 6. Đăng ký Service Worker cho PWA
  registerServiceWorker();

  // 7. Chạy test tự động trong console để kiểm tra
  try {
    const testResults = runTests();
    const passed = testResults.filter(t => t.passed).length;
    console.log(`[Tests] Đã chạy ${testResults.length} test cases: ${passed}/${testResults.length} passed.`);
  } catch (err) {
    console.warn('[Tests] Lỗi khi chạy unit tests:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Routing
// ─────────────────────────────────────────────────────────────────────────────

function handleRouting() {
  const hash = window.location.hash || '#devices';

  // Kiểm tra deep link QR code: #/yeu-cau/YC-xxx
  const qrMatch = hash.match(/^#\/yeu-cau\/(YC-\d+)$/i);
  if (qrMatch) {
    const reqId = qrMatch[1].toUpperCase();
    activePage = 'requests';
    updateNavUI();
    renderRequestsView();
    // Highlight và scroll tới yêu cầu
    setTimeout(() => {
      const el = document.querySelector(`[data-request-id="${reqId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.outline = '3px solid #6366f1';
        el.style.transition = 'outline 0.5s ease';
        setTimeout(() => { el.style.outline = ''; }, 3000);
      } else {
        showToast(`Không tìm thấy yêu cầu ${reqId}`, 'warning');
      }
    }, 150);
    return;
  }

  // Parse page và params
  const [pagePart, queryPart] = hash.split('?');
  const page = pagePart.replace(/^#\/?/, '') || 'devices';

  const validPages = ['devices', 'borrow', 'requests', 'dashboard'];
  activePage = validPages.includes(page) ? page : 'devices';

  updateNavUI();

  const appMain = document.getElementById('appMain');
  if (!appMain) return;

  switch (activePage) {
    case 'devices':
      renderDevicesView();
      break;
    case 'borrow':
      const urlParams = new URLSearchParams(queryPart || '');
      const preselectedDevice = urlParams.get('device');
      renderBorrowView(preselectedDevice);
      break;
    case 'requests':
      renderRequestsView();
      break;
    case 'dashboard':
      renderDashboardView();
      break;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateNavUI() {
  // Cập nhật bottom nav
  document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
    const page = item.getAttribute('data-page');
    if (page === activePage) {
      item.classList.add('active');
      item.setAttribute('aria-current', 'page');
    } else {
      item.classList.remove('active');
      item.removeAttribute('aria-current');
    }
  });

  // Cập nhật side nav (nếu có trên desktop)
  document.querySelectorAll('.side-nav .side-nav-item').forEach(item => {
    const page = item.getAttribute('data-page');
    if (page === activePage) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Cập nhật nhãn tab yêu cầu theo vai trò
  const navReqLabel = document.getElementById('navRequestsLabel');
  if (navReqLabel) {
    navReqLabel.textContent = currentRole === 'admin' ? 'Quản lý YC' : 'Yêu cầu';
  }
  const sideNavReqLabel = document.getElementById('sideNavRequestsLabel');
  if (sideNavReqLabel) {
    sideNavReqLabel.textContent = currentRole === 'admin' ? 'Quản lý yêu cầu' : 'Yêu cầu của tôi';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Role Toggle
// ─────────────────────────────────────────────────────────────────────────────

function setupRoleToggle() {
  const roleToggle = document.getElementById('roleToggle');
  if (!roleToggle) return;

  // Cập nhật trạng thái nút
  const buttons = roleToggle.querySelectorAll('.role-btn');
  buttons.forEach(btn => {
    const role = btn.getAttribute('data-role');
    if (role === currentRole) {
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    }

    btn.addEventListener('click', () => {
      if (currentRole === role) return;
      currentRole = role;
      Store.saveSettings({ ...Store.getSettings(), role: currentRole });

      // Cập nhật active class
      buttons.forEach(b => {
        const r = b.getAttribute('data-role');
        const isActive = r === currentRole;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      showToast(`Đã chuyển vai trò sang: ${currentRole === 'admin' ? 'Người phụ trách' : 'Thành viên'}`);
      updateNavUI();

      // Render lại trang hiện tại
      handleRouting();
    });
  });
}

function setupNavigation() {
  // Gắn event click cho bottom nav và side nav để điều hướng tức thì
  document.querySelectorAll('.nav-item, .side-nav-item').forEach(el => {
    el.addEventListener('click', (e) => {
      const page = el.getAttribute('data-page');
      if (page) {
        window.location.hash = '#' + page;
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW: Thiết bị (#devices)
// ─────────────────────────────────────────────────────────────────────────────

function renderDevicesView() {
  const appMain = document.getElementById('appMain');
  const devices = Store.getDevices();
  const requests = Store.getRequests();
  const today = getToday();

  appMain.innerHTML = renderDevicesPage(devices, requests, currentRole, today);

  // Setup form thêm thiết bị (admin)
  const addDeviceBtn = document.getElementById('addDeviceBtn');
  const addDeviceWrap = document.getElementById('addDeviceFormWrap');
  const cancelAddDeviceBtn = document.getElementById('cancelAddDeviceBtn');
  const addDeviceForm = document.getElementById('addDeviceForm');

  if (addDeviceBtn && addDeviceWrap) {
    addDeviceBtn.addEventListener('click', () => {
      addDeviceWrap.hidden = !addDeviceWrap.hidden;
      if (!addDeviceWrap.hidden) {
        document.getElementById('newDeviceName')?.focus();
      }
    });
  }

  if (cancelAddDeviceBtn && addDeviceWrap) {
    cancelAddDeviceBtn.addEventListener('click', () => {
      addDeviceWrap.hidden = true;
    });
  }

  if (addDeviceForm) {
    addDeviceForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('newDeviceName');
      const typeInput = document.getElementById('newDeviceType');
      const noteInput = document.getElementById('newDeviceNote');

      const name = nameInput.value.trim();
      const type = typeInput.value.trim();
      const note = noteInput.value.trim();

      if (!name || name.length < 2) {
        showToast('Tên thiết bị phải có tối thiểu 2 ký tự', 'error');
        nameInput.focus();
        return;
      }
      if (!type) {
        showToast('Vui lòng nhập loại thiết bị', 'error');
        typeInput.focus();
        return;
      }

      const id = Store.generateDeviceId();
      const newDevice = {
        id,
        name,
        type,
        status: 'available',
        note: note || '',
      };

      Store.updateDevice(newDevice);
      Store.addLog({
        action: 'add_device',
        role: 'admin',
        detail: `Thêm thiết bị mới: ${name} (${id})`,
      });

      showToast(`Đã thêm thiết bị thành công: ${id} - ${name}`);
      renderDevicesView();
    });
  }

  // Setup filter trạng thái
  const statusChips = document.querySelectorAll('[data-filter-status]');
  statusChips.forEach(chip => {
    chip.addEventListener('click', () => {
      statusChips.forEach(c => c.classList.remove('chip-active'));
      chip.classList.add('chip-active');
      deviceStatusFilter = chip.getAttribute('data-filter-status');
      filterAndRenderDeviceGrid();
    });
  });

  // Setup filter loại
  const typeChips = document.querySelectorAll('[data-filter-type]');
  typeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      typeChips.forEach(c => c.classList.remove('chip-active'));
      chip.classList.add('chip-active');
      deviceTypeFilter = chip.getAttribute('data-filter-type');
      filterAndRenderDeviceGrid();
    });
  });

  // Setup search input
  const searchInput = document.getElementById('deviceSearch');
  if (searchInput) {
    searchInput.value = deviceSearchTerm;
    searchInput.addEventListener('input', (e) => {
      deviceSearchTerm = e.target.value;
      filterAndRenderDeviceGrid();
    });
  }

  // Setup admin dropdown đổi tình trạng thiết bị
  attachDeviceStatusChangeEvents();
}

function filterAndRenderDeviceGrid() {
  const grid = document.getElementById('deviceGrid');
  if (!grid) return;

  const devices = Store.getDevices();
  const today = getToday();

  let filtered = devices;

  // Lọc theo trạng thái
  if (deviceStatusFilter && deviceStatusFilter !== 'all') {
    filtered = filtered.filter(d => d.status === deviceStatusFilter);
  }

  // Lọc theo loại
  if (deviceTypeFilter && deviceTypeFilter !== 'all') {
    filtered = filtered.filter(d => d.type === deviceTypeFilter);
  }

  // Tìm kiếm theo tên hoặc mã
  if (deviceSearchTerm.trim()) {
    const term = normalizeSearch(deviceSearchTerm);
    filtered = filtered.filter(d => {
      const nameNorm = normalizeSearch(d.name);
      const idNorm = d.id.toLowerCase().replace(/-/g, '');
      const idWithDash = d.id.toLowerCase();
      const termNorm = term.replace(/-/g, '');
      return nameNorm.includes(term) || idNorm.includes(termNorm) || idWithDash.includes(term);
    });
  }

  if (filtered.length === 0) {
    grid.innerHTML = renderEmptyState('Không tìm thấy thiết bị phù hợp', '🔍');
  } else {
    grid.innerHTML = filtered.map(d => renderDeviceCard(d, currentRole, today)).join('');
    attachDeviceStatusChangeEvents();
  }
}

function attachDeviceStatusChangeEvents() {
  const selects = document.querySelectorAll('.device-status-select');
  selects.forEach(sel => {
    sel.addEventListener('change', async (e) => {
      const deviceId = sel.getAttribute('data-device-id');
      const newStatus = sel.value;
      const device = Store.getDevice(deviceId);
      if (!device) return;

      const oldStatus = device.status;
      if (oldStatus === newStatus) return;

      device.status = newStatus;
      Store.updateDevice(device);
      Store.addLog({
        action: 'update_device_status',
        role: 'admin',
        detail: `Đổi trạng thái thiết bị ${deviceId} từ "${STATUS_LABELS.device[oldStatus]}" sang "${STATUS_LABELS.device[newStatus]}"`,
      });

      showToast(`Đã cập nhật ${deviceId} thành ${STATUS_LABELS.device[newStatus]}`);
      filterAndRenderDeviceGrid();
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW: Đăng ký mượn (#borrow)
// ─────────────────────────────────────────────────────────────────────────────

function renderBorrowView(preselectedDeviceId) {
  const appMain = document.getElementById('appMain');
  const devices = Store.getDevices();

  appMain.innerHTML = renderBorrowForm(devices, preselectedDeviceId);

  const form = document.getElementById('borrowForm');
  const deviceSelect = document.getElementById('deviceSelect');
  const borrowerNameInput = document.getElementById('borrowerName');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const calendarWrap = document.getElementById('deviceCalendarWrap');
  const calendarEl = document.getElementById('deviceCalendar');
  const conflictWarning = document.getElementById('conflictWarning');

  const today = getToday();
  // Giới hạn không cho chọn ngày quá khứ
  startDateInput.min = today;
  endDateInput.min = today;

  // Render lịch nếu đã chọn thiết bị
  function updateCalendar() {
    const devId = deviceSelect.value;
    if (!devId) {
      calendarWrap.hidden = true;
      return;
    }
    const requests = Store.getRequests();
    calendarEl.innerHTML = renderCalendar(devId, requests, today);
    calendarWrap.hidden = false;

    // Gắn sự kiện click ngày trên lịch để chọn ngày
    calendarEl.querySelectorAll('.calendar-day:not(.day-occupied)').forEach(dayEl => {
      dayEl.addEventListener('click', () => {
        const dateStr = dayEl.getAttribute('data-date');
        if (!dateStr || dateStr < today) return;

        if (!startDateInput.value || (startDateInput.value && endDateInput.value)) {
          startDateInput.value = dateStr;
          endDateInput.value = dateStr;
        } else if (startDateInput.value && !endDateInput.value) {
          if (dateStr >= startDateInput.value) {
            endDateInput.value = dateStr;
          } else {
            endDateInput.value = startDateInput.value;
            startDateInput.value = dateStr;
          }
        }
        triggerRealtimeValidation();
      });
    });
  }

  // Realtime validate & conflict check
  function triggerRealtimeValidation() {
    clearFieldErrors();
    const data = {
      deviceId: deviceSelect.value,
      borrowerName: borrowerNameInput.value.trim(),
      startDate: startDateInput.value,
      endDate: endDateInput.value,
    };

    // Tự động chỉnh min của endDate theo startDate
    if (data.startDate) {
      endDateInput.min = data.startDate;
      if (data.endDate && data.endDate < data.startDate) {
        endDateInput.value = data.startDate;
        data.endDate = data.startDate;
      }
    }

    const requests = Store.getRequests();
    const currentDevices = Store.getDevices();

    // Chỉ check trùng lịch khi đã đủ deviceId, startDate, endDate
    if (data.deviceId && data.startDate && data.endDate) {
      const result = validateRequest(data, currentDevices, requests, today, null, false);
      if (result.conflictMessage) {
        conflictWarning.innerHTML = `⚠️ <strong>Cảnh báo trùng lịch:</strong><br>${result.conflictMessage}`;
        conflictWarning.hidden = false;
      } else {
        conflictWarning.hidden = true;
      }

      if (result.errors.deviceId) showFieldError('deviceId', result.errors.deviceId);
      if (result.errors.startDate) showFieldError('startDate', result.errors.startDate);
      if (result.errors.endDate) showFieldError('endDate', result.errors.endDate);
    } else {
      conflictWarning.hidden = true;
    }
  }

  deviceSelect.addEventListener('change', () => {
    updateCalendar();
    triggerRealtimeValidation();
  });

  startDateInput.addEventListener('change', triggerRealtimeValidation);
  endDateInput.addEventListener('change', triggerRealtimeValidation);
  borrowerNameInput.addEventListener('input', () => {
    const err = document.getElementById('err-borrowerName');
    if (err) err.textContent = '';
  });

  if (deviceSelect.value) {
    updateCalendar();
  }

  // Submit form
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearFieldErrors();

    const data = {
      deviceId: deviceSelect.value,
      borrowerName: borrowerNameInput.value.trim(),
      startDate: startDateInput.value,
      endDate: endDateInput.value,
    };

    const currentDevices = Store.getDevices();
    const requests = Store.getRequests();

    const result = validateRequest(data, currentDevices, requests, today, null, false);

    if (!result.valid) {
      // Hiển thị lỗi các trường
      Object.keys(result.errors).forEach(field => {
        showFieldError(field, result.errors[field]);
      });

      if (result.conflictMessage) {
        conflictWarning.innerHTML = `⚠️ <strong>Không thể gửi yêu cầu do trùng lịch:</strong><br>${result.conflictMessage}`;
        conflictWarning.hidden = false;
        conflictWarning.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const firstError = Object.keys(result.errors)[0];
        if (firstError) {
          const inputEl = document.getElementById(firstError === 'deviceId' ? 'deviceSelect' : firstError);
          inputEl?.focus();
        }
      }
      return;
    }

    // Tạo yêu cầu mới hợp lệ
    const newId = Store.generateRequestId();
    const newRequest = {
      id: newId,
      borrowerName: data.borrowerName,
      deviceId: data.deviceId,
      startDate: data.startDate,
      endDate: data.endDate,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    Store.updateRequest(newRequest);
    Store.addLog({
      action: 'create_request',
      role: currentRole,
      detail: `Tạo yêu cầu mượn ${newId} cho ${data.borrowerName} (${data.deviceId}) từ ${formatDate(data.startDate)} đến ${formatDate(data.endDate)}`,
    });

    showToast(`Đã gửi yêu cầu thành công! Mã yêu cầu của bạn: ${newId}`, 'success');

    // Chuyển hướng tới danh sách yêu cầu
    window.location.hash = '#requests';
  });
}

function showFieldError(field, msg) {
  const errEl = document.getElementById(`err-${field}`);
  if (errEl) {
    errEl.textContent = msg;
  }
}

function clearFieldErrors() {
  document.querySelectorAll('.field-error').forEach(el => {
    el.textContent = '';
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW: Yêu cầu mượn (#requests)
// ─────────────────────────────────────────────────────────────────────────────

function renderRequestsView() {
  const appMain = document.getElementById('appMain');
  const requests = Store.getRequests();
  const devices = Store.getDevices();
  const today = getToday();

  appMain.innerHTML = renderRequestsPage(requests, devices, currentRole, today);

  // Setup search input
  const searchInput = document.getElementById('requestSearch');
  if (searchInput) {
    searchInput.value = requestSearchTerm;
    searchInput.addEventListener('input', (e) => {
      requestSearchTerm = e.target.value;
      filterAndRenderRequestList();
    });
  }

  // Setup filter chips
  const chips = document.querySelectorAll('[data-filter-req-status]');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('chip-active'));
      chip.classList.add('chip-active');
      requestStatusFilter = chip.getAttribute('data-filter-req-status');
      filterAndRenderRequestList();
    });
  });

  // Admin: Xuất CSV
  const exportBtn = document.getElementById('exportCsvBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportRequestsToCSV);
  }

  // Admin: Nạp dữ liệu mẫu
  const resetBtn = document.getElementById('resetSeedBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', handleResetSeedData);
  }

  // Gắn event actions (Duyệt, Từ chối, Bàn giao, Trả)
  attachRequestActionEvents();
}

function filterAndRenderRequestList() {
  const list = document.getElementById('requestList');
  if (!list) return;

  const requests = Store.getRequests();
  const devices = Store.getDevices();
  const today = getToday();

  let filtered = requests;

  // Lọc trạng thái
  if (requestStatusFilter && requestStatusFilter !== 'all') {
    filtered = filtered.filter(r => r.status === requestStatusFilter);
  }

  // Tìm kiếm
  if (requestSearchTerm.trim()) {
    filtered = searchRequests(filtered, requestSearchTerm);
  }

  if (filtered.length === 0) {
    list.innerHTML = renderEmptyState('Không tìm thấy yêu cầu phù hợp', '📋');
  } else {
    list.innerHTML = filtered.map(r => renderRequestCard(r, devices, currentRole, today)).join('');
    attachRequestActionEvents();
  }
}

function attachRequestActionEvents() {
  const actionButtons = document.querySelectorAll('.action-btn');
  actionButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const requestId = btn.getAttribute('data-request-id');
      const newStatus = btn.getAttribute('data-new-status');
      await handleUpdateRequestStatus(requestId, newStatus);
    });
  });
}

/**
 * Xử lý đổi trạng thái yêu cầu từ phía người phụ trách
 */
async function handleUpdateRequestStatus(requestId, newStatus) {
  const requests = Store.getRequests();
  const devices = Store.getDevices();
  const request = requests.find(r => r.id === requestId);

  if (!request) {
    showToast(`Không tìm thấy yêu cầu ${requestId}`, 'error');
    return;
  }

  const oldStatus = request.status;
  if (oldStatus === newStatus) return;

  // 1. Nếu duyệt hoặc bàn giao: CHẶN TRÙNG LỊCH BẮT BUỘC
  if (newStatus === 'approved' || newStatus === 'borrowing') {
    const conflicts = findConflicts(request.deviceId, request.startDate, request.endDate, requests, devices, requestId);
    if (conflicts.length > 0) {
      const c = conflicts[0];
      const conflictMsg = `Không thể chuyển sang "${STATUS_LABELS.request[newStatus]}": Trùng lịch với yêu cầu ${c.request.id} (${c.request.borrowerName}: ${formatDate(c.request.startDate)} - ${formatDate(c.request.endDate)})`;
      showToast(conflictMsg, 'error');
      return;
    }
  }

  // 2. Xác nhận khi từ chối
  if (newStatus === 'rejected') {
    const confirmed = await showConfirm(`Bạn có chắc chắn muốn từ chối yêu cầu ${requestId} của ${request.borrowerName}?`, 'Từ chối');
    if (!confirmed) return;
  }

  // 3. Xác nhận khi trả thiết bị
  if (newStatus === 'returned') {
    const confirmed = await showConfirm(`Xác nhận thiết bị đã được ${request.borrowerName} trả về kho?`, 'Xác nhận trả', false);
    if (!confirmed) return;
  }

  // Cập nhật trạng thái yêu cầu
  request.status = newStatus;
  if (newStatus === 'returned') {
    request.returnedAt = new Date().toISOString();
  }

  Store.updateRequest(request);

  // Đồng bộ trạng thái thiết bị (Tính năng C)
  syncDeviceStatus(request.deviceId, newStatus);

  // Ghi nhật ký hoạt động
  Store.addLog({
    action: 'status_change',
    role: currentRole,
    detail: `Đổi trạng thái ${requestId} từ "${STATUS_LABELS.request[oldStatus]}" sang "${STATUS_LABELS.request[newStatus]}"`,
  });

  showToast(`Đã chuyển trạng thái ${requestId} thành: ${STATUS_LABELS.request[newStatus]}`);
  filterAndRenderRequestList();
}

/**
 * Tính năng C: Đồng bộ tình trạng thiết bị
 * - Yêu cầu -> 'borrowing' => thiết bị -> 'borrowing'
 * - Yêu cầu -> 'returned' => thiết bị -> 'available' (nếu không còn yêu cầu borrowing khác và không bảo trì)
 */
function syncDeviceStatus(deviceId, newRequestStatus) {
  const device = Store.getDevice(deviceId);
  if (!device || device.status === 'maintenance') return;

  if (newRequestStatus === 'borrowing') {
    if (device.status !== 'borrowing') {
      device.status = 'borrowing';
      Store.updateDevice(device);
    }
  } else if (newRequestStatus === 'returned') {
    // Kiểm tra xem có yêu cầu borrowing nào khác cho thiết bị này không
    const otherBorrowing = Store.getRequests().filter(r =>
      r.deviceId === deviceId && r.status === 'borrowing'
    );
    if (otherBorrowing.length === 0) {
      device.status = 'available';
      Store.updateDevice(device);
    }
  }
}

/**
 * Tính năng F: Xuất CSV UTF-8 BOM
 */
function exportRequestsToCSV() {
  const requests = Store.getRequests();
  const devices = Store.getDevices();

  const BOM = '\uFEFF';
  const headers = ['Mã YC', 'Người mượn', 'Mã thiết bị', 'Tên thiết bị', 'Ngày mượn', 'Ngày trả', 'Trạng thái', 'Thời điểm trả thực tế'];

  const rows = requests.map(r => {
    const d = devices.find(dev => dev.id === r.deviceId);
    return [
      r.id,
      r.borrowerName,
      r.deviceId,
      d ? d.name : '',
      formatDate(r.startDate),
      formatDate(r.endDate),
      STATUS_LABELS.request[r.status] || r.status,
      r.returnedAt ? formatDateTime(r.returnedAt) : '',
    ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
  });

  const csvContent = BOM + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Danh_sach_muon_thiet_bi_${getToday()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Đã xuất file CSV thành công (UTF-8 BOM hỗ trợ Excel)');
}

/**
 * Yêu cầu 6: Nút nạp lại dữ liệu mẫu
 */
async function handleResetSeedData() {
  const ok = await showConfirm(
    'Toàn bộ dữ liệu đã thêm hoặc chỉnh sửa sẽ bị xóa và đưa về trạng thái dữ liệu mẫu ban đầu của BTC. Bạn có chắc chắn không?',
    'Nạp lại dữ liệu mẫu',
    true
  );

  if (!ok) return;

  Store.resetToSeed();
  showToast('Đã nạp lại dữ liệu mẫu ban đầu thành công!', 'success');

  // Điều hướng về trang thiết bị
  window.location.hash = '#devices';
  renderDevicesView();
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW: Thống kê & Dashboard (#dashboard)
// ─────────────────────────────────────────────────────────────────────────────

function renderDashboardView() {
  const appMain = document.getElementById('appMain');
  const devices = Store.getDevices();
  const requests = Store.getRequests();
  const log = Store.getLog();
  const today = getToday();

  appMain.innerHTML = renderDashboardPage(devices, requests, currentRole, today, log);

  // Gắn event actions cho các yêu cầu xuất hiện trên dashboard
  attachRequestActionEvents();
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Worker cho PWA
// ─────────────────────────────────────────────────────────────────────────────

function registerServiceWorker() {
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(reg => {
          console.log('[PWA] Service Worker đăng ký thành công:', reg.scope);
        })
        .catch(err => {
          console.warn('[PWA] Đăng ký Service Worker thất bại:', err);
        });
    });
  }
}

// Khởi động ứng dụng khi DOM đã sẵn sàng
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
