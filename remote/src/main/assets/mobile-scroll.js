(function () {
  // The shared desktop/mobile CSS locks body scrolling for .main-shell.
  // The laptop dashboard has .sr-main instead. Restore the document scroller.
  for (const element of [document.documentElement, document.body]) {
    if (!element) continue;
    element.style.setProperty('height', 'auto', 'important');
    element.style.setProperty('min-height', '100%', 'important');
    element.style.setProperty('overflow-y', 'auto', 'important');
    element.style.setProperty('overflow-x', 'hidden', 'important');
    element.style.setProperty('touch-action', 'pan-y pinch-zoom', 'important');
  }
})();
