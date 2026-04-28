// --- HỆ THỐNG DRM ---
const ROTATING_PINS = [
    { hint: "TL", code: "1997" }, 
    { hint: "SN", code: "1612" }, 
    { hint: "NS", code: "1989" }, 
    { hint: "VSN", code: "0611" }
];

function initSecuritySystem() {
    let startDate = localStorage.getItem('gtspec_start_date');
    let isLockedOut = localStorage.getItem('gtspec_locked_out') || 'false';
    let pinIndex = localStorage.getItem('gtspec_pin_index') || 0;
    
    if (!startDate) { 
        startDate = Date.now(); 
        localStorage.setItem('gtspec_start_date', startDate); 
    }
    
    // Kiểm tra hết hạn 30 ngày
    if (Date.now() - parseInt(startDate) > 30 * 24 * 60 * 60 * 1000) {
        isLockedOut = 'true';
    }
    
    if (isLockedOut === 'true') {
        document.getElementById('ui-regular-pin').style.display = 'none';
        document.getElementById('ui-master-key').style.display = 'block';
        document.querySelector('.lock-box').classList.add('master-mode');
    } else {
        document.getElementById('pin-hint-display').innerText = ROTATING_PINS[parseInt(pinIndex)].hint + " - ****";
    }
}

function checkRegularPIN() {
    const enteredPin = document.getElementById('pin-input').value;
    const currentIndex = parseInt(localStorage.getItem('gtspec_pin_index') || 0);
    const correctPin = ROTATING_PINS[currentIndex].code;

    if (enteredPin === correctPin) {
        document.getElementById('lock-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        if (typeof populateAllDropdowns === 'function') {
            populateAllDropdowns();
        }
    } else { 
        document.getElementById('pin-error').style.display = 'block'; 
        setTimeout(() => {
            document.getElementById('pin-error').style.display = 'none';
        }, 3000);
    }
}

function checkMasterKey() {
    const enteredKey = document.getElementById('master-input').value;

    if (enteredKey === "161289") {
        // Reset 30 ngày và đổi PIN
        localStorage.setItem('gtspec_start_date', Date.now());
        localStorage.setItem('gtspec_locked_out', 'false');
        localStorage.setItem('gtspec_pin_index', (parseInt(localStorage.getItem('gtspec_pin_index') || 0) + 1) % 4);
        window.location.reload();
    } else if (enteredKey === "061189") {
        // Reset 30 ngày, GIỮ NGUYÊN PIN
        localStorage.setItem('gtspec_start_date', Date.now());
        localStorage.setItem('gtspec_locked_out', 'false');
        // Không thay đổi pin index
        window.location.reload();
    } else {
        document.getElementById('master-error').style.display = 'block';
        setTimeout(() => {
            document.getElementById('master-error').style.display = 'none';
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const pinInput = document.getElementById('pin-input');
    const masterInput = document.getElementById('master-input');

    if (pinInput) {
        pinInput.addEventListener('keypress', e => { 
            if(e.key === 'Enter') checkRegularPIN(); 
        });
    }

    if (masterInput) {
        masterInput.addEventListener('keypress', e => { 
            if(e.key === 'Enter') checkMasterKey(); 
        });
    }

    initSecuritySystem();
});
