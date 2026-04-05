/**
 * ui/utils/mobileDetect.js
 *
 * Mobile viewport detection utility for Zayvora workspace.
 * Activates mobile layout mode when viewport width < 768px.
 */

const MOBILE_BREAKPOINT = 768;

let _isMobile = window.innerWidth < MOBILE_BREAKPOINT;
const _listeners = new Set();

function checkMobile() {
  const wasMobile = _isMobile;
  _isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  if (wasMobile !== _isMobile) {
    _listeners.forEach(fn => fn(_isMobile));
  }
}

window.addEventListener('resize', checkMobile);
window.addEventListener('orientationchange', () => {
  setTimeout(checkMobile, 100);
});

export const MobileDetect = {
  /** Returns true if viewport is below mobile breakpoint */
  isMobile() {
    return _isMobile;
  },

  /** Register a callback for when mobile state changes */
  onChange(callback) {
    _listeners.add(callback);
    return () => _listeners.delete(callback);
  },

  BREAKPOINT: MOBILE_BREAKPOINT
};
