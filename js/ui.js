/**
 * ui.js – Render helpers cho app MượnĐồ.
 * KHÔNG chứa logic nghiệp vụ, KHÔNG lưu state.
 * Toàn bộ comment bằng tiếng Việt.
 */

import {
  escapeHtml,
  STATUS_LABELS,
  STATUS_COLORS,
  formatDate,
  formatDateTime,
  isOverdue,
  parseDate,
  dateToISO,
} from './logic.js';

// ─────────────────────────────────────────────────────────────────────────────
// Badge trạng thái
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trả về HTML string an toàn cho badge trạng thái.
 * @param {string} status - giá trị trạng thái
 * @param {'device'|'request'} type
 * @returns {string} HTML string
 */
export function renderStatusBadge(status, type = 'request') {
  const label = STATUS_LABELS[type]?.[status] ?? status;
  const cls   = STATUS_COLORS[type]?.[status] ?? '';
  return `<span class="badge badge-${escapeHtml(status)} ${escapeHtml(cls)}">${escapeHtml(label)}</span>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Card thiết bị
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render card thiết bị (dùng cho cả mobile và desktop grid).
 * @param {Object} device
 * @param {'member'|'admin'} role
 * @param {string} today - 'YYYY-MM-DD'
 * @returns {string} HTML string
 */
export function renderDeviceCard(device, role, today) {
  const badge = renderStatusBadge(device.status, 'device');

  // Nút hành động tùy trạng thái + role
  let actionHtml = '';
  if (role === 'admin') {
    // Admin: dropdown đổi tình trạng
    const opts = [
      { value: 'available',   label: 'Sẵn sàng'   },
      { value: 'borrowing',   label: 'Đang mượn'  },
      { value: 'maintenance', label: 'Bảo trì'    },
    ]
      .map(o => `<option value="${o.value}"${device.status === o.value ? ' selected' : ''}>${o.label}</option>`)
      .join('');
    actionHtml = `
      <div class="device-admin-actions">
        <label class="sr-only" for="ds-${escapeHtml(device.id)}">Đổi tình trạng</label>
        <select class="device-status-select" id="ds-${escapeHtml(device.id)}"
                data-device-id="${escapeHtml(device.id)}" aria-label="Đổi tình trạng thiết bị">
          ${opts}
        </select>
      </div>`;
  } else {
    // Member: nút mượn nếu available
    if (device.status === 'available') {
      actionHtml = `
        <a href="#borrow?device=${escapeHtml(device.id)}"
           class="btn btn-primary btn-sm borrow-btn"
           data-device-id="${escapeHtml(device.id)}">
          📋 Đăng ký mượn
        </a>`;
    } else if (device.status === 'maintenance') {
      actionHtml = `<span class="badge badge-maintenance">Đang bảo trì</span>`;
    } else {
      actionHtml = `<span class="text-muted small">Hiện đang được mượn</span>`;
    }
  }

  return `
    <div class="device-card card" data-device-id="${escapeHtml(device.id)}" data-status="${escapeHtml(device.status)}">
      <div class="card-header">
        <span class="device-id text-muted">${escapeHtml(device.id)}</span>
        ${badge}
      </div>
      <div class="card-body">
        <h3 class="device-name">${escapeHtml(device.name)}</h3>
        <p class="device-type text-muted">${escapeHtml(device.type)}</p>
        ${device.note ? `<p class="device-note small">${escapeHtml(device.note)}</p>` : ''}
      </div>
      <div class="card-footer">
        ${actionHtml}
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Card / row yêu cầu
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render card yêu cầu (dùng cho danh sách và bảng).
 * @param {Object} request
 * @param {Array}  devices
 * @param {'member'|'admin'} role
 * @param {string} today - 'YYYY-MM-DD'
 * @returns {string} HTML string
 */
export function renderRequestCard(request, devices, role, today) {
  const device     = devices.find(d => d.id === request.deviceId);
  const deviceName = device ? device.name : request.deviceId;
  const overdue    = isOverdue(request, today);

  const badge = renderStatusBadge(request.status, 'request');
  const overdueTag = overdue
    ? `<span class="badge badge-overdue">⏰ Quá hạn</span>`
    : '';

  // Thời gian trả thực tế
  const returnedAtHtml = request.returnedAt
    ? `<div class="request-returned-at small text-muted">Trả thực tế: ${escapeHtml(formatDateTime(request.returnedAt))}</div>`
    : '';

  // Nút hành động cho admin
  let adminActions = '';
  if (role === 'admin') {
    const approvBtn = request.status === 'pending'
      ? `<button class="btn btn-success btn-xs action-btn"
                data-request-id="${escapeHtml(request.id)}"
                data-new-status="approved"
                title="Duyệt yêu cầu">✅ Duyệt</button>` : '';

    const rejectBtn = request.status === 'pending'
      ? `<button class="btn btn-danger btn-xs action-btn"
                data-request-id="${escapeHtml(request.id)}"
                data-new-status="rejected"
                title="Từ chối yêu cầu">❌ Từ chối</button>` : '';

    const activateBtn = request.status === 'approved'
      ? `<button class="btn btn-info btn-xs action-btn"
                data-request-id="${escapeHtml(request.id)}"
                data-new-status="borrowing"
                title="Xác nhận bàn giao thiết bị">📦 Bàn giao</button>` : '';

    const returnBtn = request.status === 'borrowing'
      ? `<button class="btn btn-secondary btn-xs action-btn"
                data-request-id="${escapeHtml(request.id)}"
                data-new-status="returned"
                title="Xác nhận đã trả">↩️ Xác nhận trả</button>` : '';

    if (approvBtn || rejectBtn || activateBtn || returnBtn) {
      adminActions = `<div class="request-actions">${approvBtn}${rejectBtn}${activateBtn}${returnBtn}</div>`;
    }
  }

  return `
    <div class="request-card card${overdue ? ' request-overdue' : ''}"
         data-request-id="${escapeHtml(request.id)}"
         data-status="${escapeHtml(request.status)}">
      <div class="card-header">
        <span class="request-id text-muted">${escapeHtml(request.id)}</span>
        <div class="request-badges">${badge}${overdueTag}</div>
      </div>
      <div class="card-body">
        <div class="request-info">
          <span class="request-borrower">👤 ${escapeHtml(request.borrowerName)}</span>
          <span class="request-device">📷 ${escapeHtml(deviceName)} <span class="text-muted">(${escapeHtml(request.deviceId)})</span></span>
          <span class="request-dates">
            📅 ${escapeHtml(formatDate(request.startDate))} → ${escapeHtml(formatDate(request.endDate))}
          </span>
        </div>
        ${returnedAtHtml}
      </div>
      ${adminActions ? `<div class="card-footer">${adminActions}</div>` : ''}
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast thông báo
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hiển thị toast thông báo. Tự biến mất sau 3 giây.
 * @param {string} message
 * @param {'success'|'error'|'warning'} type
 */
export function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: '✅', error: '❌', warning: '⚠️' };
  const icon  = icons[type] ?? '💬';

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-msg">${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  // Animate in (thêm class sau 1 frame để transition hoạt động)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('toast-visible'));
  });

  // Tự dismiss sau 3s
  const dismiss = () => {
    toast.classList.remove('toast-visible');
    toast.classList.add('toast-hiding');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    // Fallback nếu transition không fire
    setTimeout(() => toast.remove(), 400);
  };

  setTimeout(dismiss, 3000);
  toast.addEventListener('click', dismiss);
}

// ─────────────────────────────────────────────────────────────────────────────
// Hộp xác nhận
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hộp xác nhận modal. Trả về Promise<boolean>.
 * @param {string}  message
 * @param {string}  confirmText
 * @param {boolean} isDanger    - true → nút đỏ, false → nút xanh
 * @returns {Promise<boolean>}
 */
export function showConfirm(message, confirmText = 'Xác nhận', isDanger = true) {
  return new Promise(resolve => {
    // Xóa overlay cũ nếu còn
    document.getElementById('confirmOverlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'confirmOverlay';
    overlay.className = 'confirm-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Xác nhận hành động');
    overlay.innerHTML = `
      <div class="confirm-box">
        <p class="confirm-message">${escapeHtml(message)}</p>
        <div class="confirm-actions">
          <button class="btn btn-outline confirm-cancel-btn">Hủy</button>
          <button class="btn ${isDanger ? 'btn-danger' : 'btn-success'} confirm-ok-btn">
            ${escapeHtml(confirmText)}
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const cleanup = (result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.querySelector('.confirm-ok-btn').addEventListener('click',    () => cleanup(true));
    overlay.querySelector('.confirm-cancel-btn').addEventListener('click', () => cleanup(false));

    // Đóng khi click ra ngoài
    overlay.addEventListener('click', e => { if (e.target === overlay) cleanup(false); });

    // Hỗ trợ phím Escape
    const onKey = (e) => {
      if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); cleanup(false); }
      if (e.key === 'Enter')  { document.removeEventListener('keydown', onKey); cleanup(true);  }
    };
    document.addEventListener('keydown', onKey);

    // Focus nút mặc định
    requestAnimationFrame(() => overlay.querySelector('.confirm-ok-btn')?.focus());
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trả về HTML empty state thân thiện.
 * @param {string} message
 * @param {string} icon     - emoji
 * @param {string} actionHtml - HTML nút hành động (tùy chọn)
 * @returns {string}
 */
export function renderEmptyState(message, icon = '📭', actionHtml = '') {
  return `
    <div class="empty-state" role="status">
      <span class="empty-icon">${icon}</span>
      <p class="empty-message">${escapeHtml(message)}</p>
      ${actionHtml}
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard stats
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render grid thống kê tổng quan cho dashboard.
 * @param {Array}  devices
 * @param {Array}  requests
 * @param {string} today - 'YYYY-MM-DD'
 * @returns {string}
 */
export function renderDashboardStats(devices, requests, today) {
  const available    = devices.filter(d => d.status === 'available').length;
  const borrowingDev = devices.filter(d => d.status === 'borrowing').length;
  const maintenance  = devices.filter(d => d.status === 'maintenance').length;
  const pending      = requests.filter(r => r.status === 'pending').length;
  const overdue      = requests.filter(r => isOverdue(r, today)).length;
  const total        = devices.length;

  const stats = [
    { label: 'Tổng thiết bị',   value: total,        icon: '📦', cls: 'stat-total'       },
    { label: 'Sẵn sàng',        value: available,    icon: '✅', cls: 'stat-available'   },
    { label: 'Đang được mượn',  value: borrowingDev, icon: '📤', cls: 'stat-borrowing'   },
    { label: 'Bảo trì',         value: maintenance,  icon: '🔧', cls: 'stat-maintenance' },
    { label: 'Chờ duyệt',       value: pending,      icon: '⏳', cls: 'stat-pending'     },
    { label: 'Quá hạn',         value: overdue,      icon: '⏰', cls: `stat-overdue${overdue > 0 ? ' stat-warn' : ''}` },
  ];

  const cards = stats.map(s => `
    <div class="stat-card ${s.cls}">
      <span class="stat-icon">${s.icon}</span>
      <span class="stat-value">${s.value}</span>
      <span class="stat-label">${s.label}</span>
    </div>`).join('');

  return `<div class="stats-grid">${cards}</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lịch 30 ngày
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render lịch 30 ngày cho một thiết bị.
 * Ngày bận: class 'day-occupied', rảnh: 'day-free', hôm nay: 'day-today'.
 * Click ngày: dispatch CustomEvent 'calendar-date-select' với { start, end }.
 * @param {string} deviceId
 * @param {Array}  requests
 * @param {string} startDate - 'YYYY-MM-DD' ngày bắt đầu (mặc định: hôm nay)
 * @returns {string}
 */
export function renderCalendar(deviceId, requests, startDate) {
  // Lọc các yêu cầu approved/borrowing của thiết bị
  const busyRequests = requests.filter(r =>
    r.deviceId === deviceId &&
    (r.status === 'approved' || r.status === 'borrowing')
  );

  const days = [];
  const start = parseDate(startDate);

  for (let i = 0; i < 30; i++) {
    const dayDate = new Date(start.getTime());
    dayDate.setUTCDate(dayDate.getUTCDate() + i);
    const dayISO = dateToISO(dayDate);

    // Kiểm tra ngày này có bận không
    const busy = busyRequests.find(r => r.startDate <= dayISO && dayISO <= r.endDate);

    // Tính class
    let cls = busy ? 'day-occupied' : 'day-free';
    if (dayISO === startDate) cls += ' day-today';

    // Hiển thị ngày (1-30)
    const dayNum = dayDate.getUTCDate();
    const monthNum = dayDate.getUTCMonth() + 1;

    // Tooltip cho ngày bận
    const title = busy
      ? `Đã mượn bởi ${busy.borrowerName} (${busy.id})`
      : `Trống – ${dayNum}/${monthNum}`;

    days.push(`
      <button class="cal-day ${cls}"
              data-date="${dayISO}"
              title="${escapeHtml(title)}"
              aria-label="${escapeHtml(title)}"
              ${busy ? 'disabled aria-disabled="true"' : ''}>
        <span class="cal-day-num">${dayNum}</span>
        ${i === 0 || dayNum === 1 ? `<span class="cal-month-label">${monthNum}</span>` : ''}
      </button>`);
  }

  // Tên các ngày trong tuần
  const weekLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
    .map(d => `<span class="cal-week-label">${d}</span>`).join('');

  // Tính offset để canh đúng thứ trong tuần
  const firstDow = start.getUTCDay(); // 0=CN
  const offset = firstDow > 0 ? Array(firstDow).fill('<span class="cal-day-empty"></span>').join('') : '';

  return `
    <div class="calendar" data-device-id="${escapeHtml(deviceId)}">
      <div class="cal-week-header">${weekLabels}</div>
      <div class="cal-grid" style="--first-col: ${firstDow + 1}">
        ${offset}
        ${days.join('')}
      </div>
      <div class="cal-legend">
        <span class="legend-free">□ Trống</span>
        <span class="legend-occupied">■ Bận</span>
        <span class="legend-today">◆ Hôm nay</span>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Nhật ký hoạt động
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render nhật ký hoạt động (activity log).
 * @param {Array} log - mảng entry từ Store.getLog()
 * @returns {string}
 */
export function renderActivityLog(log) {
  if (!log || log.length === 0) {
    return renderEmptyState('Chưa có hoạt động nào', '📋');
  }

  // Icon theo hành động
  const actionIcon = {
    'create':        '📝',
    'status-change': '🔄',
    'device-status': '🔧',
    'add-device':    '➕',
  };

  const rows = log.map(entry => {
    const icon = actionIcon[entry.action] ?? '📋';
    const time = entry.timestamp ? formatDateTime(entry.timestamp) : '';
    const roleBadge = entry.role === 'admin'
      ? `<span class="badge badge-admin">Admin</span>`
      : `<span class="badge badge-member">Thành viên</span>`;

    return `
      <div class="log-entry">
        <span class="log-icon">${icon}</span>
        <div class="log-body">
          <span class="log-detail">${escapeHtml(entry.detail ?? '')}</span>
          <span class="log-meta">${roleBadge} · ${escapeHtml(time)}</span>
        </div>
      </div>`;
  }).join('');

  return `<div class="activity-log">${rows}</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Form mượn
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render form tạo yêu cầu mượn thiết bị.
 * @param {Array}       devices
 * @param {string|null} selectedDeviceId - preselect
 * @returns {string}
 */
export function renderBorrowForm(devices, selectedDeviceId = null) {
  // Chỉ hiện thiết bị không phải maintenance
  const selectableDevices = devices.filter(d => d.status !== 'maintenance');

  const deviceOptions = selectableDevices.length > 0
    ? selectableDevices.map(d => {
        const label = `${escapeHtml(d.name)} (${escapeHtml(d.id)}) – ${d.status === 'available' ? 'Sẵn sàng' : 'Đang mượn'}`;
        return `<option value="${escapeHtml(d.id)}"${d.id === selectedDeviceId ? ' selected' : ''}>${label}</option>`;
      }).join('')
    : `<option value="" disabled>Không có thiết bị khả dụng</option>`;

  return `
    <section class="page-section" id="borrowPage">
      <h2 class="page-title">📋 Đăng ký mượn thiết bị</h2>
      <form id="borrowForm" class="form-card" novalidate>

        <!-- Chọn thiết bị -->
        <div class="form-group" id="fg-deviceId">
          <label class="form-label" for="deviceSelect">Thiết bị <span class="required">*</span></label>
          <select id="deviceSelect" name="deviceId" class="form-control" required>
            <option value="">-- Chọn thiết bị --</option>
            ${deviceOptions}
          </select>
          <span class="field-error" id="err-deviceId" aria-live="polite"></span>
        </div>

        <!-- Lịch thiết bị (ẩn ban đầu) -->
        <div id="deviceCalendarWrap" class="calendar-wrap" hidden>
          <h3 class="calendar-title">📅 Lịch thiết bị (30 ngày)</h3>
          <div id="deviceCalendar"></div>
        </div>

        <!-- Họ tên -->
        <div class="form-group" id="fg-borrowerName">
          <label class="form-label" for="borrowerName">Họ và tên <span class="required">*</span></label>
          <input id="borrowerName" name="borrowerName" type="text"
                 class="form-control" placeholder="Nhập họ tên đầy đủ" required minlength="2" autocomplete="name" />
          <span class="field-error" id="err-borrowerName" aria-live="polite"></span>
        </div>

        <!-- Ngày mượn -->
        <div class="form-group" id="fg-startDate">
          <label class="form-label" for="startDate">Ngày mượn <span class="required">*</span></label>
          <input id="startDate" name="startDate" type="date" class="form-control" required />
          <span class="field-error" id="err-startDate" aria-live="polite"></span>
        </div>

        <!-- Ngày trả -->
        <div class="form-group" id="fg-endDate">
          <label class="form-label" for="endDate">Ngày trả <span class="required">*</span></label>
          <input id="endDate" name="endDate" type="date" class="form-control" required />
          <span class="field-error" id="err-endDate" aria-live="polite"></span>
        </div>

        <!-- Cảnh báo trùng lịch (ẩn ban đầu) -->
        <div id="conflictWarning" class="conflict-warning" hidden role="alert" aria-live="assertive"></div>

        <!-- Nút submit -->
        <div class="form-actions">
          <a href="#requests" class="btn btn-outline">← Quay lại</a>
          <button type="submit" class="btn btn-primary" id="borrowSubmitBtn">
            📤 Gửi yêu cầu
          </button>
        </div>
      </form>
    </section>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Trang thiết bị
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render trang quản lý thiết bị với search + filter.
 * @param {Array}  devices
 * @param {Array}  requests
 * @param {'member'|'admin'} role
 * @param {string} today
 * @returns {string}
 */
export function renderDevicesPage(devices, requests, role, today) {
  // Lấy danh sách loại thiết bị unique
  const types = [...new Set(devices.map(d => d.type))].sort();

  const typeFilterHtml = types.map(t =>
    `<button class="chip" data-filter-type="${escapeHtml(t)}">${escapeHtml(t)}</button>`
  ).join('');

  const addDeviceBtn = role === 'admin'
    ? `<button class="btn btn-primary" id="addDeviceBtn">➕ Thêm thiết bị</button>`
    : '';

  // Form thêm thiết bị (ẩn mặc định, admin mới có)
  const addDeviceForm = role === 'admin' ? renderAddDeviceForm() : '';

  const deviceCards = devices.length > 0
    ? devices.map(d => renderDeviceCard(d, role, today)).join('')
    : renderEmptyState('Chưa có thiết bị nào', '📦');

  return `
    <section class="page-section" id="devicesPage">
      <div class="page-header">
        <h2 class="page-title">📦 Thiết bị</h2>
        ${addDeviceBtn}
      </div>

      <!-- Form thêm thiết bị (ẩn mặc định) -->
      ${addDeviceForm}

      <!-- Search -->
      <div class="search-bar-wrap">
        <input type="search" id="deviceSearch" class="search-bar"
               placeholder="🔍 Tìm thiết bị (tên, mã)…" aria-label="Tìm thiết bị"
               autocomplete="off" />
      </div>

      <!-- Filter chips trạng thái -->
      <div class="filter-chips" role="group" aria-label="Lọc theo trạng thái">
        <button class="chip chip-active" data-filter-status="all">Tất cả</button>
        <button class="chip" data-filter-status="available">✅ Sẵn sàng</button>
        <button class="chip" data-filter-status="borrowing">📤 Đang mượn</button>
        <button class="chip" data-filter-status="maintenance">🔧 Bảo trì</button>
      </div>

      <!-- Filter loại thiết bị -->
      ${types.length > 1 ? `
      <div class="filter-chips filter-type-chips" role="group" aria-label="Lọc theo loại">
        <button class="chip chip-active" data-filter-type="all">Tất cả loại</button>
        ${typeFilterHtml}
      </div>` : ''}

      <!-- Grid cards -->
      <div class="device-grid" id="deviceGrid">
        ${deviceCards}
      </div>
    </section>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Trang yêu cầu
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render trang quản lý yêu cầu.
 * @param {Array}  requests
 * @param {Array}  devices
 * @param {'member'|'admin'} role
 * @param {string} today
 * @returns {string}
 */
export function renderRequestsPage(requests, devices, role, today) {
  const adminToolbar = role === 'admin' ? `
    <div class="admin-toolbar">
      <button class="btn btn-outline btn-sm" id="exportCsvBtn">📊 Xuất CSV</button>
      <button class="btn btn-outline btn-sm btn-warning" id="resetSeedBtn">🔄 Nạp dữ liệu mẫu</button>
    </div>` : '';

  const memberNote = role === 'member' ? `
    <div class="info-banner">
      <span>ℹ️ Hiển thị tất cả yêu cầu (không có xác thực người dùng)</span>
    </div>` : '';

  const requestCards = requests.length > 0
    ? requests.map(r => renderRequestCard(r, devices, role, today)).join('')
    : renderEmptyState('Chưa có yêu cầu nào', '📋',
        `<a href="#borrow" class="btn btn-primary">📋 Đăng ký mượn</a>`);

  return `
    <section class="page-section" id="requestsPage">
      <div class="page-header">
        <h2 class="page-title">📋 Yêu cầu mượn</h2>
        ${adminToolbar}
      </div>

      ${memberNote}

      <!-- Search -->
      <div class="search-bar-wrap">
        <input type="search" id="requestSearch" class="search-bar"
               placeholder="🔍 Tìm theo tên hoặc mã thiết bị…" aria-label="Tìm yêu cầu"
               autocomplete="off" />
      </div>

      <!-- Filter chips trạng thái -->
      <div class="filter-chips" role="group" aria-label="Lọc theo trạng thái">
        <button class="chip chip-active" data-filter-req-status="all">Tất cả</button>
        <button class="chip" data-filter-req-status="pending">⏳ Chờ duyệt</button>
        <button class="chip" data-filter-req-status="approved">✅ Đã duyệt</button>
        <button class="chip" data-filter-req-status="borrowing">📤 Đang mượn</button>
        <button class="chip" data-filter-req-status="returned">↩️ Đã trả</button>
        <button class="chip" data-filter-req-status="rejected">❌ Từ chối</button>
      </div>

      <!-- Danh sách yêu cầu -->
      <div class="request-list" id="requestList">
        ${requestCards}
      </div>
    </section>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Trang dashboard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render trang tổng quan (dashboard).
 * @param {Array}  devices
 * @param {Array}  requests
 * @param {'member'|'admin'} role
 * @param {string} today
 * @param {Array}  log
 * @returns {string}
 */
export function renderDashboardPage(devices, requests, role, today, log) {
  const stats = renderDashboardStats(devices, requests, today);

  // Yêu cầu chờ duyệt (quá hạn hoặc pending)
  const pendingReqs = requests.filter(r => r.status === 'pending');
  const overdueReqs = requests.filter(r => isOverdue(r, today));

  const pendingSection = pendingReqs.length > 0
    ? `
    <div class="dashboard-section">
      <h3 class="section-title">⏳ Chờ duyệt (${pendingReqs.length})</h3>
      <div class="request-list">
        ${pendingReqs.slice(0, 5).map(r => renderRequestCard(r, devices, role, today)).join('')}
        ${pendingReqs.length > 5 ? `<a href="#requests" class="see-all-link">Xem tất cả ${pendingReqs.length} yêu cầu →</a>` : ''}
      </div>
    </div>` : '';

  const overdueSection = overdueReqs.length > 0
    ? `
    <div class="dashboard-section">
      <h3 class="section-title overdue-title">⏰ Quá hạn (${overdueReqs.length})</h3>
      <div class="request-list">
        ${overdueReqs.map(r => renderRequestCard(r, devices, role, today)).join('')}
      </div>
    </div>` : '';

  const activitySection = `
    <div class="dashboard-section">
      <h3 class="section-title">📋 Nhật ký hoạt động</h3>
      ${renderActivityLog(log)}
    </div>`;

  return `
    <section class="page-section" id="dashboardPage">
      <div class="page-header">
        <h2 class="page-title">🏠 Tổng quan</h2>
      </div>

      ${stats}

      ${overdueSection}
      ${pendingSection}
      ${activitySection}
    </section>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Form thêm thiết bị (admin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render form thêm thiết bị mới (admin only).
 * @returns {string}
 */
export function renderAddDeviceForm() {
  return `
    <div id="addDeviceFormWrap" class="form-card" hidden>
      <h3 class="form-title">➕ Thêm thiết bị mới</h3>
      <form id="addDeviceForm" novalidate>
        <div class="form-group">
          <label class="form-label" for="newDeviceName">Tên thiết bị <span class="required">*</span></label>
          <input id="newDeviceName" type="text" class="form-control"
                 placeholder="VD: Máy chiếu Epson" required minlength="2" />
        </div>
        <div class="form-group">
          <label class="form-label" for="newDeviceType">Loại thiết bị <span class="required">*</span></label>
          <input id="newDeviceType" type="text" class="form-control"
                 placeholder="VD: Máy chiếu, Âm thanh, Phụ kiện…" required list="deviceTypeList" />
          <datalist id="deviceTypeList">
            <option value="Máy ảnh">
            <option value="Phụ kiện">
            <option value="Âm thanh">
            <option value="Ánh sáng">
            <option value="Máy tính">
          </datalist>
        </div>
        <div class="form-group">
          <label class="form-label" for="newDeviceNote">Ghi chú</label>
          <input id="newDeviceNote" type="text" class="form-control"
                 placeholder="VD: Kèm cáp HDMI" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" id="cancelAddDeviceBtn">Hủy</button>
          <button type="submit" class="btn btn-primary">➕ Thêm thiết bị</button>
        </div>
      </form>
    </div>`;
}
