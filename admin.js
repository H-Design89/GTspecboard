// --- BIẾN TOÀN CỤC CHO ADMIN ---
let tempEvapDb = [];
let tempCondDb = [];
let currentAdminDb = 'evap';
let editingModelId = null; // null = chế độ thêm mới, string = đang sửa

// Lấy danh sách key (thuộc tính) mẫu từ database để tạo form tự động
const evapKeys = ["id", "model", "loai_dan", "kw", "s_tdn", "tieu_chuan", "t_bayhoi", "t_phong", "delta_t", "van_hanh", "moi_chat", "loai_ong", "loai_canh", "v_wind", "dk_quat", "sl_quat"];
const condKeys = ["id", "model", "loai_dan", "kw", "hp", "s_tdn", "tieu_chuan", "t_bayhoi", "t_phong", "t_ngungtu", "t_wb", "moi_chat", "loai_ong", "loai_canh", "v_wind", "dk_quat", "sl_quat"];

// Khởi tạo dữ liệu khi vào trang admin
function initAdminData() {
    if (typeof modelDatabase !== 'undefined') {
        // Deep copy để không ảnh hưởng dữ liệu cũ khi chưa bấm lưu
        tempEvapDb = JSON.parse(JSON.stringify(modelDatabase)); 
    }
    if (typeof modelDatabaseCond !== 'undefined') {
        tempCondDb = JSON.parse(JSON.stringify(modelDatabaseCond));
    }
}

// --- ĐĂNG NHẬP ---
function loginAdmin() {
    const id = document.getElementById('admin-id').value;
    const pass = document.getElementById('admin-pass').value;

    if (id === 'admin' && pass === 'zodiac1612@') {
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        initAdminData();
        changeAdminDb(); // Load dữ liệu mặc định
        initPinManager(); // Load danh sách mã PIN
    } else {
        document.getElementById('admin-error').style.display = 'block';
        setTimeout(() => document.getElementById('admin-error').style.display = 'none', 3000);
    }
}

document.getElementById('admin-pass').addEventListener('keypress', e => {
    if(e.key === 'Enter') loginAdmin();
});

// --- CHUYỂN ĐỔI DATABASE QUẢN LÝ ---
function changeAdminDb() {
    currentAdminDb = document.getElementById('admin-db-select').value;
    resetAdminForm();
    renderAdminForm();
    renderAdminTable();
}

// --- RENDER FORM ---
function renderAdminForm() {
    const container = document.getElementById('admin-dynamic-form');
    const keys = currentAdminDb === 'evap' ? evapKeys : condKeys;
    const db = currentAdminDb === 'evap' ? tempEvapDb : tempCondDb;
    
    let html = '';
    keys.forEach(key => {
        let type = 'text';
        let listAttr = '';
        let datalistHtml = '';

        // Các trường số
        if (["kw", "hp", "s_tdn", "tieu_chuan", "t_bayhoi", "t_phong", "t_ngungtu", "t_wb", "delta_t", "v_wind", "dk_quat", "sl_quat"].includes(key)) {
            type = 'number';
        } else if (["loai_dan", "van_hanh", "moi_chat", "loai_ong", "loai_canh"].includes(key)) {
            // Tự động tạo gợi ý cho các trường text phân loại (Dropdown combobox)
            const uniqueVals = [...new Set(db.map(item => item[key]))].filter(val => val).sort();
            if (uniqueVals.length > 0) {
                listAttr = `list="dl_${key}"`;
                datalistHtml = `<datalist id="dl_${key}">`;
                uniqueVals.forEach(v => { datalistHtml += `<option value="${v}">`; });
                datalistHtml += `</datalist>`;
            }
        }
        
        let placeholder = `Nhập ${key}`;
        if (key === 'id') placeholder = 'Mã ID duy nhất (Bắt buộc)';
        if (key === 'model') placeholder = 'Tên Model (Bắt buộc)';

        html += `
            <div class="input-group">
                <label>${key.toUpperCase()}:</label>
                <input type="${type}" id="admin_input_${key}" placeholder="${placeholder}" ${key==='id'?'style="border-color:var(--primary); font-weight:bold;"':''} step="any" ${listAttr}>
                ${datalistHtml}
            </div>
        `;
    });
    container.innerHTML = html;
}

// --- QUẢN LÝ MÃ PIN ---
function initPinManager() {
    const select = document.getElementById('admin-pin-select');
    if (!select || typeof ROTATING_PINS === 'undefined') return;
    
    let html = '';
    let currentIndex = parseInt(localStorage.getItem('gtspec_pin_index') || 0);
    
    ROTATING_PINS.forEach((pin, index) => {
        html += `<option value="${index}" ${index === currentIndex ? 'selected' : ''}>
            ${pin.hint} - **** ${index === currentIndex ? ' (ĐANG DÙNG)' : ''}
        </option>`;
    });
    select.innerHTML = html;
}

function applyManualPinChange() {
    const masterKey = document.getElementById('admin-pin-masterkey').value;
    const selectedIndex = document.getElementById('admin-pin-select').value;
    
    if (masterKey !== '161289' && masterKey !== '061189') {
        alert("Master Key không hợp lệ! Vui lòng kiểm tra lại.");
        return;
    }
    
    localStorage.setItem('gtspec_pin_index', selectedIndex);
    localStorage.setItem('gtspec_start_date', Date.now()); // Khởi tạo lại chu kỳ 30 ngày
    
    alert("Đã đổi vòng lặp Mã PIN thành công! Hệ thống sẽ tải lại trang để áp dụng.");
    window.location.reload();
}

// --- RENDER BẢNG ---
function renderAdminTable() {
    const db = currentAdminDb === 'evap' ? tempEvapDb : tempCondDb;
    const keys = currentAdminDb === 'evap' ? evapKeys : condKeys;
    const tHead = document.getElementById('admin-table-head');
    const tBody = document.getElementById('admin-table-body');
    
    document.getElementById('admin-db-count').innerText = `(${db.length})`;

    // Tạo Header
    let headHtml = '<tr><th>THAO TÁC</th>';
    keys.forEach(k => headHtml += `<th>${k.toUpperCase()}</th>`);
    headHtml += '</tr>';
    tHead.innerHTML = headHtml;

    // Tạo Body
    let bodyHtml = '';
    if (db.length === 0) {
        bodyHtml = `<tr><td colspan="${keys.length + 1}" class="no-data">Chưa có dữ liệu</td></tr>`;
    } else {
        // Render từ mới nhất đến cũ nhất
        [...db].reverse().forEach(item => {
            let rowHtml = `<tr>
                <td style="white-space: nowrap;">
                    <button style="background:var(--primary); color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;" onclick="editAdminModel('${item.id}')">✏ Sửa</button>
                    <button style="background:var(--accent); color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;" onclick="deleteAdminModel('${item.id}')">🗑 Xóa</button>
                </td>`;
            keys.forEach(k => {
                rowHtml += `<td>${item[k] !== null && item[k] !== undefined ? item[k] : ''}</td>`;
            });
            rowHtml += '</tr>';
            bodyHtml += rowHtml;
        });
    }
    tBody.innerHTML = bodyHtml;
}

// --- XÓA MODEL ---
function deleteAdminModel(id) {
    if (!confirm(`Bạn có chắc chắn muốn xóa model có ID: ${id}?`)) return;
    
    if (currentAdminDb === 'evap') {
        tempEvapDb = tempEvapDb.filter(i => i.id !== id);
    } else {
        tempCondDb = tempCondDb.filter(i => i.id !== id);
    }
    renderAdminTable();
    if (editingModelId === id) resetAdminForm();
}

// --- SỬA MODEL (ĐƯA LÊN FORM) ---
function editAdminModel(id) {
    const db = currentAdminDb === 'evap' ? tempEvapDb : tempCondDb;
    const keys = currentAdminDb === 'evap' ? evapKeys : condKeys;
    const modelToEdit = db.find(i => i.id === id);
    
    if (!modelToEdit) return;

    editingModelId = id;
    document.getElementById('admin-form-title').innerText = `ĐANG SỬA MODEL: ${modelToEdit.model} (ID: ${id})`;
    document.getElementById('admin-form-title').style.color = 'var(--accent)';
    
    // Khóa ô ID lại để không cho sửa ID (ID là định danh duy nhất)
    document.getElementById(`admin_input_id`).readOnly = true;
    document.getElementById(`admin_input_id`).style.backgroundColor = '#e0e0e0';

    keys.forEach(k => {
        const el = document.getElementById(`admin_input_${k}`);
        if (el) el.value = modelToEdit[k] !== null && modelToEdit[k] !== undefined ? modelToEdit[k] : '';
    });
    
    // Cuộn lên form
    document.getElementById('admin-form-container').scrollIntoView({ behavior: 'smooth' });
}

// --- HỦY / TẠO MỚI (RESET FORM) ---
function resetAdminForm() {
    editingModelId = null;
    document.getElementById('admin-form-title').innerText = `THÊM MỚI MODEL`;
    document.getElementById('admin-form-title').style.color = 'var(--primary)';
    
    const keys = currentAdminDb === 'evap' ? evapKeys : condKeys;
    keys.forEach(k => {
        const el = document.getElementById(`admin_input_${k}`);
        if (el) {
            el.value = '';
            el.readOnly = false;
            el.style.backgroundColor = 'white';
        }
    });
}

// --- LƯU MODEL (THÊM/SỬA) ---
function saveAdminModel() {
    const keys = currentAdminDb === 'evap' ? evapKeys : condKeys;
    const newModel = {};
    
    // Đọc dữ liệu từ form
    keys.forEach(k => {
        const val = document.getElementById(`admin_input_${k}`).value;
        // Chuyển kiểu number nếu cần
        if (["kw", "hp", "s_tdn", "tieu_chuan", "t_bayhoi", "t_phong", "t_ngungtu", "t_wb", "delta_t", "v_wind", "dk_quat", "sl_quat"].includes(k)) {
            newModel[k] = val === '' ? null : parseFloat(val);
        } else {
            newModel[k] = val;
        }
    });

    if (!newModel.id || !newModel.model) {
        alert("Vui lòng điền tối thiểu Mã ID và Tên Model!");
        return;
    }

    if (currentAdminDb === 'evap') {
        if (editingModelId) {
            const idx = tempEvapDb.findIndex(i => i.id === editingModelId);
            if (idx !== -1) tempEvapDb[idx] = newModel;
        } else {
            if (tempEvapDb.some(i => i.id === newModel.id)) return alert("Mã ID này đã tồn tại!");
            tempEvapDb.push(newModel);
        }
    } else {
        if (editingModelId) {
            const idx = tempCondDb.findIndex(i => i.id === editingModelId);
            if (idx !== -1) tempCondDb[idx] = newModel;
        } else {
            if (tempCondDb.some(i => i.id === newModel.id)) return alert("Mã ID này đã tồn tại!");
            tempCondDb.push(newModel);
        }
    }

    alert(editingModelId ? "Đã cập nhật Model thành công!" : "Đã thêm Model mới thành công!");
    resetAdminForm();
    renderAdminTable();
}

// --- XUẤT FILE DATA.JS / DATA_01.JS ---
function exportCurrentDb() {
    const db = currentAdminDb === 'evap' ? tempEvapDb : tempCondDb;
    const fileName = currentAdminDb === 'evap' ? 'data.js' : 'data_01.js';
    const varName = currentAdminDb === 'evap' ? 'modelDatabase' : 'modelDatabaseCond';
    
    // Chuyển mảng thành chuỗi JSON đẹp (có thụt lề)
    // Để giữ nguyên format mỗi object trên 1 dòng như file cũ, ta tùy biến xíu:
    let fileContent = `// TỆP DỮ LIỆU TỰ ĐỘNG SINH TỪ QUẢN TRỊ ADMIN\nconst ${varName} = [\n`;
    
    const lines = db.map(item => {
        let objStr = JSON.stringify(item);
        // Bỏ ngoặc kép ở key cho giống file cũ (tùy chọn, JSON.stringify sinh key có ngoặc kép là hợp lệ JS)
        return `  ${objStr}`;
    });
    
    fileContent += lines.join(',\n');
    fileContent += '\n];\n';

    // Tạo blob và tải về
    const blob = new Blob([fileContent], { type: 'text/javascript' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- XUẤT FILE EXCEL (CSV) ---
function exportExcel() {
    const db = currentAdminDb === 'evap' ? tempEvapDb : tempCondDb;
    const keys = currentAdminDb === 'evap' ? evapKeys : condKeys;
    const fileName = currentAdminDb === 'evap' ? 'DanBayHoi_Data.csv' : 'DanNgungTu_Data.csv';

    // Tạo header cho file CSV (Thêm BOM để Excel mở không bị lỗi font tiếng Việt)
    let csvContent = "\uFEFF"; 
    csvContent += keys.map(k => k.toUpperCase()).join(",") + "\n";

    // Thêm dữ liệu
    db.forEach(item => {
        let row = keys.map(k => {
            let val = item[k] !== null && item[k] !== undefined ? item[k] : "";
            // Bọc trong dấu ngoặc kép và escape ngoặc kép để tránh lỗi khi giá trị có dấu phẩy
            val = String(val).replace(/"/g, '""');
            return `"${val}"`;
        });
        csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
