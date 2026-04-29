# GT-SPECBOARD FRAMEWORK BLUEPRINT
*Tài liệu này lưu trữ toàn bộ "DNA" (Kiến trúc lõi, Công nghệ, và Trải nghiệm người dùng) của dự án GT-SpecBoard. Hãy cung cấp file này cho AI (như Antigravity / Gemini) khi bắt đầu một dự án mới để AI kế thừa toàn bộ tinh hoa công nghệ từ dự án cũ.*

## 1. Công nghệ Sử dụng (Tech Stack)
- **Frontend Core:** HTML5, Vanilla JavaScript (ES6+), CSS3 (Không dùng thư viện bên thứ 3 để tối ưu tốc độ).
- **Lưu trữ dữ liệu (Database):** Sử dụng các file `.js` (như `data.js`) chứa mảng Object JSON.
- **State Management:** Sử dụng `localStorage` để lưu cấu hình (Dark Mode, Chu kỳ PIN).
- **Export/Import:** Xử lý file trực tiếp bằng `FileReader` (đối với CSV) và thao tác DOM Blob (đối với xuất CSV/JS).

## 2. Tiêu chuẩn Thiết kế (UI/UX Standards)
- **Hệ thống Màu (CSS Variables):** Định nghĩa toàn bộ màu sắc qua CSS Root Variables (`--primary`, `--bg`, `--card-bg`, `--text-primary`...) để dễ dàng thay đổi hàng loạt.
- **Dark Mode Tự động:** Hỗ trợ tính năng Dark Mode qua thẻ `data-theme="dark"` trên `<body>`, có nút gạt (Toggle) lưu trạng thái mượt mà.
- **Bố cục Thích ứng (Responsive):** 
  - Sử dụng `Flexbox` và `Grid` (`grid-template-columns: repeat(auto-fill...)`).
  - Các phần tử Admin (Menu thao tác) tự động xếp dọc trên Mobile, xếp ngang trên PC.
- **Bảng Dữ Liệu Thông Minh (Smart Tables):**
  - Khung bảng có `max-height` kết hợp `overflow-y: auto`.
  - **Sticky Header & Columns:** Cố định Dòng Tiêu đề (Top) và 2 Cột đầu tiên (Left) bằng `position: sticky` và `z-index` để dễ lướt xem trên màn hình hẹp.

## 3. Các Chức năng Lõi Bắt Buộc Kế Thừa
Khi xây dựng dự án mới dựa trên khung này, AI cần thiết lập các module sau:

### A. Khu vực Người dùng (User End)
1. **Bộ lọc đa chiều (Dynamic Filter):** Lọc theo Select Box và Input Number (hỗ trợ dung sai `+/- %`).
2. **Sắp xếp tự động (Sorting):** Cho phép click vào tiêu đề cột để sắp xếp mảng dữ liệu (Tăng/Giảm dần), hỗ trợ cả Số và Chữ.
3. **So sánh thông minh (Compare Modal):** 
   - Checkbox đầu mỗi dòng dữ liệu. 
   - Nút nổi (Floating Button) ở góc phải dưới xuất hiện khi có thiết bị được chọn.
   - Bảng Modal Popup hiển thị đối chiếu thông số ngang nhau.
4. **Hệ thống Từ điển (Dictionary/Autocomplete):** Dùng thẻ `<datalist>` để tự động gợi ý mã khách hàng, tên công ty.

### B. Khu vực Quản trị (Admin Dashboard)
1. **Bảo mật đa tầng:** Đăng nhập ẩn, sử dụng Chu kỳ thay đổi mã PIN (DRM Security) và Master Key.
2. **Thống kê Trực quan (Analytics):** Các thẻ màu sắc đếm tổng số lượng thiết bị, phân loại tự động.
3. **Quản lý Menu Động (Collapsible Menu):** Các nút tính năng như *Đổi PIN*, *Nhập CSV*, *Thêm Model* nằm trong thẻ `<details>`, tự động xổ ngang (100% width) nếu có trên 8 thông tin nhập liệu (`.wide-on-open`).
4. **CRUD Data:**
   - *Create/Update:* Form tự động render (`renderAdminForm`). Kiểm soát Data Validation (Bắt lỗi bỏ trống, bắt lỗi nhập sai định dạng Số, bôi đỏ ô lỗi).
   - *Duplicate:* Nút (📑) để copy toàn bộ thông số cũ lên form tạo mới.
   - *Delete:* Cảnh báo xác nhận trước khi xóa.
5. **Import/Export Nội bộ:**
   - Nút "TẢI FILE DỮ LIỆU JS MỚI" để cập nhật Database.
   - Nút "📁 NHẬP CSV" để upload hàng loạt (Mass Update) từ file Excel.
   - Nút "📊 XUẤT EXCEL" để tải báo cáo.

## 4. Hướng dẫn Dành cho AI khi đọc file này
*Khi USER đính kèm file này và nói "Tạo cho tôi một dự án Quản lý Vật tư dựa trên khung sườn này":*
1. **KHÔNG** đề xuất dùng React, Vue hay Tailwind. Bám sát Vanilla JS/CSS.
2. **TẠO** ngay cấu trúc thư mục gồm: `index.html`, `styles.css`, `app.js`, `admin.js`, và file `data.js`.
3. **ÁP DỤNG** ngay toàn bộ CSS Variables, logic Dark Mode, và cấu trúc bảng Sticky.
4. **CHỜ YÊU CẦU:** Chỉ thay đổi tên các trường (Keys) từ "Thông số điều hòa" sang "Vật tư" theo mô tả chi tiết của USER, giữ nguyên toàn bộ logic Lọc, So sánh và Quản trị.
