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

// --- FORMAT TIME ---
function formatDateTime(isoString) {
    if (!isoString) return 'Không rõ';
    try {
        const date = new Date(isoString);
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + 
               date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch(e) {
        return 'Lỗi ngày';
    }
}

// --- AUTH & CLOUD SYNC ---
async function loginSystem() {
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-login-submit');
    const err = document.getElementById('login-error');
    
    if (!user) {
        err.innerText = "Vui lòng nhập tài khoản";
        err.style.display = 'block';
        return;
    }
    
    btn.innerText = "ĐANG KIỂM TRA...";
    btn.disabled = true;
    
    
    
    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "login", username: user, password: pass })
        });
        const result = await res.json();
        
        if (result.status === 'success') {
            sessionStorage.setItem('gtspec_role', result.role);
            sessionStorage.setItem('gtspec_username', user);
            window.location.reload(); 
        } else {
            err.innerText = result.message || "Sai tài khoản hoặc mật khẩu";
            err.style.display = 'block';
            btn.innerText = "ĐĂNG NHẬP";
            btn.disabled = false;
        }
    } catch (e) {
        err.innerText = "Lỗi kết nối máy chủ";
        err.style.display = 'block';
        btn.innerText = "ĐĂNG NHẬP";
        btn.disabled = false;
    }
}

async function syncToCloud(silent = false) {
    const inlineStatus = document.getElementById('inline-sync-status');
    if (!silent) {
        if (inlineStatus) {
            inlineStatus.style.display = 'flex';
            inlineStatus.style.color = 'var(--primary)';
            inlineStatus.innerHTML = '<div class="loader" style="width: 12px; height: 12px; border-width: 2px; min-width: 12px;"></div> ĐANG LƯU...';
        } else {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.display = 'flex';
                const loadingH3 = document.querySelector('#loading-screen h3');
                if (loadingH3) loadingH3.innerText = "ĐANG ĐỒNG BỘ LÊN CLOUD...";
            }
        }
    }
    
    const normalizeDB = (db, keys) => {
        if (!db) return [];
        return db.map(item => {
            const normalized = {};
            keys.forEach(k => {
                if (k === 'is_standard') {
                    // Cố định giá trị true/false, mặc định là true nếu cũ, hỗ trợ "custom"
                    if (item[k] === 'custom') {
                        normalized[k] = 'custom';
                    } else {
                        normalized[k] = item[k] !== undefined ? (String(item[k]).toLowerCase() !== 'false') : true;
                    }
                } else {
                    normalized[k] = item[k] !== undefined && item[k] !== null ? item[k] : "";
                }
            });
            // Giữ lại các trường metadata
            if (item.createdBy) normalized.createdBy = item.createdBy;
            if (item.createdAt) normalized.createdAt = item.createdAt;
            if (item.updatedAt) normalized.updatedAt = item.updatedAt;
            return normalized;
        });
    };

    const payload = {
        evap: normalizeDB(modelDatabase, evapKeys),
        cond: normalizeDB(modelDatabaseCond, condKeys),
        dict: customerDictionary || {}
    };
    
    Object.keys(globalData).forEach(key => {
        if (!['evap', 'cond', 'dict', 'users'].includes(key)) {
            payload[key] = globalData[key];
        }
    });

    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "sync", payload: payload })
        });
        const result = await res.json();
        if (result.status === 'success') {
            if (inlineStatus) {
                inlineStatus.style.color = 'var(--success, #4caf50)';
                inlineStatus.innerHTML = '✅ Dữ liệu đã đồng bộ';
            }
        } else {
            if (inlineStatus) {
                inlineStatus.style.color = 'var(--danger, #f44336)';
                inlineStatus.innerHTML = '❌ Lỗi đồng bộ';
            }
        }
    } catch (e) {
        if (inlineStatus) {
            inlineStatus.style.color = 'var(--danger, #f44336)';
            inlineStatus.innerHTML = '❌ Lỗi kết nối';
        }
    } finally {
        if (!silent) {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) loadingScreen.style.display = 'none';
        }
    }
}

async function syncOldData() {
    if (await customConfirm("Thao tác này sẽ đẩy toàn bộ dữ liệu từ file tĩnh cũ lên Google Sheets. Bạn có chắc chắn không?")) {
        syncToCloud(false);
    }
}

function addNewSheet() {
    const role = sessionStorage.getItem('gtspec_role') ? sessionStorage.getItem('gtspec_role').trim().toLowerCase() : '';
    if (role !== 'admin') {
        customAlert("Chỉ Admin mới có quyền tạo Sheet mới!");
        return;
    }
    const name = document.getElementById('admin-sheet-name').value.trim().toUpperCase();
    if (!name) {
        customAlert("Vui lòng nhập tên Sheet");
        return;
    }
    if (['EVAP', 'COND', 'DICT', 'USERS'].includes(name)) {
        customAlert("Tên này đã tồn tại hoặc là từ khóa hệ thống.");
        return;
    }
    
    globalData[name.toLowerCase()] = [{ id: "SAMPLE-01", model: "Sample Item", createdBy: sessionStorage.getItem('gtspec_username') }];
    syncToCloud(false);
}

// --- CHUYỂN ĐỔI DATABASE QUẢN LÝ ---
function changeAdminDb() {
    currentAdminDb = document.getElementById('admin-db-select').value;
    resetAdminForm();
    renderAdminForm();
    renderAdminTable();
    if (typeof renderAdminDict === 'function') renderAdminDict();
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
                <div class="input-group" style="order: 98;">
                    <label style="font-weight: bold;">${labelText}:</label>
                    <select id="admin_input_is_standard" style="padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: white;">
                        <option value="true">Tiêu chuẩn</option>
                        <option value="false">Dàn mẫu</option>
                        <option value="custom">Thiết kế riêng</option>
                    </select>
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
        customAlert("Master Key không hợp lệ! Vui lòng kiểm tra lại.");
        return;
    }
    
    localStorage.setItem('gtspec_pin_index', selectedIndex);
    localStorage.setItem('gtspec_start_date', Date.now()); // Khởi tạo lại chu kỳ 30 ngày
    
    customAlert("Đã đổi vòng lặp Mã PIN thành công! Hệ thống sẽ tải lại trang để áp dụng.").then(() => {
        window.location.reload();
    });
}

// --- QUẢN LÝ TỪ ĐIỂN MÃ ID ---
function renderAdminDict(filterText = "") {
    const tbody = document.getElementById('admin-dict-body');
    if (!tbody) return;
    
    let html = '';
    let keys = Object.keys(tempDictionary).sort();
    
    if (filterText) {
        const lowerFilter = filterText.toLowerCase();
        keys = keys.filter(k => k.toLowerCase().includes(lowerFilter) || tempDictionary[k].toLowerCase().includes(lowerFilter));
    }
    
    if (keys.length === 0) {
        html = '<tr><td colspan="3" class="no-data">Chưa có mã ID nào hoặc không tìm thấy.</td></tr>';
    } else {
        keys.forEach(k => {
            html += `<tr>
                <td class="val-bold">${k}</td>
                <td style="text-align: left;">${tempDictionary[k]}</td>
                <td>
                    <div style="display: flex; gap: 5px; justify-content: center;">
                        <button style="background:#f39c12; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer;" onclick="editAdminDict('${k}')" title="Sửa">✏️</button>
                        <button style="background:var(--accent); color:white; border:none; padding:5px; border-radius:4px; cursor:pointer;" onclick="deleteAdminDict('${k}')" title="Xóa">🗑</button>
                    </div>
                </td>
            </tr>`;
        });
    }
    tbody.innerHTML = html;
}

function editAdminDict(prefix) {
    document.getElementById('admin-dict-prefix').value = prefix;
    document.getElementById('admin-dict-name').value = tempDictionary[prefix];
    document.getElementById('admin-dict-prefix').focus();
}

async function addAdminDict() {
    const prefix = document.getElementById('admin-dict-prefix').value.trim().toUpperCase();
    const name = document.getElementById('admin-dict-name').value.trim();
    
    if (!prefix || !name) {
        customAlert("Vui lòng điền đầy đủ Mã viết tắt và Tên Công ty!");
        return;
    }
    
    tempDictionary[prefix] = name;
    if (typeof customerDictionary !== 'undefined') {
        customerDictionary[prefix] = name;
    }
    document.getElementById('admin-dict-prefix').value = '';
    document.getElementById('admin-dict-name').value = '';
    
    const searchInput = document.getElementById('admin-dict-search');
    renderAdminDict(searchInput ? searchInput.value : "");
    if (typeof populateAllDropdowns === 'function') populateAllDropdowns();
    
    await syncToCloud(false);
}

async function deleteAdminDict(prefix) {
    if (await customConfirm(`Bạn có chắc muốn xóa mã khách hàng: ${prefix}?`)) {
        delete tempDictionary[prefix];
        if (typeof customerDictionary !== 'undefined') {
            delete customerDictionary[prefix];
        }
        const searchInput = document.getElementById('admin-dict-search');
        renderAdminDict(searchInput ? searchInput.value : "");
        if (typeof populateAllDropdowns === 'function') populateAllDropdowns();
        
        await syncToCloud(false);
    }
}

// --- RENDER BẢNG ---
function setAdminTableFilter(filterVal) {
    currentAdminTableFilter = filterVal;
    
    // Update active class on buttons
    const btnStandard = document.getElementById('admin-filter-standard');
    const btnSample = document.getElementById('admin-filter-sample');
    const btnCustom = document.getElementById('admin-filter-custom');
    const btnAll = document.getElementById('admin-filter-all');
    
    if (btnStandard && btnSample && btnAll) {
        btnStandard.classList.remove('active');
        btnSample.classList.remove('active');
        if (btnCustom) btnCustom.classList.remove('active');
        btnAll.classList.remove('active');
        
        if (filterVal === 'standard') {
            btnStandard.classList.add('active');
        } else if (filterVal === 'sample') {
            btnSample.classList.add('active');
        } else if (filterVal === 'custom') {
            if (btnCustom) btnCustom.classList.add('active');
        } else {
            btnAll.classList.add('active');
        }
    }
    
    renderAdminTable();
}

function toggleItemStandard(id, value) {
    const db = currentAdminDb === 'evap' ? tempEvapDb : tempCondDb;
    const item = db.find(i => i.id === id);
    if (item) {
        item.is_standard = value === 'custom' ? 'custom' : (value === 'true');
        
        // Cập nhật database toàn cục tương ứng
        if (currentAdminDb === 'evap') {
            if (typeof modelDatabase !== 'undefined') {
                const globalItem = modelDatabase.find(i => i.id === id);
                if (globalItem) globalItem.is_standard = item.is_standard;
            }
        } else {
            if (typeof modelDatabaseCond !== 'undefined') {
                const globalItem = modelDatabaseCond.find(i => i.id === id);
                if (globalItem) globalItem.is_standard = item.is_standard;
            }
        }
        
        // Load lại bảng
        renderAdminTable();
        syncToCloud(false);
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
        displayDb = db.filter(item => item.is_standard !== 'custom' && String(item.is_standard).toLowerCase() !== 'false');
    } else if (currentAdminTableFilter === 'sample') {
        displayDb = db.filter(item => item.is_standard !== 'custom' && String(item.is_standard).toLowerCase() === 'false');
    } else if (currentAdminTableFilter === 'custom') {
        displayDb = db.filter(item => item.is_standard === 'custom');
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
            const isCustom = item.is_standard === 'custom';
            const isStd = !isCustom && String(item.is_standard).toLowerCase() !== 'false';
            
            let rowClass = '';
            if (isCustom) rowClass = 'custom-design-row';
            else if (!isStd) rowClass = 'non-standard-row';
            
            let rowHtml = `<tr class="${rowClass}">
                <td style="white-space: nowrap;">
                    <button style="background:var(--primary); color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;" onclick="editAdminModel('${item.id}')">✏ Sửa</button>
                    <button style="background:#0288d1; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;" onclick="duplicateAdminModel('${item.id}')" title="Nhân bản Model">📑</button>
                    <button style="background:var(--accent); color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;" onclick="deleteAdminModel('${item.id}')">🗑 Xóa</button>
                </td>`;
            keys.forEach(k => {
                if (k === 'is_standard') {
                    const selectColor = isCustom ? '#7f8c8d' : (isStd ? '#1d6f42' : '#d35400');
                    rowHtml += `<td style="text-align: center;">
                        <select onchange="toggleItemStandard('${item.id}', this.value)" style="padding: 4px; border-radius: 4px; border: 1px solid #ccc; font-weight: bold; color: ${selectColor}; background: transparent; cursor: pointer; text-align: center;">
                            <option value="true" ${isStd && !isCustom ? 'selected' : ''} style="color: #1d6f42;">Tiêu chuẩn</option>
                            <option value="false" ${!isStd && !isCustom ? 'selected' : ''} style="color: #d35400;">Dàn mẫu</option>
                            <option value="custom" ${isCustom ? 'selected' : ''} style="color: #7f8c8d;">Thiết kế riêng</option>
                        </select>
                    </td>`;
                } else if (k === 'id') {
                    // Tooltip Theo dõi (Audit Trail)
                    const creatorText = item.createdBy ? `Tạo bởi: ${item.createdBy}` : 'Tạo bởi: Admin (Dữ liệu gốc)';
                    const createdText = item.createdAt ? `&#10;Ngày tạo: ${formatDateTime(item.createdAt)}` : '';
                    const updatedText = item.updatedAt ? `&#10;Cập nhật: ${formatDateTime(item.updatedAt)}` : '';
                    const auditTrail = `${creatorText}${createdText}${updatedText}`;
                    
                    rowHtml += `<td class="val-id">
                        <div class="id-container">
                            <span class="id-text" title="${auditTrail}">${item[k]||"-"}</span>
                        </div>
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
    
    // Tính toán Cloud Capacity
    let totalRows = 0;
    if (typeof modelDatabase !== 'undefined') totalRows += modelDatabase.length;
    if (typeof modelDatabaseCond !== 'undefined') totalRows += modelDatabaseCond.length;
    const MAX_ROWS = 5000;
    const capacityPercent = Math.min((totalRows / MAX_ROWS) * 100, 100).toFixed(1);
    
    let barColor = 'var(--success, #4caf50)';
    if (totalRows >= 4000) {
        barColor = 'var(--danger, #f44336)';
    } else if (totalRows >= 2000) {
        barColor = 'var(--warning, #ffeb3b)';
    }
    
    let html = `
        <div style="background: var(--card); border: 1px solid var(--border-color); padding: 15px; border-radius: 8px; flex: 1; min-width: 250px;">
            <div style="background: #e0e0e0; border-radius: 10px; height: 15px; width: 100%; overflow: hidden; margin-bottom: 5px;">
                <div style="background: ${barColor}; height: 100%; width: ${capacityPercent}%; transition: width 0.5s ease-in-out;"></div>
            </div>
            <div style="font-size: 13px; color: var(--text-secondary); display: flex; justify-content: flex-end; align-items: center; gap: 10px; font-weight: bold;">
                <span id="inline-sync-status" style="display: flex; color: var(--success, #4caf50); font-size: 11px; align-items: center; gap: 5px;">
                    ✅ Dữ liệu đã đồng bộ
                </span>
                <span>${capacityPercent}% / 100%</span>
            </div>
        </div>
    `;
    
    html += `
        <div style="background: var(--primary); color: white; padding: 15px; border-radius: 8px; flex: 1; min-width: 150px; text-align: center; display: flex; flex-direction: column; justify-content: center;">
            <div style="font-size: 24px; font-weight: bold;">${db.length}</div>
            <div style="font-size: 12px; opacity: 0.9;">TỔNG SỐ MODEL (TAB HIỆN TẠI)</div>
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
async function deleteAdminModel(id) {
    if (!(await customConfirm(`Bạn có chắc chắn muốn xóa model có ID: ${id}?`))) return;
    
    const role = sessionStorage.getItem('gtspec_role') ? sessionStorage.getItem('gtspec_role').trim().toLowerCase() : '';
    const username = sessionStorage.getItem('gtspec_username');
    
    if (currentAdminDb === 'evap') {
        const item = tempEvapDb.find(i => i.id === id);
        if (!item) return;

        if (role !== 'admin' && role !== 'editor') {
            customAlert("Bạn không có quyền xóa Model!");
            return;
        }
        tempEvapDb = tempEvapDb.filter(i => i.id !== id);
        if (typeof modelDatabase !== 'undefined') {
            modelDatabase.length = 0;
            modelDatabase.push(...tempEvapDb);
        }
    } else {
        const item = tempCondDb.find(i => i.id === id);
        if (!item) return;

        if (role !== 'admin' && role !== 'editor') {
            customAlert("Bạn không có quyền xóa Model!");
            return;
        }
        tempCondDb = tempCondDb.filter(i => i.id !== id);
        if (typeof modelDatabaseCond !== 'undefined') {
            modelDatabaseCond.length = 0;
            modelDatabaseCond.push(...tempCondDb);
        }
    }
    renderAdminTable();
    if (typeof populateAllDropdowns === 'function') populateAllDropdowns();
    if (editingModelId === id) resetAdminForm();
    
    syncToCloud(false);
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
                if (item[k] === 'custom') {
                    el.value = 'custom';
                } else {
                    const isStd = String(item[k]).toLowerCase() !== 'false';
                    el.value = isStd.toString();
                }
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
    
    // Tóm tắt lịch sử
    let historyText = "";
    if (modelToEdit.createdBy) {
        historyText = ` (Tạo bởi: ${modelToEdit.createdBy}`;
        if (modelToEdit.updatedAt) historyText += ` - Cập nhật: ${formatDateTime(modelToEdit.updatedAt)}`;
        else if (modelToEdit.createdAt) historyText += ` - Ngày tạo: ${formatDateTime(modelToEdit.createdAt)}`;
        historyText += `)`;
    }
    
    document.getElementById('admin-form-title').innerText = `ĐANG SỬA MODEL: ${modelToEdit.model} (ID: ${id})${historyText}`;
    document.getElementById('admin-form-title').style.color = 'var(--accent)';
    
    // Khóa ô ID lại để không cho sửa ID (ID là định danh duy nhất)
    document.getElementById(`admin_input_id`).readOnly = true;
    document.getElementById(`admin_input_id`).style.backgroundColor = '#e0e0e0';

    keys.forEach(k => {
        const el = document.getElementById(`admin_input_${k}`);
        if (el) {
            if (k === 'is_standard') {
                if (modelToEdit[k] === 'custom') {
                    el.value = 'custom';
                } else {
                    const isStd = String(modelToEdit[k]).toLowerCase() !== 'false';
                    el.value = isStd.toString();
                }
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
                el.value = "true";
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
            const selectVal = inputEl.value;
            newModel[k] = selectVal === 'custom' ? 'custom' : (selectVal === "true");
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
        customAlert("LỖI NHẬP LIỆU ở các trường: " + errorFields.join(', ') + ".\n\n- MÃ ID và MODEL là bắt buộc, không được để trống.\n- Các ô Thông số kỹ thuật (như Công suất, Diện tích, Nhiệt độ...) bắt buộc phải nhập SỐ (có thể dùng dấu . cho số thập phân) hoặc ĐỂ TRỐNG.");
        return;
    }

    const role = sessionStorage.getItem('gtspec_role') ? sessionStorage.getItem('gtspec_role').trim().toLowerCase() : '';
    const username = sessionStorage.getItem('gtspec_username') || 'Unknown';
    const currentTime = new Date().toISOString();

    if (currentAdminDb === 'evap') {
        if (editingModelId) {
            const idx = tempEvapDb.findIndex(i => i.id === editingModelId);
            if (idx !== -1) {
                // Kiểm tra quyền
                if (role !== 'admin' && role !== 'editor') {
                    customAlert("Bạn không có quyền sửa Model!");
                    return;
                }
                newModel.createdBy = tempEvapDb[idx].createdBy; // Giữ nguyên người tạo gốc
                newModel.createdAt = tempEvapDb[idx].createdAt || currentTime;
                newModel.updatedAt = currentTime;
                tempEvapDb[idx] = newModel;
            }
        } else {
            if (tempEvapDb.some(i => i.id === newModel.id)) { customAlert("Mã ID này đã tồn tại!"); return; }
            newModel.createdBy = username; // Gán người tạo mới
            newModel.createdAt = currentTime;
            newModel.updatedAt = currentTime;
            tempEvapDb.push(newModel);
        }
        if (typeof modelDatabase !== 'undefined') {
            modelDatabase.length = 0;
            modelDatabase.push(...tempEvapDb);
        }
    } else {
        if (editingModelId) {
            const idx = tempCondDb.findIndex(i => i.id === editingModelId);
            if (idx !== -1) {
                if (role !== 'admin' && role !== 'editor') {
                    customAlert("Bạn không có quyền sửa Model!");
                    return;
                }
                newModel.createdBy = tempCondDb[idx].createdBy;
                newModel.createdAt = tempCondDb[idx].createdAt || currentTime;
                newModel.updatedAt = currentTime;
                tempCondDb[idx] = newModel;
            }
        } else {
            if (tempCondDb.some(i => i.id === newModel.id)) { customAlert("Mã ID này đã tồn tại!"); return; }
            newModel.createdBy = username;
            newModel.createdAt = currentTime;
            newModel.updatedAt = currentTime;
            tempCondDb.push(newModel);
        }
        if (typeof modelDatabaseCond !== 'undefined') {
            modelDatabaseCond.length = 0;
            modelDatabaseCond.push(...tempCondDb);
        }
    }

    if (typeof populateAllDropdowns === 'function') populateAllDropdowns();

    resetAdminForm();
    renderAdminTable();
    
    // ĐỒNG BỘ LÊN CLOUD
    syncToCloud(false);
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
        customAlert("Vui lòng chọn file CSV trước khi bấm Nhập CSV!");
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
                customAlert("File CSV không hợp lệ hoặc không có dữ liệu!");
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
            customAlert(`Nhập CSV thành công! Đã thêm/cập nhật ${addedCount} Model.\nVui lòng kiểm tra lại bảng và bấm "TẢI FILE DỮ LIỆU JS MỚI" để lưu.`);
            fileInput.value = ""; // Reset input
        } catch (error) {
            console.error(error);
            customAlert("Đã xảy ra lỗi khi đọc file CSV. Vui lòng kiểm tra lại định dạng.");
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
