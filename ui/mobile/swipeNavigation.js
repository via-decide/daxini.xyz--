/**
 * ui/mobile/swipeNavigation.js
 *
 * Touch swipe navigation for mobile workspace panels.
 * Swipe left  -> next panel
 * Swipe right -> previous panel
 */

export class SwipeNavigation {
  constructor(container, onSwipe) {
    this.container = container;
    this.onSwipe = onSwipe;
    this.startX = 0;
    this.startY = 0;
    this.threshold = 50;
    this.restraint = 100;
    this.bind();
  }

  bind() {
    this.container.addEventListener('touchstart', (e) => {
      const touch = e.changedTouches[0];
      this.startX = touch.pageX;
      this.startY = touch.pageY;
    }, { passive: true });

    this.container.addEventListener('touchend', (e) => {
      const touch = e.changedTouches[0];
      const dx = touch.pageX - this.startX;
      const dy = touch.pageY - this.startY;

      if (Math.abs(dx) >= this.threshold && Math.abs(dy) <= this.restraint) {
        if (dx < 0) {
          this.onSwipe('next');
        } else {
          this.onSwipe('prev');
        }
      }
    }, { passive: true });
  }

  destroy() {
    // Listeners are removed when container is removed from DOM
  }
}
