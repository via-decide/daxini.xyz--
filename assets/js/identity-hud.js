/**
 * identity-hud.js — Production Identity Synchronization.
 * Synchronizes NFC Passport and SkillHex data with the workspace UI.
 */

async function bootstrapIdentity() {
    const token = localStorage.getItem('sovereign_token');
    const HUD = document.getElementById('identity-hud');
    
    if (!HUD) {return;}

    if (!token) {
        HUD.innerHTML = `
            <div class="identity-bar">
                <span>IDENTITY: <b>ANONYMOUS</b></span>
                <span>SKILLHEX: <b>--</b></span>
                <span>MARS: <b>PENDING</b></span>
            </div>
        `;
        return;
    }

    try {
        const response = await fetch('/api/passport/session', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const profile = await response.json();
            HUD.innerHTML = `
                <div class="identity-bar">
                    <span>IDENTITY: <b>${profile.passport_id}</b></span>
                    <span>SKILLHEX: <b>${Math.round(profile.logic_score)}</b></span>
                    <span>MARS: <b>${profile.missions_completed} MISSIONS</b></span>
                </div>
            `;
        } else {
            HUD.innerHTML = `
                <div class="identity-bar">
                    <span style="color: #ff3366;">SESSION EXPIRED</span>
                </div>
            `;
        }
    } catch (err) {
        console.error('[HUD] Synchronization failed:', err);
    }
}

// Initial sync on load
document.addEventListener('DOMContentLoaded', bootstrapIdentity);

// Export for manual refreshes
window.refreshIdentityHUD = bootstrapIdentity;
