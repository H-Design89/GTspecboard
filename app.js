// --- UI LOGIC ---
let compareList = [];
let currentEvapRes = [];
let currentCondRes = [];
let sortCol = '';
let sortAsc = true;

// Khởi tạo Theme
function initTheme() {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        document.getElementById('theme-toggle').innerText = '☀️';
    }
}
initTheme();

function toggleTheme() {
    if (document.body.getAttribute('data-theme') === 'dark') {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        document.getElementById('theme-toggle').innerText = '🌙';
    } else {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        document.getElementById('theme-toggle').innerText = '☀️';
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
}

// --- TẠO BỘ LỌC TỰ ĐỘNG ---
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
                uniqueVals.forEach(val => el.innerHTML += `<option value="${val}">${val}</option>`);
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
                uniqueVals.forEach(val => el.innerHTML += `<option value="${val}">${val}</option>`);
            }
        });
    }

    // Dropdown cho Mã KH (Chữ cái đầu của ID)
    const dlIdPrefix = document.getElementById('dl_id_prefix');
    if (dlIdPrefix) {
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
        uniquePrefixes.forEach(p => {
            let label = "";
            if (typeof customerDictionary !== 'undefined' && customerDictionary[p]) {
                label = ` - ${customerDictionary[p]}`;
            }
            dlIdPrefix.innerHTML += `<option value="${p}${label}">`;
        });
    }
}

// --- HÀM ĐỊNH DẠNG SỐ 1 CHỮ SỐ THẬP PHÂN ---
const fmt = (val) => (val != null && val !== "") ? parseFloat(val).toFixed(1) : "-";

// --- TÌM KIẾM DÀN BAY HƠI ---
function performSearchEvap() {
    if (typeof modelDatabase === 'undefined') return;
    
    let f_id = (document.getElementById('f_id_prefix') ? document.getElementById('f_id_prefix').value : "").trim().toUpperCase();
    if (f_id.includes(" - ")) f_id = f_id.split(" - ")[0].trim();

    const f = {
        dan: document.getElementById('f_dan').value, 
        vh: document.getElementById('f_vh').value, 
        mc: document.getElementById('f_mc').value, 
        ong: document.getElementById('f_ong').value, 
        canh: document.getElementById('f_canh').value,
        te: document.getElementById('f_te').value, 
        tr: document.getElementById('f_tr').value, 
        dt: document.getElementById('f_dt').value, 
        q_dk: document.getElementById('f_q_dk').value, 
        id_prefix: f_id,
        s: document.getElementById('f_s').value, 
        tc: document.getElementById('f_tc').value,
        kw: parseFloat(document.getElementById('f_kw').value), 
        tol: parseFloat(document.getElementById('f_tol').value) / 100
    };

    const res = modelDatabase.filter(i => {
        let ok = (f.dan==="ALL"||i.loai_dan===f.dan) && 
                 (f.vh==="ALL"||i.van_hanh===f.vh) && 
                 (f.mc==="ALL"||i.moi_chat===f.mc) && 
                 (f.ong==="ALL"||i.loai_ong===f.ong) && 
                 (f.canh==="ALL"||i.loai_canh===f.canh) &&
                 (f.te===""||i.t_bayhoi==f.te) && 
                 (f.tr===""||i.t_phong==f.tr) && 
                 (f.dt===""||i.delta_t==f.dt) && 
                 (f.q_dk===""||i.dk_quat==f.q_dk) && 
                 (f.id_prefix===""||(i.id && i.id.toUpperCase().includes(f.id_prefix))) &&
                 (f.s===""||i.s_tdn==f.s) && 
                 (f.tc===""||i.tieu_chuan==f.tc);
                 
        if (!isNaN(f.kw) && !isNaN(f.tol)) {
            ok = ok && (i.kw >= f.kw*(1-f.tol) && i.kw <= f.kw*(1+f.tol));
        }
        return ok;
    });


    currentEvapRes = res;
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
        tbody.innerHTML += `<tr>
            <td><input type="checkbox" class="compare-cb" value="${i.id}" ${isChecked} onchange="toggleCompare('${i.id}', 'evap')"></td>
            <td class="highlight"><div class="model-container">${i.model}</div></td>
            <td class="val-success">${fmt(i.kw)}</td>
            <td>${fmt(i.s_tdn)}</td>
            <td>${fmt(i.tieu_chuan)}</td>
            <td>${fmt(i.delta_t)}</td>
            <td>${fmt(i.t_bayhoi)}</td>
            <td>${fmt(i.t_phong)}</td>
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

// --- TÌM KIẾM DÀN NGƯNG TỤ ---
function performSearchCond() {
    if (typeof modelDatabaseCond === 'undefined') {
        alert("Chưa có file data_01.js");
        return;
    }
    
    let f_id = (document.getElementById('f_id_prefix_c') ? document.getElementById('f_id_prefix_c').value : "").trim().toUpperCase();
    if (f_id.includes(" - ")) f_id = f_id.split(" - ")[0].trim();

    const f = {
        dan: document.getElementById('f_dan_c').value, 
        mc: document.getElementById('f_mc_c').value, 
        ong: document.getElementById('f_ong_c').value, 
        canh: document.getElementById('f_canh_c').value,
        te: document.getElementById('f_te_c').value, 
        tr: document.getElementById('f_tr_c').value, 
        tc_cond: document.getElementById('f_tc_cond').value, 
        twb: document.getElementById('f_twb').value,
        id_prefix: f_id,
        hp: document.getElementById('f_hp_c').value, 
        s: document.getElementById('f_s_c').value, 
        kw: parseFloat(document.getElementById('f_kw_c').value), 
        tol: parseFloat(document.getElementById('f_tol_c').value) / 100
    };

    const res = modelDatabaseCond.filter(i => {
        let ok = (f.dan==="ALL"||i.loai_dan===f.dan) && 
                 (f.mc==="ALL"||i.moi_chat===f.mc) && 
                 (f.ong==="ALL"||i.loai_ong===f.ong) && 
                 (f.canh==="ALL"||i.loai_canh===f.canh) &&
                 (f.te===""||i.t_bayhoi==f.te) && 
                 (f.tr===""||i.t_phong==f.tr) && 
                 (f.tc_cond===""||i.t_ngungtu==f.tc_cond) && 
                 (f.twb===""||i.t_wb==f.twb) && 
                 (f.id_prefix===""||(i.id && i.id.toUpperCase().includes(f.id_prefix))) &&
                 (f.hp===""||i.hp==f.hp) && 
                 (f.s===""||i.s_tdn==f.s);
                 
        if (!isNaN(f.kw) && !isNaN(f.tol)) {
            ok = ok && (i.kw >= f.kw*(1-f.tol) && i.kw <= f.kw*(1+f.tol));
        }
        return ok;
    });

    currentCondRes = res;
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
        tbody.innerHTML += `<tr>
            <td><input type="checkbox" class="compare-cb" value="${i.id}" ${isChecked} onchange="toggleCompare('${i.id}', 'cond')"></td>
            <td class="highlight"><div class="model-container">${i.model}</div></td>
            <td class="val-warning">${fmt(i.kw)}</td>
            <td class="val-bold">${fmt(i.hp)}</td>
            <td>${fmt(i.s_tdn)}</td>
            <td>${fmt(i.tieu_chuan)}</td>
            <td>${fmt(i.t_bayhoi)}</td>
            <td>${fmt(i.t_phong)}</td>
            <td>${fmt(i.t_ngungtu)}</td>
            <td>${fmt(i.t_wb)}</td>
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
            alert("Chỉ so sánh tối đa 4 thiết bị cùng lúc!");
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
        's_tdn': 'DTTĐN (m2)', 'tieu_chuan': 'Tiêu chuẩn (m2/kW)', 't_bayhoi': 'Te (°C)', 
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
            tableHtml += `<td class="${k === 'kw' || k === 'hp' ? 'val-bold' : ''}">${val != null ? val : '-'}</td>`;
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
