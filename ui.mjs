// Keep the reading position when a full-screen case dialog closes on a phone.
export function createPageScrollLock(page, doc) {
  let saved = null;
  const properties = ['position', 'top', 'left', 'right', 'width', 'overflow'];
  return {
    lock() {
      if (saved) return;
      saved = {
        x: page.scrollX, y: page.scrollY,
        styles: Object.fromEntries(properties.map(p => [p, doc.body.style[p]])),
        rootOverflow: doc.documentElement.style.overflow
      };
      Object.assign(doc.body.style, {
        position: 'fixed', top: `-${saved.y}px`, left: '0', right: '0',
        width: '100%', overflow: 'hidden'
      });
      doc.documentElement.style.overflow = 'hidden';
    },
    unlock() {
      if (!saved) return;
      const previous = saved;
      saved = null;
      Object.assign(doc.body.style, previous.styles);
      doc.documentElement.style.overflow = previous.rootOverflow;
      page.scrollTo(previous.x, previous.y);
    }
  };
}
