// --- UI LOGIC ---
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
}

// --- HÀM ĐỊNH DẠNG SỐ 1 CHỮ SỐ THẬP PHÂN ---
const fmt = (val) => (val != null && val !== "") ? parseFloat(val).toFixed(1) : "-";

// --- TÌM KIẾM DÀN BAY HƠI ---
function performSearchEvap() {
    if (typeof modelDatabase === 'undefined') return;
    
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
                 (f.s===""||i.s_tdn==f.s) && 
                 (f.tc===""||i.tieu_chuan==f.tc);
                 
        if (!isNaN(f.kw) && !isNaN(f.tol)) {
            ok = ok && (i.kw >= f.kw*(1-f.tol) && i.kw <= f.kw*(1+f.tol));
        }
        return ok;
    });

    const tbody = document.getElementById('result-evap'); 
    tbody.innerHTML = "";
    
    if (!res.length) {
        return tbody.innerHTML = `<tr><td colspan="11" class="no-data">Không tìm thấy dữ liệu.</td></tr>`;
    }
    
    res.forEach(i => {
        tbody.innerHTML += `<tr>
            <td class="highlight">${i.model}</td>
            <td class="val-success">${fmt(i.kw)}</td>
            <td>${fmt(i.s_tdn)}</td>
            <td>${fmt(i.tieu_chuan)}</td>
            <td>${fmt(i.delta_t)}</td>
            <td>${fmt(i.t_bayhoi)}</td>
            <td>${fmt(i.t_phong)}</td>
            <td>${i.moi_chat||"-"}</td>
            <td>${i.van_hanh||"-"}</td>
            <td class="val-bold">${fmt(i.v_wind)}</td>
            <td class="val-id">${i.id||"-"}</td>
        </tr>`;
    });
}

// --- TÌM KIẾM DÀN NGƯNG TỤ ---
function performSearchCond() {
    if (typeof modelDatabaseCond === 'undefined') {
        alert("Chưa có file data_01.js");
        return;
    }
    
    const f = {
        dan: document.getElementById('f_dan_c').value, 
        mc: document.getElementById('f_mc_c').value, 
        ong: document.getElementById('f_ong_c').value, 
        canh: document.getElementById('f_canh_c').value,
        te: document.getElementById('f_te_c').value, 
        tr: document.getElementById('f_tr_c').value, 
        tc_cond: document.getElementById('f_tc_cond').value, 
        twb: document.getElementById('f_twb').value,
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
                 (f.hp===""||i.hp==f.hp) && 
                 (f.s===""||i.s_tdn==f.s);
                 
        if (!isNaN(f.kw) && !isNaN(f.tol)) {
            ok = ok && (i.kw >= f.kw*(1-f.tol) && i.kw <= f.kw*(1+f.tol));
        }
        return ok;
    });

    const tbody = document.getElementById('result-cond'); 
    tbody.innerHTML = "";
    
    if (!res.length) {
        return tbody.innerHTML = `<tr><td colspan="12" class="no-data no-data-warning">Không tìm thấy Model phù hợp.</td></tr>`;
    }
    
    res.forEach(i => {
        tbody.innerHTML += `<tr>
            <td class="highlight">${i.model}</td>
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
            <td class="val-id">${i.id||"-"}</td>
        </tr>`;
    });
}
