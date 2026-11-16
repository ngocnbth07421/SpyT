// Dữ liệu mẫu BTC - KHÔNG ĐƯỢC SỬA
export const SEED_DEVICES = [
  { id: 'TB-01', name: 'Máy ảnh Lumix G7', type: 'Máy ảnh', status: 'available', note: 'Kèm pin và thẻ nhớ' },
  { id: 'TB-02', name: 'Chân máy mini', type: 'Phụ kiện', status: 'borrowing', note: 'Dự kiến trả ngày 22/11' },
  { id: 'TB-03', name: 'Micro USB', type: 'Âm thanh', status: 'available', note: 'Dùng ghi âm/phỏng vấn' },
  { id: 'TB-04', name: 'Đèn LED để bàn', type: 'Ánh sáng', status: 'maintenance', note: 'Không cho đăng ký mượn' },
  { id: 'TB-05', name: 'Tripod cao', type: 'Phụ kiện', status: 'available', note: 'Có túi đựng' },
];

export const SEED_REQUESTS = [
  { id: 'YC-101', borrowerName: 'An Nguyễn', deviceId: 'TB-02', startDate: '2026-11-22', endDate: '2026-11-23', status: 'pending', createdAt: '2026-11-16T13:00:00.000Z' },
  { id: 'YC-102', borrowerName: 'Bình Trần', deviceId: 'TB-03', startDate: '2026-11-21', endDate: '2026-11-21', status: 'approved', createdAt: '2026-11-16T13:00:00.000Z' },
  { id: 'YC-103', borrowerName: 'Chi Lê', deviceId: 'TB-01', startDate: '2026-11-24', endDate: '2026-11-25', status: 'borrowing', createdAt: '2026-11-16T13:00:00.000Z' },
];

export const SEED_NEXT_ID = 104; // Mã YC tiếp theo là YC-104
export const NEXT_DEVICE_ID = 6; // TB tiếp theo là TB-06
