/**
 * logic.js – Pure functions, KHÔNG chạm DOM.
 * Toàn bộ comment bằng tiếng Việt.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Xử lý chuỗi / tìm kiếm
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bảng chuyển đổi ký tự có dấu -> không dấu để tìm kiếm không phân biệt dấu.
 * Dùng Unicode NFD: tách ký tự gốc + combining diacritics rồi xóa combining marks.
 */
export function removeAccents(str) {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // xóa combining diacritical marks
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function normalizeSearch(str) {
  return removeAccents(str).toLowerCase().replace(/\s+/g, ' ').trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Xử lý ngày tháng
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse chuỗi 'YYYY-MM-DD' thành Date UTC midnight.
 * Tránh lệch múi giờ khi dùng new Date('YYYY-MM-DD') trực tiếp.
 */
export function parseDate(isoStr) {
  if (!isoStr) return null;
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Format 'YYYY-MM-DD' -> 'DD/MM/YYYY' để hiển thị.
 * VD: '2026-11-21' -> '21/11/2026'
 */
export function formatDate(isoStr) {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Chuyển Date object -> chuỗi 'YYYY-MM-DD' (UTC).
 */
export function dateToISO(date) {
  if (!date) return '';
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format full ISO datetime string -> 'HH:mm dd/mm/yyyy' (giờ local).
 * VD: '2026-11-16T13:00:00.000Z' -> '20:00 16/11/2026' (nếu UTC+7)
 */
export function formatDateTime(isoStr) {
  if (!isoStr) return '';
  const dt = new Date(isoStr);
  const hh = String(dt.getHours()).padStart(2, '0');
  const mi = String(dt.getMinutes()).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${hh}:${mi} ${dd}/${mm}/${yyyy}`;
}

/**
 * Lấy ngày hôm nay dạng 'YYYY-MM-DD' (local timezone).
 */
export function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Logic kiểm tra ngày / trùng lịch
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kiểm tra 2 khoảng ngày có chồng lấn không.
 * Chồng lấn khi: aStart <= bEnd VÀ bStart <= aEnd (tính cả biên).
 * QUAN TRỌNG: so sánh string ISO được vì format YYYY-MM-DD
 * so sánh lexicographic = chronologic.
 *
 * @param {string} aStart - 'YYYY-MM-DD'
 * @param {string} aEnd   - 'YYYY-MM-DD'
 * @param {string} bStart - 'YYYY-MM-DD'
 * @param {string} bEnd   - 'YYYY-MM-DD'
 * @returns {boolean}
 */
export function datesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

/**
 * Tìm các yêu cầu trùng lịch với khoảng ngày cho trước.
 * Chỉ 'approved' và 'borrowing' mới chiếm lịch ('pending' không tính).
 *
 * @param {string} deviceId
 * @param {string} startDate - 'YYYY-MM-DD'
 * @param {string} endDate   - 'YYYY-MM-DD'
 * @param {Array}  requests  - mảng request objects
 * @param {Array}  devices   - mảng device objects (để join info)
 * @param {string|null} excludeRequestId - bỏ qua YC này (khi edit)
 * @returns {Array<{ request, device }>}
 */
export function findConflicts(deviceId, startDate, endDate, requests, devices, excludeRequestId = null) {
  return requests
    .filter(r =>
      r.deviceId === deviceId &&
      r.id !== excludeRequestId &&
      (r.status === 'approved' || r.status === 'borrowing') &&
      datesOverlap(startDate, endDate, r.startDate, r.endDate)
    )
    .map(r => ({
      request: r,
      device: devices.find(d => d.id === r.deviceId) || null,
    }));
}

/**
 * Tìm ngày rảnh gần nhất cho thiết bị sau một ngày cho trước.
 * Xét tất cả YC có status 'approved' hoặc 'borrowing'.
 *
 * @param {string} deviceId
 * @param {Array}  requests
 * @param {string} afterDate - 'YYYY-MM-DD' – tìm sau ngày này
 * @returns {string|null} 'YYYY-MM-DD' hoặc null nếu không có lịch bận nào
 */
export function findNextAvailableDate(deviceId, requests, afterDate) {
  // Lọc các khoảng bận của thiết bị, sắp theo startDate
  const busyPeriods = requests
    .filter(r =>
      r.deviceId === deviceId &&
      (r.status === 'approved' || r.status === 'borrowing')
    )
    .sort((a, b) => (a.startDate > b.startDate ? 1 : -1));

  if (busyPeriods.length === 0) return afterDate;

  // Duyệt từng khoảng bận, hợp nhất nếu chồng nhau, tìm ngày sau khoảng cuối
  // Nếu afterDate còn rảnh thì trả ngay afterDate
  let candidate = afterDate;

  // Lặp cho đến khi candidate không còn bị chặn bởi bất kỳ khoảng bận nào
  let changed = true;
  while (changed) {
    changed = false;
    for (const period of busyPeriods) {
      // Nếu candidate nằm trong khoảng bận [startDate, endDate]
      if (candidate >= period.startDate && candidate <= period.endDate) {
        // Nhảy sang ngày tiếp theo sau khi khoảng bận kết thúc
        const nextDay = parseDate(period.endDate);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        candidate = dateToISO(nextDay);
        changed = true;
        break; // kiểm tra lại từ đầu với candidate mới
      }
    }
  }

  return candidate;
}

/**
 * Tìm thiết bị cùng loại còn rảnh trong khoảng ngày (gợi ý thay thế).
 * Bỏ qua thiết bị đang maintenance và những cái có conflict.
 *
 * @param {string} deviceType
 * @param {string} startDate
 * @param {string} endDate
 * @param {Array}  devices
 * @param {Array}  requests
 * @returns {Array} mảng device objects còn rảnh
 */
export function findAlternativeDevices(deviceType, startDate, endDate, devices, requests) {
  return devices.filter(d =>
    d.type === deviceType &&
    d.status !== 'maintenance' &&
    findConflicts(d.id, startDate, endDate, requests, devices).length === 0
  );
}

/**
 * Tạo thông báo trùng lịch thân thiện tiếng Việt.
 * VD: "Micro USB (TB-03) đã được Bình Trần mượn từ 21/11/2026 đến 21/11/2026 (YC-102).
 *      Vui lòng chọn ngày khác."
 *
 * @param {Array}       conflicts    - kết quả của findConflicts
 * @param {Array}       devices      - mảng device objects
 * @param {string|null} nextAvailable - 'YYYY-MM-DD' ngày rảnh gần nhất
 * @param {Array}       alternatives  - thiết bị thay thế
 * @returns {string}
 */
export function buildConflictMessage(conflicts, devices, nextAvailable, alternatives) {
  const lines = [];

  for (const { request, device } of conflicts) {
    const devName = device ? device.name : request.deviceId;
    const devId   = request.deviceId;
    const borrower = request.borrowerName;
    const from = formatDate(request.startDate);
    const to   = formatDate(request.endDate);
    const reqId = request.id;

    if (request.startDate === request.endDate) {
      lines.push(`${devName} (${devId}) đã được ${borrower} mượn vào ngày ${from} (${reqId}).`);
    } else {
      lines.push(`${devName} (${devId}) đã được ${borrower} mượn từ ${from} đến ${to} (${reqId}).`);
    }
  }

  lines.push('Vui lòng chọn ngày khác.');

  // Gợi ý ngày rảnh gần nhất
  if (nextAvailable) {
    lines.push(`📅 Ngày rảnh gần nhất: ${formatDate(nextAvailable)}.`);
  }

  // Gợi ý thiết bị thay thế
  if (alternatives && alternatives.length > 0) {
    const altNames = alternatives.map(d => `${d.name} (${d.id})`).join(', ');
    lines.push(`💡 Thiết bị cùng loại còn rảnh: ${altNames}.`);
  }

  return lines.join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Validate yêu cầu mượn
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate một yêu cầu mượn thiết bị.
 *
 * @param {{ deviceId, borrowerName, startDate, endDate }} fields
 * @param {Array}       devices
 * @param {Array}       requests
 * @param {string}      today         - 'YYYY-MM-DD' ngày hiện tại
 * @param {string|null} excludeId     - bỏ qua YC này khi validate (edit mode)
 * @param {boolean}     skipPastCheck - true khi validate dữ liệu mẫu (không check quá khứ)
 * @returns {{ valid: boolean, errors: Object, conflictMessage: string|null }}
 */
export function validateRequest(
  { deviceId, borrowerName, startDate, endDate },
  devices,
  requests,
  today,
  excludeId = null,
  skipPastCheck = false
) {
  const errors = {};
  let conflictMessage = null;

  // ── Kiểm tra bắt buộc ──
  if (!deviceId) errors.deviceId = 'Vui lòng chọn thiết bị';
  if (!borrowerName || borrowerName.trim().length < 2) {
    errors.borrowerName = 'Họ tên tối thiểu 2 ký tự';
  }
  if (!startDate) errors.startDate = 'Vui lòng chọn ngày mượn';
  if (!endDate)   errors.endDate   = 'Vui lòng chọn ngày trả';

  // ── Kiểm tra logic ngày ──
  if (startDate && endDate && endDate < startDate) {
    errors.endDate = 'Ngày trả không được trước ngày mượn';
  }
  if (startDate && !skipPastCheck && startDate < today) {
    errors.startDate = 'Ngày mượn không được trong quá khứ';
  }

  // ── Kiểm tra trạng thái thiết bị ──
  if (deviceId) {
    const device = devices.find(d => d.id === deviceId);
    if (device && device.status === 'maintenance') {
      errors.deviceId = 'Thiết bị đang bảo trì, không nhận đăng ký mượn';
    }
  }

  // ── Kiểm tra trùng lịch (chỉ khi không có lỗi cơ bản) ──
  if (Object.keys(errors).length === 0 && deviceId && startDate && endDate) {
    const conflicts = findConflicts(deviceId, startDate, endDate, requests, devices, excludeId);
    if (conflicts.length > 0) {
      const device = devices.find(d => d.id === deviceId);
      const nextAvail = findNextAvailableDate(deviceId, requests, endDate);
      const alts = device
        ? findAlternativeDevices(device.type, startDate, endDate, devices, requests)
            .filter(d => d.id !== deviceId)
        : [];
      conflictMessage = buildConflictMessage(conflicts, devices, nextAvail, alts);
    }
  }

  return {
    valid: Object.keys(errors).length === 0 && !conflictMessage,
    errors,
    conflictMessage,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tìm kiếm
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tìm kiếm yêu cầu theo tên người mượn hoặc mã thiết bị.
 * Hỗ trợ: không dấu, không phân biệt hoa thường, bỏ dấu gạch ngang.
 *
 * @param {Array}  requests
 * @param {string} keyword
 * @returns {Array}
 */
export function searchRequests(requests, keyword) {
  if (!keyword.trim()) return requests;
  const norm = normalizeSearch(keyword);
  return requests.filter(r => {
    const nameNorm  = normalizeSearch(r.borrowerName);
    // so sánh cả dạng có và không có dấu gạch ngang: 'TB-03' vs 'tb03'
    const idNorm    = r.deviceId.toLowerCase().replace(/-/g, '');
    const idWithDash = r.deviceId.toLowerCase();
    const kwNorm    = norm.replace(/-/g, '');
    return (
      nameNorm.includes(norm) ||
      idNorm.includes(kwNorm) ||
      idWithDash.includes(norm)
    );
  });
}

/**
 * Tìm kiếm thiết bị theo tên hoặc mã.
 *
 * @param {Array}  devices
 * @param {string} keyword
 * @returns {Array}
 */
export function searchDevices(devices, keyword) {
  if (!keyword.trim()) return devices;
  const norm = normalizeSearch(keyword);
  return devices.filter(d => {
    const nameNorm = normalizeSearch(d.name);
    const idNorm   = d.id.toLowerCase().replace(/-/g, '');
    const kwNorm   = norm.replace(/-/g, '');
    return nameNorm.includes(norm) || idNorm.includes(kwNorm);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Trạng thái / tiện ích
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kiểm tra yêu cầu có bị quá hạn không.
 * Quá hạn: đang mượn (borrowing) nhưng endDate đã qua ngày hôm nay.
 */
export function isOverdue(request, today) {
  return request.status === 'borrowing' && request.endDate < today;
}

/**
 * Escape HTML để chống XSS – LUÔN dùng khi render dữ liệu người dùng vào innerHTML.
 */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─────────────────────────────────────────────────────────────────────────────
// Hằng số nhãn trạng thái
// ─────────────────────────────────────────────────────────────────────────────

/** Nhãn hiển thị cho từng trạng thái */
export const STATUS_LABELS = {
  device: {
    available:   'Sẵn sàng',
    borrowing:   'Đang mượn',
    maintenance: 'Bảo trì',
  },
  request: {
    pending:   'Chờ duyệt',
    approved:  'Đã duyệt',
    borrowing: 'Đang mượn',
    returned:  'Đã trả',
    rejected:  'Từ chối',
  },
};

/** CSS class tương ứng với trạng thái (dùng với file CSS riêng) */
export const STATUS_COLORS = {
  device: {
    available:   'status-available',
    borrowing:   'status-borrowing',
    maintenance: 'status-maintenance',
  },
  request: {
    pending:   'status-pending',
    approved:  'status-approved',
    borrowing: 'status-borrowing',
    returned:  'status-returned',
    rejected:  'status-rejected',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Chạy tất cả test cases, trả về mảng kết quả.
 * Gọi từ console: import { runTests } from './js/logic.js'; console.table(runTests());
 *
 * @returns {Array<{ name: string, passed: boolean, message?: string }>}
 */
export function runTests() {
  const results = [];
  const pass = (name) => results.push({ name, passed: true });
  const fail = (name, msg) => results.push({ name, passed: false, message: msg });

  // ── Test 1: datesOverlap ──────────────────────────────────────────────────
  datesOverlap('2026-11-21', '2026-11-21', '2026-11-21', '2026-11-21') === true
    ? pass('T1a: [21,21]∩[21,21]=true')
    : fail('T1a', 'kỳ vọng true');

  datesOverlap('2026-11-21', '2026-11-22', '2026-11-22', '2026-11-23') === true
    ? pass('T1b: [21,22]∩[22,23]=true (biên)')
    : fail('T1b', 'kỳ vọng true (biên chạm)');

  datesOverlap('2026-11-21', '2026-11-21', '2026-11-22', '2026-11-22') === false
    ? pass('T1c: [21,21]∩[22,22]=false')
    : fail('T1c', 'kỳ vọng false (không chạm)');

  // ── Test 2: validateRequest – logic ngày ─────────────────────────────────
  const mockDevices = [{ id: 'TB-X', name: 'Test', type: 'Test', status: 'available', note: '' }];

  const r1 = validateRequest(
    { deviceId: 'TB-X', borrowerName: 'Test User', startDate: '2026-11-21', endDate: '2026-11-21' },
    mockDevices, [], '2026-11-16', null, true
  );
  r1.valid
    ? pass('T2a: endDate=startDate -> valid')
    : fail('T2a', JSON.stringify(r1.errors));

  const r2 = validateRequest(
    { deviceId: 'TB-X', borrowerName: 'Test User', startDate: '2026-11-22', endDate: '2026-11-21' },
    mockDevices, [], '2026-11-16', null, true
  );
  r2.errors.endDate
    ? pass('T2b: endDate<startDate -> error')
    : fail('T2b', 'kỳ vọng lỗi endDate');

  // ── Test 3: Thiết bị Bảo trì ─────────────────────────────────────────────
  const maintDevices = [{ id: 'TB-04', name: 'Đèn LED', type: 'Ánh sáng', status: 'maintenance', note: '' }];
  const r3 = validateRequest(
    { deviceId: 'TB-04', borrowerName: 'Test', startDate: '2026-11-25', endDate: '2026-11-25' },
    maintDevices, [], '2026-11-16', null, true
  );
  r3.errors.deviceId
    ? pass('T3: TB-04 maintenance -> error')
    : fail('T3', 'kỳ vọng lỗi deviceId maintenance');

  // ── Test 4: TB-03 trùng YC-102 (approved 21/11-21/11) ───────────────────
  const devs  = [{ id: 'TB-03', name: 'Micro USB', type: 'Âm thanh', status: 'available', note: '' }];
  const reqs  = [{ id: 'YC-102', borrowerName: 'Bình Trần', deviceId: 'TB-03', startDate: '2026-11-21', endDate: '2026-11-21', status: 'approved' }];

  const r4 = validateRequest(
    { deviceId: 'TB-03', borrowerName: 'An', startDate: '2026-11-21', endDate: '2026-11-21' },
    devs, reqs, '2026-11-16', null, true
  );
  r4.conflictMessage
    ? pass('T4: TB-03 21/11 trùng YC-102 -> conflict')
    : fail('T4', 'kỳ vọng conflictMessage');

  // ── Test 5: TB-03 22/11-22/11 -> hợp lệ ─────────────────────────────────
  const r5 = validateRequest(
    { deviceId: 'TB-03', borrowerName: 'An', startDate: '2026-11-22', endDate: '2026-11-22' },
    devs, reqs, '2026-11-16', null, true
  );
  r5.valid
    ? pass('T5: TB-03 22/11 -> valid')
    : fail('T5', JSON.stringify(r5));

  // ── Test 7: pending không gây trùng ─────────────────────────────────────
  const pendingReqs = [{ id: 'YC-999', borrowerName: 'Test', deviceId: 'TB-03', startDate: '2026-11-21', endDate: '2026-11-21', status: 'pending' }];
  const r7 = validateRequest(
    { deviceId: 'TB-03', borrowerName: 'An', startDate: '2026-11-21', endDate: '2026-11-21' },
    devs, pendingReqs, '2026-11-16', null, true
  );
  r7.valid
    ? pass('T7: pending không gây trùng')
    : fail('T7', JSON.stringify(r7));

  // ── Test 8: Tìm kiếm ─────────────────────────────────────────────────────
  const mockRequests = [
    { id: 'YC-102', borrowerName: 'Bình Trần', deviceId: 'TB-03', startDate: '2026-11-21', endDate: '2026-11-21', status: 'approved' },
  ];

  searchRequests(mockRequests, 'binh').length > 0
    ? pass('T8a: tìm "binh" -> Bình Trần')
    : fail('T8a', 'không tìm thấy Bình Trần với từ khóa "binh"');

  searchRequests(mockRequests, 'TB-03').length > 0
    ? pass('T8b: tìm "TB-03"')
    : fail('T8b', 'không tìm thấy với TB-03');

  searchRequests(mockRequests, 'tb03').length > 0
    ? pass('T8c: tìm "tb03"')
    : fail('T8c', 'không tìm thấy với tb03 (không có dấu gạch)');

  // ── Test 9: removeAccents ────────────────────────────────────────────────
  removeAccents('Bình Trần') === 'Binh Tran'
    ? pass('T9a: removeAccents "Bình Trần" -> "Binh Tran"')
    : fail('T9a', `kết quả: "${removeAccents('Bình Trần')}"`);

  removeAccents('đèn LED') === 'den LED'
    ? pass('T9b: removeAccents "đèn LED" -> "den LED"')
    : fail('T9b', `kết quả: "${removeAccents('đèn LED')}"`);

  // ── Test 10: formatDate ──────────────────────────────────────────────────
  formatDate('2026-11-21') === '21/11/2026'
    ? pass('T10: formatDate "2026-11-21" -> "21/11/2026"')
    : fail('T10', `kết quả: "${formatDate('2026-11-21')}"`);

  // ── Test 11: findNextAvailableDate ───────────────────────────────────────
  const busyReqs = [
    { id: 'R1', deviceId: 'TB-X', startDate: '2026-11-20', endDate: '2026-11-22', status: 'approved' },
    { id: 'R2', deviceId: 'TB-X', startDate: '2026-11-23', endDate: '2026-11-25', status: 'borrowing' },
  ];
  // Sau 22/11 -> nhảy qua khoảng 23-25 -> ngày rảnh 26/11
  const nextAvail = findNextAvailableDate('TB-X', busyReqs, '2026-11-22');
  nextAvail === '2026-11-26'
    ? pass('T11: findNextAvailableDate sau 2 khoảng liên tiếp -> 2026-11-26')
    : fail('T11', `kết quả: "${nextAvail}", kỳ vọng "2026-11-26"`);

  // ── Test 12: escapeHtml ──────────────────────────────────────────────────
  escapeHtml('<script>alert(1)</script>') === '&lt;script&gt;alert(1)&lt;/script&gt;'
    ? pass('T12: escapeHtml chống XSS')
    : fail('T12', 'escapeHtml không hoạt động đúng');

  return results;
}
