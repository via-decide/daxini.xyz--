/**
 * zayvora-auth.js
 * Handles Sovereign Hardware Authorization via WebNFC or local input fallback.
 */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    function initAuth() {
        const session = localStorage.getItem('zv_passport');
        if (session) {
            try {
                const auth = JSON.parse(session);
                const now = Math.floor(Date.now() / 1000);
                if (auth.jwt && auth.expiresAt && auth.expiresAt > now) {
                    unlockDashboard(auth);
                } else {
                    throw new Error('Session Expired');
                }
            } catch (e) {
                showAuthOverlay();
            }
        } else {
            showAuthOverlay();
        }

        bindAuthEvents();
        initWebNFC();
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
        console.log(`[AUTH] Welcome, ${auth.owner}. Hardware Identity Verified.`);
    }

    async function verifyPassport(nfcTagId, pin) {
        const btn = $('#zv-login-btn');
        const status = $('#zv-login-status');
        
        if (btn) btn.disabled = true;
        if (status) {
            status.textContent = 'Verifying Hardware Integrity...';
            status.className = 'zv-auth-status info';
        }

        try {
            const res = await fetch(`/api/passport/verify?nfc_tag_id=${encodeURIComponent(nfcTagId)}&pin=${encodeURIComponent(pin)}`);
            const data = await res.json();

            if (res.ok) {
                // Parse JWT payload for expiration
                const payloadBase64 = data.jwt.split('.')[1];
                const decodedPayload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
                
                localStorage.setItem('zv_passport', JSON.stringify({ 
                    uid: data.uid, 
                    owner: data.owner, 
                    passport_id: data.passport_id,
                    jwt: data.jwt,
                    expiresAt: decodedPayload.exp
                }));
                unlockDashboard({ uid: data.uid, owner: data.owner, jwt: data.jwt });
            } else {
                throw new Error(data.error || 'Identity Rejected');
            }
        } catch (err) {
            if (status) {
                status.textContent = err.message;
                status.className = 'zv-auth-status error';
            }
            if (btn) btn.disabled = false;
        }
    }

    async function initWebNFC() {
        if ('NDEFReader' in window) {
            try {
                const ndef = new NDEFReader();
                await ndef.scan();
                ndef.addEventListener("reading", ({ serialNumber }) => {
                    const tagInput = $('#zv-nfc-input');
                    if (tagInput) {
                        tagInput.value = serialNumber.replace(/:/g, '').toUpperCase();
                        const status = $('#zv-login-status');
                        if (status) {
                            status.textContent = 'Hardware Token Detected. Enter PIN.';
                            status.className = 'zv-auth-status info';
                        }
                    }
                });
            } catch (error) {
                console.warn("[SECURITY] WebNFC scan failed or not permitted:", error);
            }
        } else {
            console.log("[SECURITY] WebNFC strictly blocked on this device (iOS/Desktop). Manual entry active.");
        }
    }

    function bindAuthEvents() {
        const form = $('#zv-auth-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const nfcId = $('#zv-nfc-input').value.trim();
                const pin = $('#zv-pin-input').value.trim();
                if (nfcId && pin) verifyPassport(nfcId, pin);
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
