// --- BIẾN TOÀN CỤC CHO ADMIN ---
let tempEvapDb = [];
let tempCondDb = [];
let tempDictionary = {};
let currentAdminDb = 'evap';
let editingModelId = null; // null = chế độ thêm mới, string = đang sửa
let currentAdminTableFilter = 'standard';

// Lấy danh sách key (thuộc tính) mẫu từ database để tạo form tự động
const evapKeys = ["id", "is_standard", "model", "loai_dan", "kw", "s_tdn", "tieu_chuan", "t_bayhoi", "t_phong", "delta_t", "van_hanh", "moi_chat", "loai_ong", "loai_canh", "v_wind", "dk_quat", "sl_quat", "ghi_chu"];
const condKeys = ["id", "is_standard", "model", "loai_dan", "kw", "hp", "s_tdn", "tieu_chuan", "t_bayhoi", "t_phong", "t_ngungtu", "t_wb", "moi_chat", "loai_ong", "loai_canh", "v_wind", "dk_quat", "sl_quat", "ghi_chu"];

// Khởi tạo dữ liệu khi vào trang admin
function initAdminData() {
    if (typeof modelDatabase !== 'undefined') {
        // Deep copy để không ảnh hưởng dữ liệu cũ khi chưa bấm lưu
        tempEvapDb = JSON.parse(JSON.stringify(modelDatabase)); 
    }
    if (typeof modelDatabaseCond !== 'undefined') {
        tempCondDb = JSON.parse(JSON.stringify(modelDatabaseCond));
    }
    if (typeof customerDictionary !== 'undefined') {
        tempDictionary = JSON.parse(JSON.stringify(customerDictionary));
    } else {
        tempDictionary = {};
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
        renderAdminDict(); // Load từ điển
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

        const keyLabels = {
            'model': 'Mã Model', 'loai_dan': 'Loại Dàn', 'kw': 'Công suất (kW)', 'hp': 'CS Máy (HP)',
            's_tdn': 'DTTĐN (m2)', 'tieu_chuan': 'Tiêu chuẩn (m2/kW)', 't_bayhoi': 'Tmc (°C)', 
            't_phong': 'Tr (°C)', 'delta_t': 'Delta T (K)', 't_ngungtu': 'Tc (°C)', 't_wb': 'Twb (°C)',
            'moi_chat': 'Môi chất', 'van_hanh': 'Vận hành', 'loai_ong': 'Loại ống', 'loai_canh': 'Lá tản nhiệt',
            'v_wind': 'Tốc độ gió (m/s)', 'dk_quat': 'Đường kính quạt', 'sl_quat': 'Số lượng quạt',
            'is_standard': 'Thiết kế Tiêu chuẩn'
        };
        let labelText = keyLabels[key] || key.toUpperCase();

        if (key === 'is_standard') {
            html += `
                <div class="input-group" style="order: 98; flex-direction: row; align-items: center; gap: 10px; padding-top: 25px;">
                    <input type="checkbox" id="admin_input_is_standard" style="width: 20px; height: 20px; cursor: pointer; accent-color: var(--primary);" checked>
                    <label for="admin_input_is_standard" style="margin-bottom: 0; cursor: pointer; text-transform: none; font-weight: bold; color: var(--text-primary);">${labelText}</label>
                </div>
            `;
        } else if (key === 'ghi_chu') {
            html += `
                <div class="input-group" style="order: 99; grid-column: 1 / -1;">
                    <label>GHI CHÚ:</label>
                    <div id="admin_note_btn" class="admin-note-btn" onclick="toggleAdminNote()">+ Thêm ghi chú</div>
                    <textarea id="admin_input_ghi_chu" placeholder="Nhập nội dung ghi chú..." style="display: none; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; font-family: inherit; margin-top: 5px; resize: vertical; min-height: 80px;"></textarea>
                </div>
            `;
        } else if (key === 'tieu_chuan') {
            html += `
                <div class="input-group">
                    <label>${labelText}:</label>
                    <div style="display: flex; gap: 5px;">
                        <input type="${type}" id="admin_input_${key}" placeholder="Auto (S/kW)..." readonly style="background-color: #f8f9fa; flex: 1;">
                        <button id="btn_edit_tieu_chuan" type="button" style="padding: 0 10px; cursor:pointer; background:var(--bg); border-radius:4px; border:1px solid var(--border-color); color:var(--primary);" onclick="toggleEditTieuChuan()" title="Sửa thủ công">✏️</button>
                    </div>
                </div>
            `;
        } else if (key === 'delta_t') {
            html += `
                <div class="input-group">
                    <label>${labelText}:</label>
                    <div style="display: flex; gap: 5px;">
                        <input type="${type}" id="admin_input_${key}" placeholder="Auto (Tr - Tmc)..." readonly style="background-color: #f8f9fa; flex: 1;">
                        <button id="btn_edit_delta_t" type="button" style="padding: 0 10px; cursor:pointer; background:var(--bg); border-radius:4px; border:1px solid var(--border-color); color:var(--primary);" onclick="toggleEditDeltaT()" title="Sửa thủ công">✏️</button>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="input-group">
                    <label>${labelText}:</label>
                    <input type="${type}" id="admin_input_${key}" placeholder="${placeholder}" ${key==='id'?'style="border-color:var(--primary); font-weight:bold;"':''} step="any" ${listAttr}>
                    ${datalistHtml}
                </div>
            `;
        }
    });
    container.innerHTML = html;
    
    // Attach event listeners for auto calculating 'tieu_chuan'
    setTimeout(() => {
        const inputS = document.getElementById('admin_input_s_tdn');
        const inputKw = document.getElementById('admin_input_kw');
        
        if (inputS && inputKw) {
            const calcFunc = () => {
                const inputTc = document.getElementById('admin_input_tieu_chuan');
                if (inputTc && inputTc.readOnly) {
                    const s = parseFloat(inputS.value);
                    const kw = parseFloat(inputKw.value);
                    if (!isNaN(s) && !isNaN(kw) && kw !== 0) {
                        inputTc.value = (s / kw).toFixed(2);
                    } else {
                        inputTc.value = '';
                    }
                }
            };
            inputS.addEventListener('input', calcFunc);
            inputKw.addEventListener('input', calcFunc);
        }

        // Attach event listeners for auto calculating 'delta_t'
        const inputTr = document.getElementById('admin_input_t_phong');
        const inputTmc = document.getElementById('admin_input_t_bayhoi');
        
        if (inputTr && inputTmc) {
            const calcDtFunc = () => {
                const inputDt = document.getElementById('admin_input_delta_t');
                if (inputDt && inputDt.readOnly) {
                    const tr = parseFloat(inputTr.value);
                    const tmc = parseFloat(inputTmc.value);
                    if (!isNaN(tr) && !isNaN(tmc)) {
                        inputDt.value = parseFloat((tr - tmc).toFixed(2));
                    } else {
                        inputDt.value = '';
                    }
                }
            };
            inputTr.addEventListener('input', calcDtFunc);
            inputTmc.addEventListener('input', calcDtFunc);
        }
    }, 50);
}

function toggleEditTieuChuan() {
    const inputTc = document.getElementById('admin_input_tieu_chuan');
    const btn = document.getElementById('btn_edit_tieu_chuan');
    if (!inputTc || !btn) return;
    
    if (inputTc.readOnly) {
        inputTc.readOnly = false;
        inputTc.style.backgroundColor = 'white';
        btn.innerHTML = '🔄';
        btn.title = 'Trở về Tự động';
        btn.style.backgroundColor = '#fff3e0';
        btn.style.borderColor = '#ffb74d';
        btn.style.color = '#e65100';
        inputTc.focus();
    } else {
        inputTc.readOnly = true;
        inputTc.style.backgroundColor = '#f8f9fa';
        btn.innerHTML = '✏️';
        btn.title = 'Sửa thủ công';
        btn.style.backgroundColor = 'var(--bg)';
        btn.style.borderColor = 'var(--border-color)';
        btn.style.color = 'var(--primary)';
        
        // Trigger auto calculation immediately
        const inputS = document.getElementById('admin_input_s_tdn');
        const inputKw = document.getElementById('admin_input_kw');
        if (inputS && inputKw) {
            const s = parseFloat(inputS.value);
            const kw = parseFloat(inputKw.value);
            if (!isNaN(s) && !isNaN(kw) && kw !== 0) {
                inputTc.value = (s / kw).toFixed(2);
            } else {
                inputTc.value = '';
            }
        }
    }
}

function toggleEditDeltaT() {
    const inputDt = document.getElementById('admin_input_delta_t');
    const btn = document.getElementById('btn_edit_delta_t');
    if (!inputDt || !btn) return;
    
    if (inputDt.readOnly) {
        inputDt.readOnly = false;
        inputDt.style.backgroundColor = 'white';
        btn.innerHTML = '🔄';
        btn.title = 'Trở về Tự động';
        btn.style.backgroundColor = '#fff3e0';
        btn.style.borderColor = '#ffb74d';
        btn.style.color = '#e65100';
        inputDt.focus();
    } else {
        inputDt.readOnly = true;
        inputDt.style.backgroundColor = '#f8f9fa';
        btn.innerHTML = '✏️';
        btn.title = 'Sửa thủ công';
        btn.style.backgroundColor = 'var(--bg)';
        btn.style.borderColor = 'var(--border-color)';
        btn.style.color = 'var(--primary)';
        
        // Trigger auto calculation immediately
        const inputTr = document.getElementById('admin_input_t_phong');
        const inputTmc = document.getElementById('admin_input_t_bayhoi');
        if (inputTr && inputTmc) {
            const tr = parseFloat(inputTr.value);
            const tmc = parseFloat(inputTmc.value);
            if (!isNaN(tr) && !isNaN(tmc)) {
                inputDt.value = parseFloat((tr - tmc).toFixed(2));
            } else {
                inputDt.value = '';
            }
        }
    }
}

function toggleAdminNote() {
    const textarea = document.getElementById('admin_input_ghi_chu');
    const btn = document.getElementById('admin_note_btn');
    if (textarea.style.display === 'none') {
        textarea.style.display = 'block';
        btn.innerHTML = '- Ẩn ghi chú';
        btn.style.backgroundColor = 'var(--primary)';
        btn.style.color = 'white';
        textarea.focus();
    } else {
        textarea.style.display = 'none';
        btn.innerHTML = '+ Thêm ghi chú';
        btn.style.backgroundColor = '#e3f2fd';
        btn.style.color = 'var(--primary)';
    }
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

// --- QUẢN LÝ TỪ ĐIỂN MÃ ID ---
function renderAdminDict() {
    const tbody = document.getElementById('admin-dict-body');
    if (!tbody) return;
    
    let html = '';
    const keys = Object.keys(tempDictionary).sort();
    
    if (keys.length === 0) {
        html = '<tr><td colspan="3" class="no-data">Chưa có mã ID nào trong từ điển.</td></tr>';
    } else {
        keys.forEach(k => {
            html += `<tr>
                <td class="val-bold">${k}</td>
                <td style="text-align: left;">${tempDictionary[k]}</td>
                <td><button style="background:var(--accent); color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;" onclick="deleteAdminDict('${k}')">🗑</button></td>
            </tr>`;
        });
    }
    tbody.innerHTML = html;
}

function addAdminDict() {
    const prefix = document.getElementById('admin-dict-prefix').value.trim().toUpperCase();
    const name = document.getElementById('admin-dict-name').value.trim();
    
    if (!prefix || !name) {
        alert("Vui lòng điền đầy đủ Mã viết tắt và Tên Công ty!");
        return;
    }
    
    tempDictionary[prefix] = name;
    if (typeof customerDictionary !== 'undefined') {
        customerDictionary[prefix] = name;
    }
    document.getElementById('admin-dict-prefix').value = '';
    document.getElementById('admin-dict-name').value = '';
    
    renderAdminDict();
    if (typeof populateAllDropdowns === 'function') populateAllDropdowns();
    alert("Đã thêm/cập nhật từ điển thành công! Hãy bấm 'TẢI FILE DỮ LIỆU JS' của Air Cooler để lưu lại.");
}

function deleteAdminDict(prefix) {
    if (confirm(`Bạn có chắc muốn xóa mã khách hàng: ${prefix}?`)) {
        delete tempDictionary[prefix];
        if (typeof customerDictionary !== 'undefined') {
            delete customerDictionary[prefix];
        }
        renderAdminDict();
        if (typeof populateAllDropdowns === 'function') populateAllDropdowns();
    }
}

// --- RENDER BẢNG ---
function setAdminTableFilter(filterVal) {
    currentAdminTableFilter = filterVal;
    
    // Update active class on buttons
    const btnStandard = document.getElementById('admin-filter-standard');
    const btnAll = document.getElementById('admin-filter-all');
    if (btnStandard && btnAll) {
        if (filterVal === 'standard') {
            btnStandard.classList.add('active');
            btnAll.classList.remove('active');
        } else {
            btnStandard.classList.remove('active');
            btnAll.classList.add('active');
        }
    }
    
    renderAdminTable();
}

function toggleItemStandard(id, checked) {
    const db = currentAdminDb === 'evap' ? tempEvapDb : tempCondDb;
    const item = db.find(i => i.id === id);
    if (item) {
        item.is_standard = checked;
        
        // Cập nhật database toàn cục tương ứng
        if (currentAdminDb === 'evap') {
            if (typeof modelDatabase !== 'undefined') {
                const globalItem = modelDatabase.find(i => i.id === id);
                if (globalItem) globalItem.is_standard = checked;
            }
        } else {
            if (typeof modelDatabaseCond !== 'undefined') {
                const globalItem = modelDatabaseCond.find(i => i.id === id);
                if (globalItem) globalItem.is_standard = checked;
            }
        }
        
        // Load lại bảng
        renderAdminTable();
    }
}

function renderAdminTable() {
    const db = currentAdminDb === 'evap' ? tempEvapDb : tempCondDb;
    const keys = currentAdminDb === 'evap' ? evapKeys : condKeys;
    const tHead = document.getElementById('admin-table-head');
    const tBody = document.getElementById('admin-table-body');
    
    // Áp dụng bộ lọc
    let displayDb = db;
    if (currentAdminTableFilter === 'standard') {
        displayDb = db.filter(item => item.is_standard !== false);
    }
    
    document.getElementById('admin-db-count').innerText = `(${displayDb.length})`;

    // Tạo Header
    let headHtml = '<tr><th>THAO TÁC</th>';
    const keyLabels = {
        'model': 'Mã Model', 'loai_dan': 'Loại Dàn', 'kw': 'Công suất (kW)', 'hp': 'CS Máy (HP)',
        's_tdn': 'DTTĐN (m2)', 'tieu_chuan': 'Tiêu chuẩn (m2/kW)', 't_bayhoi': 'Tmc (°C)', 
        't_phong': 'Tr (°C)', 'delta_t': 'Delta T (K)', 't_ngungtu': 'Tc (°C)', 't_wb': 'Twb (°C)',
        'moi_chat': 'Môi chất', 'van_hanh': 'Vận hành', 'loai_ong': 'Loại ống', 'loai_canh': 'Lá tản nhiệt',
        'v_wind': 'Tốc độ gió (m/s)', 'dk_quat': 'Đường kính quạt', 'sl_quat': 'Số lượng quạt',
        'is_standard': 'Tiêu chuẩn'
    };
    keys.forEach(k => {
        const label = keyLabels[k] || k.toUpperCase();
        headHtml += `<th>${label}</th>`;
    });
    headHtml += '</tr>';
    tHead.innerHTML = headHtml;

    // Tạo Body
    let bodyHtml = '';
    if (displayDb.length === 0) {
        bodyHtml = `<tr><td colspan="${keys.length + 1}" class="no-data">Chưa có dữ liệu</td></tr>`;
    } else {
        // Render từ mới nhất đến cũ nhất
        [...displayDb].reverse().forEach(item => {
            let rowHtml = `<tr class="${item.is_standard === false ? 'non-standard-row' : ''}">
                <td style="white-space: nowrap;">
                    <button style="background:var(--primary); color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;" onclick="editAdminModel('${item.id}')">✏ Sửa</button>
                    <button style="background:#0288d1; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;" onclick="duplicateAdminModel('${item.id}')" title="Nhân bản Model">📑</button>
                    <button style="background:var(--accent); color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;" onclick="deleteAdminModel('${item.id}')">🗑 Xóa</button>
                </td>`;
            keys.forEach(k => {
                if (k === 'is_standard') {
                    const isChecked = item[k] !== false;
                    rowHtml += `<td style="text-align: center;">
                        <input type="checkbox" class="compare-cb" ${isChecked ? 'checked' : ''} onchange="toggleItemStandard('${item.id}', this.checked)">
                    </td>`;
                } else if (k === 'ghi_chu') {
                    if (item[k] && item[k].trim() !== '') {
                        rowHtml += `<td style="text-align: center;"><span class="icon-info icon-note-active" onclick="showNoteModal(\`${item[k].replace(/`/g, '\\`')}\`)" title="Xem ghi chú">i</span></td>`;
                    } else {
                        rowHtml += `<td style="text-align: center;"><span class="icon-info icon-note-inactive" title="Không có ghi chú">i</span></td>`;
                    }
                } else {
                    rowHtml += `<td>${item[k] !== null && item[k] !== undefined ? item[k] : ''}</td>`;
                }
            });
            rowHtml += '</tr>';
            bodyHtml += rowHtml;
        });
    }
    tBody.innerHTML = bodyHtml;
    
    renderAdminStats(displayDb);
}

// --- THỐNG KÊ DASHBOARD ---
function renderAdminStats(db) {
    const panel = document.getElementById('admin-stats-panel');
    if (!panel) return;
    
    const countMoiChat = {};
    const countLoaiDan = {};
    
    db.forEach(i => {
        if (i.moi_chat) { countMoiChat[i.moi_chat] = (countMoiChat[i.moi_chat] || 0) + 1; }
        if (i.loai_dan) { countLoaiDan[i.loai_dan] = (countLoaiDan[i.loai_dan] || 0) + 1; }
    });
    
    let html = `
        <div style="background: var(--primary); color: white; padding: 15px; border-radius: 8px; flex: 1; min-width: 150px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold;">${db.length}</div>
            <div style="font-size: 12px; opacity: 0.9;">TỔNG SỐ MODEL</div>
        </div>
    `;
    
    html += `
        <div style="background: #0288d1; color: white; padding: 15px; border-radius: 8px; flex: 1; min-width: 200px;">
            <div style="font-size: 12px; opacity: 0.9; margin-bottom: 5px; font-weight:bold;">THEO MÔI CHẤT</div>
            <div style="font-size: 14px;">
                ${Object.entries(countMoiChat).map(([k, v]) => `<span>${k}: <b>${v}</b></span>`).join(' | ') || 'Không có dữ liệu'}
            </div>
        </div>
    `;
    
    html += `
        <div style="background: #00796b; color: white; padding: 15px; border-radius: 8px; flex: 1; min-width: 200px;">
            <div style="font-size: 12px; opacity: 0.9; margin-bottom: 5px; font-weight:bold;">THEO LOẠI DÀN</div>
            <div style="font-size: 14px;">
                ${Object.entries(countLoaiDan).map(([k, v]) => `<span>${k}: <b>${v}</b></span>`).join(' | ') || 'Không có dữ liệu'}
            </div>
        </div>
    `;
    
    panel.innerHTML = html;
}

// --- XÓA MODEL ---
function deleteAdminModel(id) {
    if (!confirm(`Bạn có chắc chắn muốn xóa model có ID: ${id}?`)) return;
    
    if (currentAdminDb === 'evap') {
        tempEvapDb = tempEvapDb.filter(i => i.id !== id);
        if (typeof modelDatabase !== 'undefined') {
            modelDatabase.length = 0;
            modelDatabase.push(...tempEvapDb);
        }
    } else {
        tempCondDb = tempCondDb.filter(i => i.id !== id);
        if (typeof modelDatabaseCond !== 'undefined') {
            modelDatabaseCond.length = 0;
            modelDatabaseCond.push(...tempCondDb);
        }
    }
    renderAdminTable();
    if (typeof populateAllDropdowns === 'function') populateAllDropdowns();
    if (editingModelId === id) resetAdminForm();
}

// --- NHÂN BẢN MODEL ---
function duplicateAdminModel(id) {
    const db = currentAdminDb === 'evap' ? tempEvapDb : tempCondDb;
    const item = db.find(i => i.id === id);
    if (!item) return;

    resetAdminForm(); // Reset trước khi fill
    
    // Fill the form
    const keys = currentAdminDb === 'evap' ? evapKeys : condKeys;
    keys.forEach(k => {
        const el = document.getElementById(`admin_input_${k}`);
        if (el) {
            if (k === 'is_standard') {
                el.checked = item[k] !== false;
            } else {
                el.value = item[k] || '';
            }
        }
    });
    
    // Modify ID slightly to avoid immediate collision
    const elId = document.getElementById('admin_input_id');
    if (elId) elId.value = item.id + '_COPY';
    
    document.getElementById('admin-form-title').innerText = "NHÂN BẢN MODEL (Đang copy từ " + item.id + ")";
    document.getElementById('admin-form-title').style.color = 'var(--accent)';
    
    const formContainer = document.getElementById('admin-form-container');
    if (formContainer) formContainer.open = true;
    formContainer.scrollIntoView({ behavior: 'smooth' });
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
        if (el) {
            if (k === 'is_standard') {
                el.checked = modelToEdit[k] !== false;
            } else {
                el.value = modelToEdit[k] !== null && modelToEdit[k] !== undefined ? modelToEdit[k] : '';
            }
        }
    });
    
    // Xử lý nút ghi chú
    const noteTextarea = document.getElementById('admin_input_ghi_chu');
    const noteBtn = document.getElementById('admin_note_btn');
    if (noteTextarea && modelToEdit['ghi_chu'] && modelToEdit['ghi_chu'].trim() !== '') {
        noteTextarea.style.display = 'block';
        if (noteBtn) {
            noteBtn.innerHTML = '- Ẩn ghi chú';
            noteBtn.style.backgroundColor = 'var(--primary)';
            noteBtn.style.color = 'white';
        }
    } else if (noteTextarea) {
        noteTextarea.style.display = 'none';
        if (noteBtn) {
            noteBtn.innerHTML = '+ Thêm ghi chú';
            noteBtn.style.backgroundColor = '#e3f2fd';
            noteBtn.style.color = 'var(--primary)';
        }
    }

    // Cuộn lên form
    const formContainer = document.getElementById('admin-form-container');
    if (formContainer) formContainer.open = true;
    formContainer.scrollIntoView({ behavior: 'smooth' });
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
            if (k === 'is_standard') {
                el.checked = true;
            } else if (k === 'tieu_chuan' || k === 'delta_t') {
                el.value = '';
                el.readOnly = true;
                el.style.backgroundColor = '#f8f9fa';
                
                // Reset edit button to Auto mode
                const btn = document.getElementById(`btn_edit_${k}`);
                if (btn) {
                    btn.innerHTML = '✏️';
                    btn.title = 'Sửa thủ công';
                    btn.style.backgroundColor = 'var(--bg)';
                    btn.style.borderColor = 'var(--border-color)';
                    btn.style.color = 'var(--primary)';
                }
            } else {
                el.value = '';
                el.readOnly = false;
                el.style.backgroundColor = 'white';
            }
        }
    });

    const noteTextarea = document.getElementById('admin_input_ghi_chu');
    const noteBtn = document.getElementById('admin_note_btn');
    if (noteTextarea) {
        noteTextarea.style.display = 'none';
        if (noteBtn) {
            noteBtn.innerHTML = '+ Thêm ghi chú';
            noteBtn.style.backgroundColor = '#e3f2fd';
            noteBtn.style.color = 'var(--primary)';
        }
    }
}

// --- LƯU MODEL (THÊM/SỬA) ---
function saveAdminModel() {
    const keys = currentAdminDb === 'evap' ? evapKeys : condKeys;
    const newModel = {};
    let hasError = false;
    let errorFields = [];

    // Khôi phục viền cho tất cả input
    keys.forEach(k => {
        const inputEl = document.getElementById(`admin_input_${k}`);
        if(inputEl) {
            inputEl.style.borderColor = "#ccc";
            inputEl.style.backgroundColor = "white";
        }
    });
    
    // Đọc và kiểm tra dữ liệu từ form
    keys.forEach(k => {
        const inputEl = document.getElementById(`admin_input_${k}`);
        if (!inputEl) return;
        
        if (k === 'is_standard') {
            newModel[k] = inputEl.checked;
            return;
        }

        const val = inputEl.value.trim();
        
        // Chuyển kiểu number nếu cần
        if (["kw", "hp", "s_tdn", "tieu_chuan", "t_bayhoi", "t_phong", "t_ngungtu", "t_wb", "delta_t", "v_wind", "dk_quat", "sl_quat"].includes(k)) {
            if (val === '') {
                newModel[k] = ""; // Cho phép để trống như user yêu cầu
            } else {
                let parsed = parseFloat(val);
                if (isNaN(parsed)) {
                    hasError = true;
                    errorFields.push(k.toUpperCase());
                    inputEl.style.borderColor = "red";
                    inputEl.style.backgroundColor = "#ffebee";
                } else {
                    newModel[k] = parsed;
                }
            }
        } else {
            newModel[k] = val;
            // Validate trường bắt buộc
            if ((k === 'id' || k === 'model') && val === '') {
                hasError = true;
                errorFields.push(k.toUpperCase());
                inputEl.style.borderColor = "red";
                inputEl.style.backgroundColor = "#ffebee";
            }
        }
    });

    if (hasError) {
        alert("LỖI NHẬP LIỆU ở các trường: " + errorFields.join(', ') + ".\n\n- MÃ ID và MODEL là bắt buộc, không được để trống.\n- Các ô Thông số kỹ thuật (như Công suất, Diện tích, Nhiệt độ...) bắt buộc phải nhập SỐ (có thể dùng dấu . cho số thập phân) hoặc ĐỂ TRỐNG.");
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
        if (typeof modelDatabase !== 'undefined') {
            modelDatabase.length = 0;
            modelDatabase.push(...tempEvapDb);
        }
    } else {
        if (editingModelId) {
            const idx = tempCondDb.findIndex(i => i.id === editingModelId);
            if (idx !== -1) tempCondDb[idx] = newModel;
        } else {
            if (tempCondDb.some(i => i.id === newModel.id)) return alert("Mã ID này đã tồn tại!");
            tempCondDb.push(newModel);
        }
        if (typeof modelDatabaseCond !== 'undefined') {
            modelDatabaseCond.length = 0;
            modelDatabaseCond.push(...tempCondDb);
        }
    }

    if (typeof populateAllDropdowns === 'function') populateAllDropdowns();

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
    let fileContent = `// TỆP DỮ LIỆU TỰ ĐỘNG SINH TỪ QUẢN TRỊ ADMIN\n`;
    
    // Nếu là evap (data.js), chèn thêm customerDictionary
    if (currentAdminDb === 'evap') {
        fileContent += `const customerDictionary = ${JSON.stringify(tempDictionary, null, 2)};\n`;
    }
    
    fileContent += `const ${varName} = [\n`;
    
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

// --- IMPORT CSV ---
function importCSV() {
    const fileInput = document.getElementById('csv-upload');
    if (!fileInput || !fileInput.files.length) {
        alert("Vui lòng chọn file CSV trước khi bấm Nhập CSV!");
        return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const text = e.target.result;
        try {
            // Very simple CSV parser: split by newlines, split by comma
            // Does not handle commas inside quotes perfectly, but sufficient for standard GT SpecBoard exports
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length < 2) {
                alert("File CSV không hợp lệ hoặc không có dữ liệu!");
                return;
            }
            
            const headers = lines[0].split(',').map(h => h.toLowerCase().trim().replace(/['"]/g, ''));
            const db = currentAdminDb === 'evap' ? tempEvapDb : tempCondDb;
            let addedCount = 0;
            
            for (let i = 1; i < lines.length; i++) {
                // Split handling basic quotes (basic regex)
                const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
                if (values.length < 2) continue;
                
                const obj = {};
                headers.forEach((h, index) => {
                    if (index < values.length) {
                        let val = values[index].replace(/^"|"$/g, '').trim();
                        if (val === "" || val === "-") val = "";
                        else if (!isNaN(val) && val !== "") val = parseFloat(val);
                        obj[h] = val;
                    }
                });
                
                if (obj.id) {
                    // Check if exists, overwrite if yes, else push
                    const existingIndex = db.findIndex(item => item.id === obj.id);
                    if (existingIndex > -1) {
                        db[existingIndex] = obj;
                    } else {
                        db.push(obj);
                    }
                    addedCount++;
                }
            }
            
            if (currentAdminDb === 'evap') {
                if (typeof modelDatabase !== 'undefined') {
                    modelDatabase.length = 0;
                    modelDatabase.push(...tempEvapDb);
                }
            } else {
                if (typeof modelDatabaseCond !== 'undefined') {
                    modelDatabaseCond.length = 0;
                    modelDatabaseCond.push(...tempCondDb);
                }
            }
            
            renderAdminTable();
            if (typeof populateAllDropdowns === 'function') populateAllDropdowns();
            alert(`Nhập CSV thành công! Đã thêm/cập nhật ${addedCount} Model.\nVui lòng kiểm tra lại bảng và bấm "TẢI FILE DỮ LIỆU JS MỚI" để lưu.`);
            fileInput.value = ""; // Reset input
        } catch (error) {
            console.error(error);
            alert("Đã xảy ra lỗi khi đọc file CSV. Vui lòng kiểm tra lại định dạng.");
        }
    };
    
    reader.readAsText(file);
}

// --- TỰ ĐỘNG XỔ NGANG CHO MENU CÓ NHIỀU THÔNG TIN ---
document.addEventListener('DOMContentLoaded', () => {
    const detailsElements = document.querySelectorAll('.admin-menu-details');
    
    detailsElements.forEach(details => {
        // Kiểm tra ngay khi tải trang (dành cho các menu có sẵn)
        checkAndApplyWideClass(details);
        
        // Kiểm tra mỗi khi bật/tắt (dành cho menu render động như THÊM MODEL)
        details.addEventListener('toggle', () => {
            if (details.open) {
                checkAndApplyWideClass(details);
            }
        });
    });

    function checkAndApplyWideClass(el) {
        // Đếm số lượng ô nhập liệu bên trong
        const inputCount = el.querySelectorAll('input, select, textarea').length;
        
        if (inputCount > 8) {
            el.classList.add('wide-on-open');
        } else {
            el.classList.remove('wide-on-open');
        }
    }
});
