/**
 * zayvora-auth.js
 * Handles Sovereign Hardware Authorization via WebNFC or local input fallback.
 * Security: Sessions stored in sessionStorage (NOT localStorage).
 * UI Feedback: Secure session indicator, attempt warnings, expiry notice.
 */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    let expiryTimer = null;

    function initAuth() {
        // Security: Use sessionStorage, not localStorage
        const session = sessionStorage.getItem('zv_passport');
        if (session) {
            try {
                const auth = JSON.parse(session);
                const now = Math.floor(Date.now() / 1000);
                if (auth.jwt && auth.expiresAt && auth.expiresAt > now) {
                    unlockDashboard(auth);
                    startExpiryWatch(auth.expiresAt);
                } else {
                    sessionStorage.removeItem('zv_passport');
                    showAuthOverlay();
                }
            } catch (_e) {
                sessionStorage.removeItem('zv_passport');
                showAuthOverlay();
            }
        } else {
            showAuthOverlay();
        }

        bindAuthEvents();
        initWebNFC();
        injectSecurityHUD();
    }

    function showAuthOverlay() {
        const overlay = $('#zv-auth-overlay');
        if (overlay) {overlay.classList.add('visible');}
    }

    function hideAuthOverlay() {
        const overlay = $('#zv-auth-overlay');
        if (overlay) {overlay.classList.remove('visible');}
    }

    function unlockDashboard(auth) {
        window.zv_auth = auth;
        hideAuthOverlay();
        document.body.classList.add('authorized');
        updateSecurityIndicator('active');
        console.log(`[AUTH] Welcome, ${auth.owner}. Hardware Identity Verified.`);
    }

    async function verifyPassport(nfcTagId, pin) {
        const btn = $('#zv-login-btn');
        const status = $('#zv-login-status');
        
        if (btn) {btn.disabled = true;}
        if (status) {
            status.textContent = 'Verifying Hardware Integrity...';
            status.className = 'zv-auth-status info';
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            // Sovereign Architecture: Route auth logic to local gateway if hosted on static Cloudflare edge
            const isLive = window.location.hostname === 'daxini.xyz' || window.location.hostname === 'www.daxini.xyz' || window.location.hostname === 'daxini.space';
            const authEndpoint = isLive 
                ? `http://127.0.0.1:3000/api/passport/verify?nfc_tag_id=${encodeURIComponent(nfcTagId)}&pin=${encodeURIComponent(pin)}`
                : `/api/passport/verify?nfc_tag_id=${encodeURIComponent(nfcTagId)}&pin=${encodeURIComponent(pin)}`;
                
            const res = await fetch(authEndpoint, { signal: controller.signal });
            clearTimeout(timeoutId);
            const data = await res.json();

            if (res.ok) {
                // Parse JWT payload for expiration
                const payloadBase64 = data.jwt.split('.')[1];
                const decodedPayload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
                
                const ghToken = ($('#zv-gh-token') || {}).value || '';
                // Security: sessionStorage, not localStorage
                sessionStorage.setItem('zv_passport', JSON.stringify({ 
                    uid: data.uid, 
                    owner: data.owner, 
                    passport_id: data.passport_id,
                    jwt: data.jwt,
                    expiresAt: decodedPayload.exp,
                    ghToken: ghToken.trim()
                }));
                unlockDashboard({ uid: data.uid, owner: data.owner, jwt: data.jwt, ghToken: ghToken.trim() });
                startExpiryWatch(decodedPayload.exp);
            } else if (res.status === 429) {
                // Rate limited / locked out
                const retryMsg = data.retry_after ? ` Retry in ${data.retry_after}s.` : '';
                const attemptsMsg = data.failed_attempts ? ` (${data.failed_attempts} failed attempts)` : '';
                throw new Error((data.error || 'Too many attempts.') + retryMsg + attemptsMsg);
            } else {
                throw new Error(data.error || 'Identity Rejected');
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                err.message = 'Authorization Timeout. Backend node unreachable.';
            }
            if (status) {
                status.textContent = err.message;
                status.className = 'zv-auth-status error';
            }
            if (btn) {btn.disabled = false;}
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
                if (nfcId && pin) {verifyPassport(nfcId, pin);}
            });

            // FIX 2: Keyboard Auto-Scroll for Mobile
            const inputs = form.querySelectorAll('input');
            inputs.forEach(input => {
                input.addEventListener('focus', () => {
                    setTimeout(() => {
                        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 350); // Delay for keyboard expansion
                });
            });

            // Show token status indicator after login
            const ghField = $('#zv-gh-token');
            if (ghField) {
                ghField.addEventListener('input', () => {
                    const status = $('#zv-login-status');
                    if (ghField.value.trim().startsWith('ghp_') || ghField.value.trim().startsWith('github_pat_')) {
                        if (status) { status.textContent = '✓ External GitHub identity detected'; status.className = 'zv-auth-status info'; }
                    }
                });
            }
        }

        const logoutBtn = $('#zv-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                sessionStorage.removeItem('zv_passport');
                if (expiryTimer) {clearInterval(expiryTimer);}
                updateSecurityIndicator('inactive');
                location.reload();
            });
        }
    }

    // ── Security HUD ─────────────────────────────────────
    function injectSecurityHUD() {
        if ($('#zv-security-hud')) {return;}
        const hud = document.createElement('div');
        hud.id = 'zv-security-hud';
        hud.innerHTML = `<span id="zv-sec-dot"></span><span id="zv-sec-label">Session Inactive</span>`;
        hud.style.cssText = 'position:fixed;bottom:16px;left:16px;z-index:9999;display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;background:rgba(11,12,15,0.85);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.06);font-size:0.68rem;font-family:"JetBrains Mono",monospace;color:rgba(255,255,255,0.5);pointer-events:none;';
        const dot = hud.querySelector('#zv-sec-dot');
        dot.style.cssText = 'width:6px;height:6px;border-radius:50%;background:#555;';
        document.body.appendChild(hud);
    }

    function updateSecurityIndicator(state) {
        const dot = $('#zv-sec-dot');
        const label = $('#zv-sec-label');
        if (!dot || !label) {return;}
        if (state === 'active') {
            dot.style.background = '#34d399';
            dot.style.boxShadow = '0 0 6px #34d399';
            label.textContent = 'Secure session active';
            label.style.color = '#34d399';
        } else if (state === 'expiring') {
            dot.style.background = '#fbbf24';
            dot.style.boxShadow = '0 0 6px #fbbf24';
            label.textContent = 'Session expiring soon';
            label.style.color = '#fbbf24';
        } else {
            dot.style.background = '#555';
            dot.style.boxShadow = 'none';
            label.textContent = 'Session inactive';
            label.style.color = 'rgba(255,255,255,0.5)';
        }
    }

    function startExpiryWatch(expiresAtUnix) {
        if (expiryTimer) {clearInterval(expiryTimer);}
        expiryTimer = setInterval(() => {
            const now = Math.floor(Date.now() / 1000);
            const remaining = expiresAtUnix - now;
            if (remaining <= 0) {
                clearInterval(expiryTimer);
                sessionStorage.removeItem('zv_passport');
                updateSecurityIndicator('inactive');
                showAuthOverlay();
                const status = $('#zv-login-status');
                if (status) { status.textContent = 'Session expired. Please re-authenticate.'; status.className = 'zv-auth-status error'; }
            } else if (remaining < 300) {
                updateSecurityIndicator('expiring');
            }
        }, 15000);
    }

    document.addEventListener('DOMContentLoaded', initAuth);
})();
