// --- UI LOGIC ---
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyhyeI6nnuN4NwQ78FHc2wSO_lxJuCYLAwRUfCP0hjqhDs2P0obgIs0lq4Eu1rK58pMpA/exec';

let globalData = {}; // Lưu toàn bộ data tải từ cloud
let compareList = [];
let currentEvapRes = [];
let currentCondRes = [];
let sortCol = '';
let sortAsc = true;
let searchStandardFilterEvap = 'all';
let searchStandardFilterCond = 'all';

// Hàm đóng/mở form Login
function showLoginScreen() {
    document.getElementById('lock-screen').style.display = 'flex';
}

function hideLoginScreen() {
    document.getElementById('lock-screen').style.display = 'none';
}

function logoutSystem() {
    sessionStorage.removeItem('gtspec_role');
    sessionStorage.removeItem('gtspec_username');
    window.location.reload();
}

// --- CUSTOM MODAL (THAY THẾ ALERT & CONFIRM) ---
window.customAlert = function(msg) {
    return new Promise(resolve => {
        const overlay = document.getElementById('custom-modal-overlay');
        if (!overlay) return resolve(); // Fallback if HTML missing
        const msgEl = document.getElementById('custom-modal-message');
        const btnOk = document.getElementById('custom-modal-btn-ok');
        const btnCancel = document.getElementById('custom-modal-btn-cancel');
        
        msgEl.innerText = msg;
        btnCancel.style.display = 'none';
        overlay.style.display = 'flex';
        
        const closeMod = () => {
            overlay.style.display = 'none';
            btnOk.removeEventListener('click', closeMod);
            resolve();
        };
        btnOk.addEventListener('click', closeMod);
    });
};

window.customConfirm = function(msg) {
    return new Promise(resolve => {
        const overlay = document.getElementById('custom-modal-overlay');
        if (!overlay) return resolve(false);
        const msgEl = document.getElementById('custom-modal-message');
        const btnOk = document.getElementById('custom-modal-btn-ok');
        const btnCancel = document.getElementById('custom-modal-btn-cancel');
        
        msgEl.innerText = msg;
        btnCancel.style.display = 'inline-block';
        overlay.style.display = 'flex';
        
        const handleOk = () => closeMod(true);
        const handleCancel = () => closeMod(false);
        
        const closeMod = (result) => {
            overlay.style.display = 'none';
            btnOk.removeEventListener('click', handleOk);
            btnCancel.removeEventListener('click', handleCancel);
            resolve(result);
        };
        
        btnOk.addEventListener('click', handleOk);
        btnCancel.addEventListener('click', handleCancel);
    });
};

// Khởi tạo ứng dụng
async function initApp() {
    // 1. Kiểm tra trạng thái đăng nhập bắt buộc
    const role = sessionStorage.getItem('gtspec_role');
    if (!role) {
        // Chưa đăng nhập -> Hiện màn hình khóa, không cho vào ứng dụng
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('lock-screen').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
        return; // Dừng tại đây
    }

    // Đã đăng nhập -> Cấu hình giao diện dựa trên Role
    const roleLower = role.trim().toLowerCase();
    
    if (roleLower === 'admin' || roleLower === 'editor') {
        document.getElementById('admin-tab-btn').style.display = 'inline-block';
    } else {
        document.getElementById('admin-tab-btn').style.display = 'none';
    }
    
    const roleDisplay = document.getElementById('user-role-display');
    if (roleDisplay) {
        roleDisplay.innerText = "👤 " + role.toUpperCase();
    }
    
    // Luôn hiện nút đăng xuất
    const btnLogout = document.getElementById('btn-logout');
    if(btnLogout) btnLogout.style.display = 'inline-block';

    try {
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();
        globalData = data;

        // Cập nhật mảng tĩnh cũ để tương thích với các hàm search cũ
        // Chỉ ghi đè nếu Cloud thực sự có dữ liệu (để tránh xóa trắng dữ liệu cũ khi chưa đồng bộ)
        if (data.evap && data.evap.length > 0) modelDatabase = data.evap;
        if (data.cond && data.cond.length > 0) modelDatabaseCond = data.cond;
        if (data.dict && Object.keys(data.dict).length > 0) customerDictionary = data.dict;

        // Xử lý các tab động (những sheet ngoài EVAP, COND, DICT)
        renderDynamicTabs(data);

        // Khởi tạo dữ liệu filter
        if (typeof populateAllDropdowns === 'function') populateAllDropdowns();
        if (typeof performSearchEvap === 'function') performSearchEvap();
        if (typeof performSearchCond === 'function') performSearchCond();
        
        // Ẩn Loading và Hiển thị App
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('lock-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        
    } catch (err) {
        console.error("Lỗi tải dữ liệu:", err);
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('lock-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        if (typeof populateAllDropdowns === 'function') populateAllDropdowns();
        if (typeof performSearchEvap === 'function') performSearchEvap();
        if (typeof performSearchCond === 'function') performSearchCond();
    }
}

// Gọi initApp khi trang tải xong
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});


function setSearchStandardFilter(type, filterVal, btnEl) {
    if (type === 'evap') {
        searchStandardFilterEvap = filterVal;
    } else {
        searchStandardFilterCond = filterVal;
    }
    
    // Cập nhật active class trong nhóm nút
    const group = btnEl.closest('.toggle-btn-group');
    if (group) {
        group.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
        btnEl.classList.add('active');
    }
    markFilterChanged(type);
}

let debounceTimerEvap;
let debounceTimerCond;

function triggerAutoSearch(type) {
    if (type === 'evap') {
        clearTimeout(debounceTimerEvap);
        debounceTimerEvap = setTimeout(() => {
            if (typeof performSearchEvap === 'function') performSearchEvap();
        }, 300);
    } else {
        clearTimeout(debounceTimerCond);
        debounceTimerCond = setTimeout(() => {
            if (typeof performSearchCond === 'function') performSearchCond();
        }, 300);
    }
}

// Thay thế logic đổi màu nút bằng logic tự động quét (Auto-Search)
function markFilterChanged(type) {
    triggerAutoSearch(type);
}

// Gắn event listener cho tất cả các input bộ lọc
document.addEventListener('DOMContentLoaded', () => {
    // Lấy tất cả input trong grid-filter
    const allFilters = document.querySelectorAll('.grid-filter input, .grid-filter select');
    allFilters.forEach(el => {
        // Dựa vào ID để biết thuộc tab nào
        const type = el.id.includes('_c') ? 'cond' : 'evap';
        el.addEventListener('input', () => triggerAutoSearch(type));
        el.addEventListener('change', () => triggerAutoSearch(type));
    });
});

// Khởi tạo Theme
function initTheme() {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        document.getElementById('theme-toggle').innerText = '☀️ Day Mode';
    }
}
initTheme();

function toggleTheme() {
    if (document.body.getAttribute('data-theme') === 'dark') {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        document.getElementById('theme-toggle').innerText = '🌙 Night Mode';
    } else {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        document.getElementById('theme-toggle').innerText = '☀️ Day Mode';
    }
}

function switchTab(tabId, element) {
    document.querySelectorAll('.app-page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    
    document.getElementById('page-' + tabId).classList.add('active');
    
    if (element) {
        element.classList.add('active');
    } else {
        // Fallback for direct calls without element reference
        document.querySelector(`.nav-tab[onclick*="${tabId}"]`).classList.add('active');
    }
    
    // Gọi khởi tạo dữ liệu cho tab Admin nếu được chọn
    if (tabId === 'admin') {
        if (typeof initAdminData === 'function') initAdminData();
        if (typeof changeAdminDb === 'function') changeAdminDb();
    }
}

// --- TẠO BỘ LỌC TỰ ĐỘNG ---
function initMultiSelect(selectId, uniqueVals) {
    const el = document.getElementById(selectId);
    if (!el) return;
    
    // Remove old wrapper if exists
    const oldWrapper = el.previousElementSibling;
    if (oldWrapper && oldWrapper.classList.contains('custom-multi-select')) {
        oldWrapper.remove();
    }
    
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-multi-select';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'custom-multi-select-header';
    header.innerText = '-All-';
    
    // Create options container
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'custom-multi-select-options';
    
    // Populate options
    let html = `<label class="custom-multi-select-option">
        <input type="checkbox" value="ALL" checked> -All-
    </label>`;
    uniqueVals.forEach(val => {
        html += `<label class="custom-multi-select-option">
            <input type="checkbox" value="${val}"> ${val}
        </label>`;
    });
    optionsContainer.innerHTML = html;
    
    wrapper.appendChild(header);
    wrapper.appendChild(optionsContainer);
    
    // Replace select with wrapper
    el.parentNode.insertBefore(wrapper, el);
    el.style.display = 'none';
    
    // Logic for dropdown
    header.addEventListener('click', (e) => {
        e.stopPropagation();
        const isShowing = optionsContainer.classList.contains('show');
        document.querySelectorAll('.custom-multi-select-options').forEach(o => o.classList.remove('show'));
        document.querySelectorAll('.custom-multi-select-header').forEach(h => h.classList.remove('active'));
        if (!isShowing) {
            optionsContainer.classList.add('show');
            header.classList.add('active');
        }
    });
    
    // Logic for checkboxes
    const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]');
    const allCb = checkboxes[0];
    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.value === "ALL") {
                if (cb.checked) {
                    checkboxes.forEach(c => { if(c !== allCb) c.checked = false; });
                } else {
                    cb.checked = true; // Prevent unchecking All if nothing else is checked
                }
            } else {
                if (cb.checked) allCb.checked = false;
                
                // If nothing is checked, check ALL
                const anyChecked = Array.from(checkboxes).some(c => c !== allCb && c.checked);
                if (!anyChecked) allCb.checked = true;
            }
            
            // Update header text
            const checkedVals = Array.from(checkboxes).filter(c => c.checked && c.value !== "ALL").map(c => c.value);
            if (allCb.checked) {
                header.innerText = '-All-';
            } else if (checkedVals.length === 1) {
                header.innerText = checkedVals[0];
            } else {
                header.innerText = `${checkedVals.length} mục đã chọn`;
            }
            
            // Trigger filter update
            const type = selectId.includes('_c') ? 'cond' : 'evap';
            markFilterChanged(type);
        });
    });
    
    // Global click to close
    document.addEventListener('click', () => {
        optionsContainer.classList.remove('show');
        header.classList.remove('active');
    });
    optionsContainer.addEventListener('click', (e) => e.stopPropagation());
    
    // Save to element so we can get values later
    el.getMultiValues = function() {
        if (allCb.checked) return ["ALL"];
        return Array.from(checkboxes).filter(c => c.checked && c.value !== "ALL").map(c => c.value);
    };
    
    el.clearMultiValues = function() {
        checkboxes.forEach(c => c.checked = false);
        allCb.checked = true;
        header.innerText = '-All-';
    };
}

function populateAllDropdowns() {
    const extractUnique = (db, key) => [...new Set(db.map(item => item[key]))].filter(val => val).sort();
    
    // Dropdown cho Dàn Bay Hơi
    if (typeof modelDatabase !== 'undefined') {
        const evapConfigs = [
            { id: 'f_dan', key: 'loai_dan' }, 
            { id: 'f_vh', key: 'van_hanh' }, 
            { id: 'f_mc', key: 'moi_chat' }, 
            { id: 'f_ong', key: 'loai_ong' }, 
            { id: 'f_canh', key: 'loai_canh' }
        ];
        
        evapConfigs.forEach(cfg => {
            const el = document.getElementById(cfg.id);
            if (el) {
                const uniqueVals = extractUnique(modelDatabase, cfg.key);
                initMultiSelect(cfg.id, uniqueVals);
            }
        });
    }

    // Dropdown cho Dàn Ngưng Tụ
    if (typeof modelDatabaseCond !== 'undefined') {
        const condConfigs = [
            { id: 'f_dan_c', key: 'loai_dan' }, 
            { id: 'f_mc_c', key: 'moi_chat' }, 
            { id: 'f_ong_c', key: 'loai_ong' }, 
            { id: 'f_canh_c', key: 'loai_canh' }
        ];
        
        condConfigs.forEach(cfg => {
            const el = document.getElementById(cfg.id);
            if (el) {
                const uniqueVals = extractUnique(modelDatabaseCond, cfg.key);
                initMultiSelect(cfg.id, uniqueVals);
            }
        });
    }

    // Dropdown cho Mã KH (Chữ cái đầu của ID)
    const el_id_evap = document.getElementById('f_id_prefix');
    const el_id_cond = document.getElementById('f_id_prefix_c');
    
    let allIds = [];
    if (typeof modelDatabase !== 'undefined') allIds = allIds.concat(modelDatabase.map(i => i.id));
    if (typeof modelDatabaseCond !== 'undefined') allIds = allIds.concat(modelDatabaseCond.map(i => i.id));
    
    // Trích xuất các chữ cái đứng đầu
    const prefixes = allIds.map(id => {
        if (!id) return "";
        const match = id.match(/^[a-zA-Z]+/);
        return match ? match[0].toUpperCase() : "";
    }).filter(p => p !== "");
    
    const uniquePrefixes = [...new Set(prefixes)].sort();
    const formattedPrefixes = uniquePrefixes.map(p => {
        let label = "";
        if (typeof customerDictionary !== 'undefined' && customerDictionary[p]) {
            label = ` - ${customerDictionary[p]}`;
        }
        return `${p}${label}`;
    });

    if (el_id_evap) initMultiSelect('f_id_prefix', formattedPrefixes);
    if (el_id_cond) initMultiSelect('f_id_prefix_c', formattedPrefixes);
}

// --- HÀM ĐỊNH DẠNG SỐ 1 CHỮ SỐ THẬP PHÂN ---
const fmt = (val) => (val != null && val !== "") ? parseFloat(val).toFixed(1) : "-";

// --- HÀM HIỂN THỊ NHIỆT ĐỘ CÓ NOTE ---
function renderTempValue(val, note) {
    if (val == null || val === "") return "-";
    if (note && note.trim() !== "") {
        return `<span style="cursor:help; text-decoration:underline dotted var(--primary); color:var(--primary); font-weight:bold;" onmouseenter="showTempNote(event, \`${note.replace(/`/g, '\\`')}\`)" onmouseleave="document.getElementById('temp-note-popup').style.display='none'">${fmt(val)}</span>`;
    }
    return fmt(val);
}

// --- TÌM KIẾM DÀN BAY HƠI ---
function performSearchEvap() {
    if (typeof modelDatabase === 'undefined') return;
    
    let f_id_arr = document.getElementById('f_id_prefix') && document.getElementById('f_id_prefix').getMultiValues ? document.getElementById('f_id_prefix').getMultiValues() : ["ALL"];
    f_id_arr = f_id_arr.map(val => {
        if (val === "ALL") return "ALL";
        let str = val.trim().toUpperCase();
        if (str.includes(" - ")) return str.split(" - ")[0].trim();
        return str;
    });

    const f = {
        dan: document.getElementById('f_dan').getMultiValues ? document.getElementById('f_dan').getMultiValues() : ["ALL"], 
        vh: document.getElementById('f_vh').getMultiValues ? document.getElementById('f_vh').getMultiValues() : ["ALL"], 
        mc: document.getElementById('f_mc').getMultiValues ? document.getElementById('f_mc').getMultiValues() : ["ALL"], 
        ong: document.getElementById('f_ong').getMultiValues ? document.getElementById('f_ong').getMultiValues() : ["ALL"], 
        canh: document.getElementById('f_canh').getMultiValues ? document.getElementById('f_canh').getMultiValues() : ["ALL"],
        te: document.getElementById('f_te').value, 
        tr: document.getElementById('f_tr').value, 
        dt: document.getElementById('f_dt').value, 
        q_dk: document.getElementById('f_q_dk').value, 
        id_prefix: f_id_arr,
        full_id: (document.getElementById('f_full_id') ? document.getElementById('f_full_id').value : "").trim().toUpperCase(),
        model: (document.getElementById('f_model') ? document.getElementById('f_model').value : "").trim().toUpperCase(),
        s: document.getElementById('f_s').value, 
        tc: document.getElementById('f_tc').value,
        kw: parseFloat(document.getElementById('f_kw').value), 
        tol: parseFloat(document.getElementById('f_tol').value) / 100
    };

    const res = modelDatabase.filter(i => {
        if (searchStandardFilterEvap === 'standard') {
            if (i.is_standard === 'custom' || String(i.is_standard).toLowerCase() === 'false') return false;
        }
        if (searchStandardFilterEvap === 'sample') {
            if (i.is_standard === 'custom' || String(i.is_standard).toLowerCase() !== 'false') return false;
        }
        if (searchStandardFilterEvap === 'custom') {
            if (i.is_standard !== 'custom') return false;
        }
        
        let ok = (f.dan.includes("ALL")||f.dan.includes(i.loai_dan)) && 
                 (f.vh.includes("ALL")||f.vh.includes(i.van_hanh)) && 
                 (f.mc.includes("ALL")||f.mc.includes(i.moi_chat)) && 
                 (f.ong.includes("ALL")||f.ong.includes(i.loai_ong)) && 
                 (f.canh.includes("ALL")||f.canh.includes(i.loai_canh)) &&
                 (f.te===""||i.t_bayhoi==f.te) && 
                 (f.tr===""||i.t_phong==f.tr) && 
                 (f.dt===""||i.delta_t==f.dt) && 
                 (f.q_dk===""||i.dk_quat==f.q_dk) && 
                 (f.id_prefix.includes("ALL")||f.id_prefix.some(prefix => i.id && i.id.toUpperCase().includes(prefix))) &&
                 (f.full_id===""||(i.id && i.id.toUpperCase().includes(f.full_id))) &&
                 (f.model===""||(i.model && i.model.toUpperCase().includes(f.model))) &&
                 (f.s===""||i.s_tdn==f.s) && 
                 (f.tc===""||i.tieu_chuan==f.tc);
                 
        if (!isNaN(f.kw) && !isNaN(f.tol)) {
            ok = ok && (i.kw >= f.kw*(1-f.tol) && i.kw <= f.kw*(1+f.tol));
        }
        return ok;
    });


    currentEvapRes = res;
    
    // Update count and button state
    const countEl = document.getElementById('count_evap');
    if (countEl) countEl.innerText = res.length;
    const btn = document.getElementById('btn_scan_evap');
    if (btn) btn.classList.add('btn-scan-inactive');
    
    renderEvapTable();
}

function renderEvapTable() {
    const tbody = document.getElementById('result-evap'); 
    tbody.innerHTML = "";
    
    if (!currentEvapRes.length) {
        return tbody.innerHTML = `<tr><td colspan="12" class="no-data">Không tìm thấy dữ liệu.</td></tr>`;
    }
    
    currentEvapRes.forEach(i => {
        const isChecked = compareList.some(c => c.id === i.id) ? 'checked' : '';
        const isCustom = i.is_standard === 'custom';
        const isStd = !isCustom && String(i.is_standard).toLowerCase() !== 'false';
        
        let rowClass = '';
        if (isCustom) rowClass = 'custom-design-row';
        else if (!isStd) rowClass = 'non-standard-row';
        
        tbody.innerHTML += `<tr class="${rowClass}">
            <td><input type="checkbox" class="compare-cb" value="${i.id}" ${isChecked} onchange="toggleCompare('${i.id}', 'evap')"></td>
            <td class="highlight"><div class="model-container">${i.model}</div></td>
            <td class="val-success">${fmt(i.kw)}</td>
            <td>${fmt(i.s_tdn)}</td>
            <td>${fmt(i.tieu_chuan)}</td>
            <td>${fmt(i.delta_t)}</td>
            <td>${renderTempValue(i.t_bayhoi, i.note_t_bayhoi)}</td>
            <td>${renderTempValue(i.t_phong, i.note_t_phong)}</td>
            <td>${i.moi_chat||"-"}</td>
            <td>${i.van_hanh||"-"}</td>
            <td class="val-bold">${fmt(i.v_wind)}</td>
            <td class="val-id">
                <div class="id-container">
                    <span class="id-text">${i.id||"-"}</span>
                    ${(i.ghi_chu && i.ghi_chu.trim() !== '') ? `<span class="icon-info icon-note-active" onclick="showNoteModal(\`${i.ghi_chu.replace(/`/g, '\\`')}\`)" title="Xem ghi chú">i</span>` : `<span class="icon-info icon-note-inactive" title="Không có ghi chú">i</span>`}
                </div>
            </td>
        </tr>`;
    });
}

function clearFiltersEvap() {
    ['f_dan', 'f_vh', 'f_mc', 'f_ong', 'f_canh', 'f_id_prefix'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.clearMultiValues) el.clearMultiValues();
        else if (el) el.value = "ALL";
    });
    
    document.getElementById('f_te').value = "";
    document.getElementById('f_tr').value = "";
    document.getElementById('f_dt').value = "";
    document.getElementById('f_q_dk').value = "";
    if (document.getElementById('f_full_id')) document.getElementById('f_full_id').value = "";
    if (document.getElementById('f_model')) document.getElementById('f_model').value = "";
    
    document.getElementById('f_kw').value = "";
    document.getElementById('f_tol').value = "10";
    document.getElementById('f_s').value = "";
    document.getElementById('f_tc').value = "";
    
    setSearchStandardFilter('evap', 'all', document.getElementById('f_std_evap_all'));
    if (typeof performSearchEvap === 'function') performSearchEvap();
}

// --- TÌM KIẾM DÀN NGƯNG TỤ ---
function performSearchCond() {
    if (typeof modelDatabaseCond === 'undefined') {
        customAlert("Chưa có file data_01.js");
        return;
    }
    
    let f_id_arr = document.getElementById('f_id_prefix_c') && document.getElementById('f_id_prefix_c').getMultiValues ? document.getElementById('f_id_prefix_c').getMultiValues() : ["ALL"];
    f_id_arr = f_id_arr.map(val => {
        if (val === "ALL") return "ALL";
        let str = val.trim().toUpperCase();
        if (str.includes(" - ")) return str.split(" - ")[0].trim();
        return str;
    });

    const f = {
        dan: document.getElementById('f_dan_c').getMultiValues ? document.getElementById('f_dan_c').getMultiValues() : ["ALL"], 
        mc: document.getElementById('f_mc_c').getMultiValues ? document.getElementById('f_mc_c').getMultiValues() : ["ALL"], 
        ong: document.getElementById('f_ong_c').getMultiValues ? document.getElementById('f_ong_c').getMultiValues() : ["ALL"], 
        canh: document.getElementById('f_canh_c').getMultiValues ? document.getElementById('f_canh_c').getMultiValues() : ["ALL"],
        te: document.getElementById('f_te_c').value, 
        tr: document.getElementById('f_tr_c').value, 
        tc_cond: document.getElementById('f_tc_cond').value, 
        twb: document.getElementById('f_twb').value,
        id_prefix: f_id_arr,
        full_id: (document.getElementById('f_full_id_c') ? document.getElementById('f_full_id_c').value : "").trim().toUpperCase(),
        model: (document.getElementById('f_model_c') ? document.getElementById('f_model_c').value : "").trim().toUpperCase(),
        hp: document.getElementById('f_hp_c').value, 
        s: document.getElementById('f_s_c').value, 
        kw: parseFloat(document.getElementById('f_kw_c').value), 
        tol: parseFloat(document.getElementById('f_tol_c').value) / 100
    };

    const res = modelDatabaseCond.filter(i => {
        if (searchStandardFilterCond === 'standard') {
            if (i.is_standard === 'custom' || String(i.is_standard).toLowerCase() === 'false') return false;
        }
        if (searchStandardFilterCond === 'sample') {
            if (i.is_standard === 'custom' || String(i.is_standard).toLowerCase() !== 'false') return false;
        }
        if (searchStandardFilterCond === 'custom') {
            if (i.is_standard !== 'custom') return false;
        }
        
        let ok = (f.dan.includes("ALL")||f.dan.includes(i.loai_dan)) && 
                 (f.mc.includes("ALL")||f.mc.includes(i.moi_chat)) && 
                 (f.ong.includes("ALL")||f.ong.includes(i.loai_ong)) && 
                 (f.canh.includes("ALL")||f.canh.includes(i.loai_canh)) &&
                 (f.te===""||i.t_bayhoi==f.te) && 
                 (f.tr===""||i.t_phong==f.tr) && 
                 (f.tc_cond===""||i.t_ngungtu==f.tc_cond) && 
                 (f.twb===""||i.t_wb==f.twb) && 
                 (f.id_prefix.includes("ALL")||f.id_prefix.some(prefix => i.id && i.id.toUpperCase().includes(prefix))) &&
                 (f.full_id===""||(i.id && i.id.toUpperCase().includes(f.full_id))) &&
                 (f.model===""||(i.model && i.model.toUpperCase().includes(f.model))) &&
                 (f.hp===""||i.hp==f.hp) && 
                 (f.s===""||i.s_tdn==f.s);
                 
        if (!isNaN(f.kw) && !isNaN(f.tol)) {
            ok = ok && (i.kw >= f.kw*(1-f.tol) && i.kw <= f.kw*(1+f.tol));
        }
        return ok;
    });

    currentCondRes = res;
    
    // Update count and button state
    const countEl = document.getElementById('count_cond');
    if (countEl) countEl.innerText = res.length;
    const btn = document.getElementById('btn_scan_cond');
    if (btn) btn.classList.add('btn-scan-inactive');
    
    renderCondTable();
}

function renderCondTable() {
    const tbody = document.getElementById('result-cond'); 
    tbody.innerHTML = "";
    
    if (!currentCondRes.length) {
        return tbody.innerHTML = `<tr><td colspan="13" class="no-data no-data-warning">Không tìm thấy Model phù hợp.</td></tr>`;
    }
    
    currentCondRes.forEach(i => {
        const isChecked = compareList.some(c => c.id === i.id) ? 'checked' : '';
        const isCustom = i.is_standard === 'custom';
        const isStd = !isCustom && String(i.is_standard).toLowerCase() !== 'false';
        
        let rowClass = '';
        if (isCustom) rowClass = 'custom-design-row';
        else if (!isStd) rowClass = 'non-standard-row';
        
        tbody.innerHTML += `<tr class="${rowClass}">
            <td><input type="checkbox" class="compare-cb" value="${i.id}" ${isChecked} onchange="toggleCompare('${i.id}', 'cond')"></td>
            <td class="highlight"><div class="model-container">${i.model}</div></td>
            <td class="val-warning">${fmt(i.kw)}</td>
            <td class="val-bold">${fmt(i.hp)}</td>
            <td>${fmt(i.s_tdn)}</td>
            <td>${fmt(i.tieu_chuan)}</td>
            <td>${renderTempValue(i.t_bayhoi, i.note_t_bayhoi)}</td>
            <td>${renderTempValue(i.t_phong, i.note_t_phong)}</td>
            <td>${renderTempValue(i.t_ngungtu, i.note_t_ngungtu)}</td>
            <td>${renderTempValue(i.t_wb, i.note_t_wb)}</td>
            <td>${i.moi_chat||"-"}</td>
            <td class="val-bold">${fmt(i.v_wind)}</td>
            <td class="val-id">
                <div class="id-container">
                    <span class="id-text">${i.id||"-"}</span>
                    ${(i.ghi_chu && i.ghi_chu.trim() !== '') ? `<span class="icon-info icon-note-active" onclick="showNoteModal(\`${i.ghi_chu.replace(/`/g, '\\`')}\`)" title="Xem ghi chú">i</span>` : `<span class="icon-info icon-note-inactive" title="Không có ghi chú">i</span>`}
                </div>
            </td>
        </tr>`;
    });
}

function clearFiltersCond() {
    ['f_dan_c', 'f_mc_c', 'f_ong_c', 'f_canh_c', 'f_id_prefix_c'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.clearMultiValues) el.clearMultiValues();
        else if (el) el.value = "ALL";
    });
    
    document.getElementById('f_te_c').value = "";
    document.getElementById('f_tr_c').value = "";
    document.getElementById('f_tc_cond').value = "";
    document.getElementById('f_twb').value = "";
    document.getElementById('f_q_dk_c').value = "";
    if (document.getElementById('f_full_id_c')) document.getElementById('f_full_id_c').value = "";
    if (document.getElementById('f_model_c')) document.getElementById('f_model_c').value = "";
    
    document.getElementById('f_kw_c').value = "";
    document.getElementById('f_tol_c').value = "10";
    document.getElementById('f_hp_c').value = "";
    document.getElementById('f_s_c').value = "";
    
    setSearchStandardFilter('cond', 'all', document.getElementById('f_std_cond_all'));
    if (typeof performSearchCond === 'function') performSearchCond();
}

// --- MODAL GHI CHÚ ---
function showNoteModal(noteText) {
    document.getElementById('note-content').innerText = noteText || "Không có nội dung ghi chú.";
    document.getElementById('note-modal').style.display = 'block';
}

function closeNoteModal() {
    document.getElementById('note-modal').style.display = 'none';
}

// Đóng modal khi click ra ngoài vùng nội dung
window.onclick = function(event) {
    const modal = document.getElementById('note-modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
    const compareModal = document.getElementById('compare-modal');
    if (event.target === compareModal) {
        compareModal.style.display = 'none';
    }
}

// --- LOGIC SẮP XẾP BẢNG ---
function sortTable(type, col) {
    if (sortCol === col) {
        sortAsc = !sortAsc; // Đổi chiều
    } else {
        sortCol = col;
        sortAsc = true;
    }

    const arr = type === 'evap' ? currentEvapRes : currentCondRes;
    
    arr.sort((a, b) => {
        let valA = a[col];
        let valB = b[col];
        
        // Convert to numbers if possible
        if (!isNaN(parseFloat(valA)) && isFinite(valA)) valA = parseFloat(valA);
        if (!isNaN(parseFloat(valB)) && isFinite(valB)) valB = parseFloat(valB);
        
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
    });

    if (type === 'evap') renderEvapTable();
    else renderCondTable();
}

// --- LOGIC SO SÁNH THIẾT BỊ ---
function toggleCompare(id, type) {
    const cb = document.querySelector(`input[value="${id}"]`);
    const isChecked = cb ? cb.checked : false;
    
    if (isChecked) {
        if (compareList.length >= 4) {
            customAlert("Chỉ so sánh tối đa 4 thiết bị cùng lúc!");
            if(cb) cb.checked = false;
            return;
        }
        const db = type === 'evap' ? modelDatabase : modelDatabaseCond;
        const item = db.find(i => i.id === id);
        if (item) compareList.push(item);
    } else {
        compareList = compareList.filter(i => i.id !== id);
    }
    
    updateCompareButton();
}

function updateCompareButton() {
    const btn = document.getElementById('compare-btn-float');
    if (compareList.length > 0) {
        btn.style.display = 'block';
        btn.innerHTML = `⚖️ SO SÁNH (${compareList.length})`;
    } else {
        btn.style.display = 'none';
    }
}

function clearCompare() {
    compareList = [];
    document.querySelectorAll('.compare-cb').forEach(cb => cb.checked = false);
    updateCompareButton();
    closeCompareModal();
}

function showCompareModal() {
    const content = document.getElementById('compare-content');
    if (!compareList.length) return;
    
    // Get all unique keys from selected items
    let allKeys = new Set();
    compareList.forEach(item => Object.keys(item).forEach(k => allKeys.add(k)));
    allKeys = Array.from(allKeys).filter(k => !['ghi_chu', 'id'].includes(k)); // Hide note and ID for now
    
    // Custom label map
    const keyLabels = {
        'model': 'Mã Model', 'loai_dan': 'Loại Dàn', 'kw': 'Công suất (kW)', 'hp': 'CS Máy (HP)',
        's_tdn': 'DTTĐN (m2)', 'tieu_chuan': 'Tiêu chuẩn (m2/kW)', 't_bayhoi': 'Tmc (°C)', 
        't_phong': 'Tr (°C)', 'delta_t': 'Delta T (K)', 't_ngungtu': 'Tc (°C)', 't_wb': 'Twb (°C)',
        'moi_chat': 'Môi chất', 'van_hanh': 'Vận hành', 'loai_ong': 'Loại ống', 'loai_canh': 'Lá tản nhiệt',
        'v_wind': 'Tốc độ gió (m/s)', 'dk_quat': 'Đường kính quạt', 'sl_quat': 'Số lượng quạt'
    };

    let tableHtml = `<table class="compare-table"><thead><tr><th style="text-align: center;">MÃ ID</th>`;
    compareList.forEach(i => {
        tableHtml += `<th style="text-align: center; color: var(--primary); font-size: 1.1rem;">${i.id || '-'}</th>`;
    });
    tableHtml += `</tr></thead><tbody>`;

    allKeys.forEach(k => {
        tableHtml += `<tr><td style="font-weight: bold;">${keyLabels[k] || k}</td>`;
        compareList.forEach(i => {
            const val = i[k];
            let valHTML = val != null ? val : '-';
            if (['t_bayhoi', 't_phong', 't_ngungtu', 't_wb'].includes(k)) {
                valHTML = renderTempValue(val, i['note_' + k]);
            }
            tableHtml += `<td class="${k === 'kw' || k === 'hp' ? 'val-bold' : ''}">${valHTML}</td>`;
        });
        tableHtml += `</tr>`;
    });

    tableHtml += `</tbody></table>`;
    content.innerHTML = tableHtml;
    document.getElementById('compare-modal').style.display = 'block';
}

function closeCompareModal() {
    document.getElementById('compare-modal').style.display = 'none';
}

// --- DYNAMIC TABS LOGIC ---
function renderDynamicTabs(data) {
    const navTabs = document.querySelector('.nav-tabs');
    const appContainer = document.querySelector('.app-container');
    const knownKeys = ['evap', 'cond', 'dict', 'users', 'eva'];
    
    Object.keys(data).forEach(key => {
        if (!knownKeys.includes(key)) {
            const tabId = key.toLowerCase();
            const tabName = key.toUpperCase();
            
            // Nếu chưa có nút tab, thêm vào
            if (!document.querySelector(`.nav-tab[onclick*="switchTab('${tabId}'"]`)) {
                const btn = document.createElement('button');
                btn.className = 'nav-tab';
                btn.onclick = function() { switchTab(tabId, this); };
                btn.innerText = tabName;
                
                // Chèn trước nút Admin
                const adminBtn = document.getElementById('admin-tab-btn');
                navTabs.insertBefore(btn, adminBtn);
            }
            
            // Nếu chưa có page, thêm vào
            if (!document.getElementById(`page-${tabId}`)) {
                const pageHtml = `
                <div id="page-${tabId}" class="app-page">
                    <div class="card-panel">
                        <div class="section-title">BỘ LỌC THÔNG MINH - ${tabName}</div>
                        <div class="grid-filter" style="grid-template-columns: 1fr auto;">
                            <div class="input-group">
                                <input type="text" id="f_smart_${tabId}" placeholder="Nhập bất kỳ từ khóa nào để tìm kiếm (Mã ID, Công suất, Loại...)" style="border-color: var(--primary); font-size: 1rem; padding: 10px;">
                            </div>
                            <button class="btn-search" style="margin-top: 0; padding: 10px 20px;" onclick="performSmartSearch('${tabId}')">🔍 QUÉT DỮ LIỆU</button>
                        </div>
                        <div class="result-counter-evap" style="margin-top: 10px; text-align: right;">
                            Kết quả: <span id="count_${tabId}">0</span>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="result-table">
                            <thead id="head_${tabId}"></thead>
                            <tbody id="result_${tabId}">
                                <tr><td colspan="10" class="no-data">Bấm "Quét Dữ Liệu" để bắt đầu...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                `;
                
                // Tạo div container bọc nội dung và append
                const div = document.createElement('div');
                div.innerHTML = pageHtml;
                // Chèn trước page-admin
                const adminPage = document.getElementById('page-admin');
                appContainer.insertBefore(div.firstElementChild, adminPage);
                
                // Vẽ header cho bảng
                renderDynamicTableHead(tabId, data[key]);
            }
        }
    });
}

function renderDynamicTableHead(tabId, tabData) {
    if (!tabData || tabData.length === 0) return;
    const keys = Object.keys(tabData[0]);
    const thead = document.getElementById(`head_${tabId}`);
    let html = '<tr>';
    keys.forEach(k => {
        html += `<th>${k.toUpperCase()}</th>`;
    });
    html += '</tr>';
    thead.innerHTML = html;
}

function performSmartSearch(tabId) {
    const term = document.getElementById(`f_smart_${tabId}`).value.toLowerCase().trim();
    const tabData = globalData[tabId] || [];
    
    let res = tabData;
    if (term !== "") {
        res = tabData.filter(item => {
            return Object.values(item).some(val => 
                val !== null && val !== undefined && val.toString().toLowerCase().includes(term)
            );
        });
    }
    
    document.getElementById(`count_${tabId}`).innerText = res.length;
    
    const tbody = document.getElementById(`result_${tabId}`);
    tbody.innerHTML = '';
    
    if (res.length === 0) {
        const cols = Object.keys(tabData[0] || {}).length || 10;
        tbody.innerHTML = `<tr><td colspan="${cols}" class="no-data">Không tìm thấy dữ liệu phù hợp.</td></tr>`;
        return;
    }
    
    const keys = Object.keys(res[0]);
    res.forEach(item => {
        let tr = `<tr>`;
        keys.forEach(k => {
            tr += `<td>${item[k] !== null ? item[k] : ''}</td>`;
        });
        tr += `</tr>`;
        tbody.innerHTML += tr;
    });
}
