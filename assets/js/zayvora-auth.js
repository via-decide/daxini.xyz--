/**
 * zayvora-auth.js
 * Handles Sovereign Passport Authorization for the 3-panel dashboard.
 */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    function initAuth() {
        const session = localStorage.getItem('zv_passport');
        if (session) {
            try {
                const auth = JSON.parse(session);
                unlockDashboard(auth);
            } catch (e) {
                showAuthOverlay();
            }
        } else {
            showAuthOverlay();
        }

        bindAuthEvents();
    }

    function showAuthOverlay() {
        const overlay = $('#zv-auth-overlay');
        if (overlay) overlay.classList.add('visible');
    }

    function hideAuthOverlay() {
        const overlay = $('#zv-auth-overlay');
        if (overlay) overlay.classList.remove('visible');
    }

    function unlockDashboard(auth) {
        window.zv_auth = auth;
        hideAuthOverlay();
        document.body.classList.add('authorized');
        console.log(`[AUTH] Welcome, ${auth.owner}. Access granted.`);
    }

    async function verifyPassport(uid, serial) {
        const btn = $('#zv-login-btn');
        const status = $('#zv-login-status');
        
        if (btn) btn.disabled = true;
        if (status) {
            status.textContent = 'Verifying with Sovereign Node...';
            status.className = 'zv-auth-status info';
        }

        try {
            const res = await fetch(`/api/passport/verify?uid=${encodeURIComponent(uid)}&serial=${encodeURIComponent(serial)}`);
            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('zv_passport', JSON.stringify({ uid, serial, owner: data.owner, passport_id: data.passport_id }));
                unlockDashboard({ uid, serial, owner: data.owner });
            } else {
                throw new Error(data.error || 'Verification Failed');
            }
        } catch (err) {
            if (status) {
                status.textContent = err.message;
                status.className = 'zv-auth-status error';
            }
            if (btn) btn.disabled = false;
        }
    }

    function bindAuthEvents() {
        const form = $('#zv-auth-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const uid = $('#zv-uid-input').value.trim();
                const serial = $('#zv-serial-input').value.trim();
                if (uid && serial) verifyPassport(uid, serial);
            });
        }

        const logoutBtn = $('#zv-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('zv_passport');
                location.reload();
            });
        }
    }

    document.addEventListener('DOMContentLoaded', initAuth);
})();
