# MượnĐồ – Ứng dụng Đăng ký & Quản lý Mượn Thiết bị CLB Sinh viên

> **Khẩu hiệu:** *"Biết ngay thiết bị nào đang ở đâu, ai đang giữ, bao giờ trả."*  
> **Dự án tham dự:** Cuộc thi VIBE-CODING 2026 – Đề Rehearsal Bảng Kỹ thuật.

---

## 1. Giới thiệu Sản phẩm & Vấn đề Giải quyết

Trong các câu lạc bộ (CLB) sinh viên, thiết bị kỹ thuật dùng chung như máy ảnh, chân máy, micro, đèn quay phim là tài sản quý giá nhưng thường xuyên xảy ra tình trạng:
- Thành viên liên tục nhắn tin hỏi người quản lý *"Thiết bị này có ai dùng chưa?"*, dễ gây bỏ sót hoặc nhầm lẫn.
- Hai thành viên đăng ký trùng lịch quay/chụp, dẫn đến tranh chấp thiết bị vào ngày sự kiện.
- Người phụ trách khó bao quát toàn bộ tài sản: không rõ ai đang giữ, ngày nào trả, thiết bị nào hỏng hóc cần bảo trì.

**MượnĐồ** ra đời như một giải pháp web app hiện đại, mobile-first, hoạt động không cần cài đặt phức tạp, cài được như app bản địa thông qua chuẩn **PWA (Progressive Web App)**, lưu trữ dữ liệu an toàn ngay trên trình duyệt (Offline-First) và trang bị cơ chế **tự động chống trùng lịch thông minh**.

---

## 2. Hướng dẫn Chạy Ứng dụng

### Cách 1: Sử dụng máy chủ tĩnh (Khuyến nghị để PWA & ES Modules hoạt động chuẩn)
Do ứng dụng sử dụng kiến trúc JavaScript ES Modules hiện đại (`import/export`), trình duyệt yêu cầu giao thức HTTP/HTTPS:

```bash
# Sử dụng NodeJS (npx)
npx serve .

# Hoặc dùng Python 3 có sẵn
python -m http.server 8000
```
Truy cập ứng dụng tại: `http://localhost:8000` hoặc địa chỉ hiển thị trong terminal.

### Cách 2: Mở trực tiếp (Nếu trình duyệt cho phép ES Modules local)
Mở trực tiếp file [index.html](file:///c:/Users/ACER/Downloads/New%20folder/index.html) bằng Google Chrome, Microsoft Edge hoặc Mozilla Firefox.

### Chạy Suite Kiểm thử Tự động:
Mở trực tiếp hoặc qua server: `http://localhost:8000/tests.html` (hoặc mở file [tests.html](file:///c:/Users/ACER/Downloads/New%20folder/tests.html)).

---

## 3. Hướng dẫn Cài đặt PWA lên Điện thoại

Ứng dụng được thiết kế theo tiêu chuẩn PWA (Progressive Web App), mang lại trải nghiệm như một ứng dụng Native trên điện thoại:

### Trên Android (Google Chrome):
1. Mở trang web ứng dụng trên Chrome.
2. Nhấn biểu tượng menu 3 chấm (⋮) ở góc trên bên phải.
3. Chọn **"Thêm vào màn hình chính"** (Add to Home screen) hoặc **"Cài đặt ứng dụng"**.
4. Ứng dụng sẽ xuất hiện trên màn hình điện thoại với icon MượnĐồ, mở độc lập không có thanh địa chỉ trình duyệt.

### Trên iOS (Apple Safari):
1. Mở trang web trên trình duyệt Safari.
2. Nhấn vào nút **Chia sẻ** (biểu tượng hình vuông có mũi tên hướng lên $\uparrow$).
3. Cuộn xuống và chọn **"Thêm vào MH chính"** (Add to Home Screen).
4. Xác nhận đặt tên "MượnĐồ" và bấm **Thêm**.

---

## 4. Danh sách Tính năng Hoàn thiện

### 4.1. Sáu (6) Yêu cầu Bắt buộc
| STT | Yêu cầu bắt buộc | Chi tiết cài đặt & Trải nghiệm |
|:---:|---|---|
| **1** | **Danh sách thiết bị** | Hiển thị đầy đủ tên, mã (TB-01...), loại, ghi chú. Badge màu sắc rõ nét: Sẵn sàng (xanh lá), Đang mượn (cam), Bảo trì (xám). Bộ lọc trạng thái đa năng, lọc loại thiết bị sinh động trích xuất từ dữ liệu thực tế, ô tìm kiếm nhanh. |
| **2** | **Form gửi yêu cầu mượn** | Bắt buộc 4 trường với thông báo lỗi tiếng Việt ngay dưới từng ô. Kiểm tra: Ngày trả $\ge$ Ngày mượn; Không cho mượn thiết bị "Bảo trì" (hiện lý do thân thiện); Chặn chọn ngày quá khứ; Tên tối thiểu 2 ký tự sau khi cắt khoảng trắng thừa. Sinh mã tự tăng (YC-104, YC-105...), trạng thái mặc định "Chờ duyệt". |
| **3** | **Màn hình người phụ trách** | Xem toàn bộ yêu cầu, đổi trạng thái qua lại giữa 5 giá trị: *Chờ duyệt, Đã duyệt, Đang mượn, Đã trả, Từ chối*. Nút duyệt nhanh, từ chối kèm xác nhận, xác nhận trả. Công tắc chuyển đổi vai trò "Thành viên / Người phụ trách" tức thì. |
| **4** | **Chống trùng lịch thông minh** | Thuật toán đối chiếu khoảng ngày chồng lấn chính xác tuyệt đối. Chỉ trạng thái "Đã duyệt" và "Đang mượn" mới chiếm lịch. Chặn duyệt nếu phát hiện trùng. Chặn gửi yêu cầu mới ngay trên form và hiện thông báo chi tiết: Ai đang mượn, từ ngày nào đến ngày nào (mã YC), gợi ý ngày rảnh gần nhất và thiết bị cùng loại thay thế. |
| **5** | **Tìm kiếm & Bộ lọc linh hoạt** | Tìm kiếm theo tên người mượn hoặc mã thiết bị không phân biệt chữ hoa chữ thường, không phân biệt dấu tiếng Việt (ví dụ: gõ "binh" hay "binh tran" đều tìm ra "Bình Trần", gõ "TB-03" hoặc "tb03" đều tìm ra "Micro USB"). Lọc theo trạng thái yêu cầu. |
| **6** | **Nút "Nạp dữ liệu mẫu"** | Trang bị hộp thoại cảnh báo an toàn. Khi xác nhận, đưa toàn bộ hệ thống về đúng 5 thiết bị, 3 yêu cầu mẫu ban đầu của BTC, bộ đếm mã quay về YC-104 và dọn sạch nhật ký. |

### 4.2. Tám (8) Tính năng Nâng cao (A $\rightarrow$ H)
- **A. Dashboard thống kê chuyên nghiệp:** Bảng số liệu tổng quan (Sẵn sàng / Đang mượn / Bảo trì, Yêu cầu chờ duyệt, Cảnh báo quá hạn màu đỏ nổi bật đối với các yêu cầu đang mượn mà ngày trả trong quá khứ).
- **B. Xác nhận trả với mốc thời gian thực tế:** Ghi nhận chính xác ngày giờ trả thực tế (`returnedAt`), hiển thị minh bạch trong chi tiết yêu cầu.
- **C. Đồng bộ trạng thái thiết bị tự động:** Khi yêu cầu chuyển sang "Đang mượn" $\rightarrow$ thiết bị chuyển sang "Đang mượn". Khi "Đã trả" $\rightarrow$ thiết bị tự động về "Sẵn sàng" (chỉ khi không còn yêu cầu nào khác đang mượn và thiết bị không bị gắn cờ Bảo trì). Người phụ trách vẫn có quyền đổi trạng thái thiết bị thủ công bất kỳ lúc nào. Không tự ý thay đổi dữ liệu mẫu lúc nạp ban đầu.
- **D. Lịch trực quan 30 ngày theo thiết bị:** Hiển thị trực quan 30 ngày tiếp theo ngay trong form mượn, tô màu ngày bận/ngày rảnh, hỗ trợ bấm trực tiếp vào ngày trên lịch để tự động điền ngày mượn và ngày trả.
- **E. Nhật ký hoạt động (Audit Trail):** Ghi nhận chi tiết: ai/vai trò nào, thao tác gì, vào thời điểm nào (giới hạn an toàn 100 dòng gần nhất để tránh phình dung lượng).
- **F. Xuất danh sách ra file CSV:** Định dạng chuẩn UTF-8 kèm ký tự BOM (`\uFEFF`), mở bằng Microsoft Excel hiển thị hoàn hảo tiếng Việt có dấu mà không bị lỗi font chữ.
- **G. Thêm thiết bị mới:** Dành riêng cho người phụ trách, tự động sinh mã tăng dần chuẩn hóa (TB-06, TB-07...).
- **H. Deep Link & Hỗ trợ QR Code:** Hỗ trợ điều hướng nhanh qua hash URL (ví dụ: `#/yeu-cau/YC-101`), tự động cuộn màn hình và viền sáng làm nổi bật yêu cầu cần kiểm tra.

---

## 5. Quy tắc & Thuật toán Chống Trùng Lịch

Hai khoảng thời gian $[a_{start}, a_{end}]$ và $[b_{start}, b_{end}]$ được xác định là **chồng lấn (trùng lịch)** khi và chỉ khi thỏa mãn đồng thời:
$$a_{start} \le b_{end} \quad \text{VÀ} \quad b_{start} \le a_{end}$$

### Các trường hợp điển hình:
- **Trùng một ngày (cùng ngày):** $[21/11, 21/11]$ và $[21/11, 21/11] \rightarrow$ **Trùng lịch**.
- **Trùng ngày biên:** YC-A trả ngày $22/11$, YC-B mượn ngày $22/11 \rightarrow$ **Trùng lịch** (vì thiết bị cần được kiểm tra, bàn giao, không thể phân thân).
- **Không trùng lịch:** $[21/11, 21/11]$ và $[22/11, 22/11] \rightarrow$ **Hợp lệ, không trùng**.
- **Điều kiện chiếm lịch:** Chỉ các yêu cầu ở trạng thái `approved` (Đã duyệt) hoặc `borrowing` (Đang mượn) mới được tính là chiếm lịch. Các trạng thái `pending` (Chờ duyệt), `returned` (Đã trả) và `rejected` (Từ chối) **không** chiếm lịch.

---

## 6. Minh chứng Sử dụng AI trong Dự án

Dự án được xây dựng với phương pháp **AI-Assisted Vibe-Coding** chặt chẽ, tận dụng trí tuệ nhân tạo làm trợ lý kỹ sư cao cấp:
1. **Lập kiến trúc & Phân rã mô-đun:** Sử dụng AI để thiết kế kiến trúc phân lớp sạch (Clean Architecture):
   - `seed.js`: Lưu trữ bất biến dữ liệu gốc của BTC.
   - `store.js`: Data Access Layer đóng gói `localStorage`, có cơ chế bắt lỗi QuotaExceeded, Schema Versioning và Fallback tự động.
   - `logic.js`: Pure functions độc lập với DOM, dễ dàng viết unit test.
   - `ui.js`: Presentation layer với cơ chế Escape HTML phòng vệ XSS.
   - `app.js`: Application layer điều phối luồng người dùng và state.
2. **Thiết kế Mobile-First Design System:** Tối ưu kích thước tap target tối thiểu 44px, font input 16px chống auto-zoom trên iOS Safari, biến CSS hỗ trợ Dark Mode tự động theo `prefers-color-scheme`.
3. **Sinh & Kiểm định Thuật toán:** AI hỗ trợ chuẩn hóa biểu thức chính quy (Regex) và thuật toán loại bỏ dấu tiếng Việt (NFD decomposition), xử lý so sánh ngày ISO chuẩn xác tránh bug lệch múi giờ UTC.
4. **Viết Tự động Bộ Test Suite:** AI hỗ trợ sinh 11 test cases bao phủ toàn bộ các góc khuất (edge cases) của đề bài.

---

## 7. Kết quả Kiểm thử Tự động (11/11 Test Cases PASS)

Toàn bộ 11 ca kiểm thử được cài đặt trong `tests.html` và hàm `runTests()` trong `js/logic.js`:

| Mã Test | Nội dung kiểm thử | Trạng thái | Ghi chú kết quả |
|:---:|---|:---:|---|
| **TC-01** | Khoảng ngày chồng lấn (biên và không trùng) | ✅ PASS | $[21,21]\cap[21,21]$ trùng; $[21,22]\cap[22,23]$ trùng; $[21,21]\cap[22,22]$ không trùng |
| **TC-02** | Ngày trả = ngày mượn hợp lệ, trả < mượn báo lỗi | ✅ PASS | $21/11 \rightarrow 21/11$ hợp lệ; $22/11 \rightarrow 21/11$ báo lỗi trường `endDate` |
| **TC-03** | Thiết bị Bảo trì (TB-04) không thể chọn mượn | ✅ PASS | Báo lỗi đúng thông điệp "Thiết bị đang bảo trì, không nhận đăng ký mượn" |
| **TC-04** | Tạo yêu cầu TB-03 ngày 21/11 trùng YC-102 | ✅ PASS | Phát hiện trùng lịch với YC-102 (Bình Trần), hiển thị gợi ý thay thế |
| **TC-05** | Tạo yêu cầu TB-03 ngày 22/11 hợp lệ | ✅ PASS | Vượt qua validation, sẵn sàng ghi nhận với trạng thái Chờ duyệt |
| **TC-06** | Duyệt YC-104 thành công, chặn duyệt khi trùng | ✅ PASS | Chặn ngay trên giao diện và logic khi người phụ trách cố duyệt yêu cầu trùng |
| **TC-07** | Yêu cầu "Chờ duyệt" không chiếm lịch | ✅ PASS | YC pending cùng ngày không gây xung đột với các đăng ký mới |
| **TC-08** | Tìm kiếm bỏ dấu tiếng Việt & mã ("binh", "TB-03", "tb03") | ✅ PASS | Khớp chuẩn xác tên người mượn và mã thiết bị linh hoạt |
| **TC-09** | Dữ liệu lưu bền sau khi reload trình duyệt | ✅ PASS | `localStorage` duy trì toàn vẹn trạng thái thiết bị và danh sách mượn |
| **TC-10** | Nạp dữ liệu mẫu đưa về trạng thái nguyên bản | ✅ PASS | Đúng 5 thiết bị, 3 yêu cầu, reset bộ đếm về YC-104 |
| **TC-11** | Kịch bản Demo chuẩn BTC chạy liên tục mượt mà | ✅ PASS | Nạp mẫu $\rightarrow$ Tìm TB-03 $\rightarrow$ Tạo YC hợp lệ $\rightarrow$ Tạo YC trùng báo lỗi $\rightarrow$ Đổi trạng thái |

---

## 8. Các Giả định Kỹ thuật (Assumptions)

1. **Về phân quyền (Authentication):** Do đề bài quy định không dùng backend và không yêu cầu đăng nhập thật, hệ thống sử dụng công tắc chuyển đổi trực tiếp trên Header để demo giữa hai góc nhìn: "Thành viên" và "Người phụ trách". Khi thương mại hóa, vai trò này sẽ gắn liền với tài khoản đăng nhập bảo mật.
2. **Dữ liệu mẫu chưa đồng bộ thời gian thực:** Trong dữ liệu BTC, thiết bị TB-01 có tình trạng "Sẵn sàng" nhưng có YC-103 "Đang mượn". Hệ thống **tôn trọng 100% dữ liệu gốc của BTC**, không tự động can thiệp sửa đổi dữ liệu này khi khởi tạo hoặc nạp lại mẫu.
3. **Mã tăng dần:** Tiếp tục từ dữ liệu mẫu, mã yêu cầu tiếp theo sẽ là `YC-104`, `YC-105`... và mã thiết bị mới sẽ là `TB-06`, `TB-07`...

---

## 9. Lộ trình Thương mại hóa (Commercial Roadmap)

### Giai đoạn 1: MVP Phục vụ CLB Nội bộ (Hiện tại)
- Chạy trực tiếp trên trình duyệt, lưu trữ Offline qua LocalStorage & PWA.
- Phù hợp cho các CLB quy mô dưới 20 thiết bị, 1 người quản lý chính.

### Giai đoạn 2: Cloud Backend & Định danh Xác thực (Quý 3/2026)
- **Kiến trúc:** Chuyển đổi tầng `Store` sang REST API hoặc GraphQL (NodeJS/NestJS + PostgreSQL trên Supabase/Firebase).
- **Bảo mật & Phân quyền (RBAC):** Tích hợp Google Workspace Trường ĐH / SSO Microsoft 365. Phân quyền chặt chẽ: *Super Admin, Thủ kho CLB, Thành viên thường*. Thành viên chỉ xem được yêu cầu cá nhân.

### Giai đoạn 3: Đa tổ chức & Thông báo Tự động (Quý 4/2026)
- **Multi-tenancy:** Mỗi CLB hoặc khoa viện là một không gian làm việc (Workspace) riêng biệt.
- **Hệ thống Thông báo đa kênh:** Gửi thông báo phê duyệt, nhắc lịch trả trước 24h qua Zalo ZNS, Telegram Bot và Push Notification PWA.
- **Tích hợp phần cứng:** In mã QR/Barcode dán lên thân thiết bị, thủ kho dùng camera quét mã để duyệt mượn và nhận trả chỉ trong 2 giây.

### Giai đoạn 4: Mô hình Kinh doanh & Định giá (Năm 2027)
- **Gói Miễn phí (Free Tier):** Dành cho CLB nhỏ sinh viên: Tối đa 20 thiết bị, 100 yêu cầu/tháng, 2 người quản lý.
- **Gói CLB Chuyên nghiệp (Pro Tier - 99.000 VNĐ/tháng):** Không giới hạn thiết bị, xuất báo cáo khấu hao tài sản, thông báo qua Zalo/Email.
- **Gói Nhà trường / Đoàn thể (Campus Enterprise):** Quản lý tập trung toàn bộ thiết bị các phòng lab/phòng ban toàn trường, tích hợp CSDL sinh viên trường.

---

## 10. Cấu trúc Thư mục Dự án

```
c:\Users\ACER\Downloads\New folder\
├── index.html          # Trang ứng dụng chính (SPA Mobile-First)
├── manifest.json       # Cấu hình PWA (Installable Web App)
├── sw.js               # Service Worker lưu cache offline
├── tests.html          # Trang chạy tự động 11 kịch bản kiểm thử
├── README.md           # Tài liệu kỹ thuật chi tiết
├── css/
│   └── style.css       # Toàn bộ mã nguồn CSS, biến màu, responsive, dark mode
├── js/
│   ├── seed.js         # Dữ liệu mẫu nguyên bản của BTC (100% giữ nguyên)
│   ├── store.js        # Lớp Store đóng gói truy xuất LocalStorage an toàn
│   ├── logic.js        # Pure functions xử lý logic, chống trùng, kiểm thử
│   ├── ui.js           # Render template giao diện, component cards, toast, modal
│   └── app.js          # Controller điều phối luồng ứng dụng và sự kiện
└── icons/
    ├── icon-192.svg    # Icon PWA chuẩn 192x192
    └── icon-512.svg    # Icon PWA chuẩn 512x512
```

---

## 11. Bảng Đối chiếu Yêu cầu Đề bài với Vị trí Cài đặt trong Mã nguồn

| Yêu cầu đề bài | File cài đặt | Vị trí / Tên hàm thực thi |
|---|---|---|
| Dữ liệu mẫu BTC (5 TB, 3 YC) | `js/seed.js` | Hằng số `SEED_DEVICES`, `SEED_REQUESTS`, `SEED_NEXT_ID` |
| Lớp Store lưu bền dữ liệu | `js/store.js` | Đối tượng `Store` (`getDevices`, `saveRequests`, `resetToSeed`...) |
| Khử dấu tiếng Việt tìm kiếm | `js/logic.js` | Hàm `removeAccents(str)`, `normalizeSearch(str)` |
| Thuật toán chống trùng lịch | `js/logic.js` | Hàm `datesOverlap()`, `findConflicts()` |
| Gợi ý ngày rảnh & thiết bị thay thế | `js/logic.js` | Hàm `findNextAvailableDate()`, `findAlternativeDevices()` |
| Thông báo lỗi trùng lịch thân thiện | `js/logic.js` | Hàm `buildConflictMessage()` |
| Kiểm tra dữ liệu form mượn | `js/logic.js` | Hàm `validateRequest()` |
| Render thẻ thiết bị & badge màu | `js/ui.js` | Hàm `renderDeviceCard()`, `renderStatusBadge()` |
| Render form đăng ký & lịch 30 ngày | `js/ui.js` | Hàm `renderBorrowForm()`, `renderCalendar()` |
| Render danh sách yêu cầu & admin actions | `js/ui.js` | Hàm `renderRequestsPage()`, `renderRequestCard()` |
| Dashboard thống kê & cảnh báo quá hạn | `js/ui.js` | Hàm `renderDashboardPage()`, `renderDashboardStats()` |
| Điều hướng trang & Chuyển đổi vai trò | `js/app.js` | Hàm `handleRouting()`, `setupRoleToggle()` |
| Xử lý gửi mượn & Chống trùng realtime | `js/app.js` | Hàm `renderBorrowView()`, sự kiện `submit` form |
| Duyệt YC & Đồng bộ thiết bị | `js/app.js` | Hàm `handleUpdateRequestStatus()`, `syncDeviceStatus()` |
| Xuất CSV UTF-8 có BOM | `js/app.js` | Hàm `exportRequestsToCSV()` |
| Nạp lại dữ liệu mẫu với xác nhận | `js/app.js` | Hàm `handleResetSeedData()` |
| Service Worker bộ nhớ đệm Offline | `sw.js` | Sự kiện `install`, `activate`, `fetch` |
| Kiểm thử tự động 11 ca kiểm thử | `tests.html` / `js/logic.js` | File `tests.html` & hàm `runTests()` |
