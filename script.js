(function () {
  'use strict';

  const shell     = document.querySelector('.shell');
  const header    = document.querySelector('.header');
  const tabs      = document.querySelectorAll('.tab');
  const panes     = document.querySelectorAll('.pane');
  const viewport  = document.getElementById('viewport');
  const cmdField  = document.getElementById('cmd');

  /* ==========================================================
     RESIZE HANDLES — inject into DOM
     ========================================================== */
  const HANDLES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

  HANDLES.forEach(dir => {
    const el = document.createElement('div');
    el.className = `resize-handle resize-handle--${dir}`;
    el.dataset.dir = dir;
    shell.appendChild(el);
  });

  /* ==========================================================
     CENTER SHELL ON LOAD
     ========================================================== */
  function centerShell() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(900, vw - 40);
    const h = Math.min(680, vh - 40);
    shell.style.width  = w + 'px';
    shell.style.height = h + 'px';
    shell.style.left   = Math.max(0, (vw - w) / 2) + 'px';
    shell.style.top    = Math.max(0, (vh - h) / 2) + 'px';
  }

  /* Keep the shell inside the viewport after a resize or size change. */
  function clampToViewport() {
    if (shell.classList.contains('is-maximized')) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w  = shell.offsetWidth;
    const h  = shell.offsetHeight;

    if (shell.offsetLeft + w > vw) shell.style.left = Math.max(0, vw - w) + 'px';
    if (shell.offsetTop  + h > vh) shell.style.top  = Math.max(0, vh - h) + 'px';
  }

  centerShell();

  /* ==========================================================
     DRAG TO MOVE (title bar)
     ========================================================== */
  let isDragging = false;
  let dragStartX, dragStartY, shellStartX, shellStartY;

  let dragPointerId = null;

  header.addEventListener('pointerdown', e => {
    // Don't drag when clicking on tabs, dots, or interactive elements
    if (e.target.closest('.tab, .dots, a, button, input')) return;
    if (shell.classList.contains('is-maximized')) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    isDragging = true;
    dragPointerId = e.pointerId;
    shell.classList.add('is-dragging');
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    shellStartX = shell.offsetLeft;
    shellStartY = shell.offsetTop;
    header.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  header.addEventListener('pointermove', e => {
    if (!isDragging || e.pointerId !== dragPointerId) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    shell.style.left = (shellStartX + dx) + 'px';
    shell.style.top  = (shellStartY + dy) + 'px';
  });

  function endDrag(e) {
    if (!isDragging || e.pointerId !== dragPointerId) return;
    isDragging = false;
    dragPointerId = null;
    shell.classList.remove('is-dragging');
    if (header.hasPointerCapture(e.pointerId)) header.releasePointerCapture(e.pointerId);
  }

  header.addEventListener('pointerup', endDrag);
  header.addEventListener('pointercancel', endDrag);

  /* ==========================================================
     DOUBLE-CLICK TITLE BAR → MAXIMIZE / RESTORE
     ========================================================== */
  let preMaxBounds = null;
  let preMinBounds = null;
  let preCollapseHeight = null;

  header.addEventListener('dblclick', e => {
    if (e.target.closest('.tab, .dots, a, button, input')) return;
    toggleMaximize();
  });

  function toggleMaximize() {
    if (shell.classList.contains('is-maximized')) {
      // Restore
      shell.classList.remove('is-maximized');
      if (preMaxBounds) {
        shell.style.left   = preMaxBounds.left + 'px';
        shell.style.top    = preMaxBounds.top + 'px';
        shell.style.width  = preMaxBounds.width + 'px';
        shell.style.height = preMaxBounds.height + 'px';
      }
    } else {
      // Save current bounds and maximize
      preMaxBounds = {
        left:   shell.offsetLeft,
        top:    shell.offsetTop,
        width:  shell.offsetWidth,
        height: shell.offsetHeight,
      };
      shell.classList.add('is-maximized');
    }
  }

  /* ==========================================================
     EDGE / CORNER RESIZING
     ========================================================== */
  let isResizing = false;
  let resizeDir = '';
  let resStartX, resStartY, resBounds;

  const MIN_W = 380;
  const MIN_H = 320;

  let resizePointerId = null;
  let resizeHandleEl = null;

  shell.addEventListener('pointerdown', e => {
    const handle = e.target.closest('.resize-handle');
    if (!handle) return;
    if (shell.classList.contains('is-maximized')) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    isResizing = true;
    resizePointerId = e.pointerId;
    resizeHandleEl = handle;
    resizeDir  = handle.dataset.dir;
    resStartX  = e.clientX;
    resStartY  = e.clientY;
    resBounds  = {
      left:   shell.offsetLeft,
      top:    shell.offsetTop,
      width:  shell.offsetWidth,
      height: shell.offsetHeight,
    };
    shell.classList.add('is-resizing');
    handle.setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  });

  shell.addEventListener('pointermove', e => {
    if (!isResizing || e.pointerId !== resizePointerId) return;

    const dx = e.clientX - resStartX;
    const dy = e.clientY - resStartY;
    const dir = resizeDir;

    let { left, top, width, height } = resBounds;

    // East  → grow width right
    if (dir.includes('e')) {
      width = Math.max(MIN_W, resBounds.width + dx);
    }
    // West  → grow width left (move left edge)
    if (dir.includes('w')) {
      const newW = Math.max(MIN_W, resBounds.width - dx);
      left = resBounds.left + (resBounds.width - newW);
      width = newW;
    }
    // South → grow height down
    if (dir.includes('s')) {
      height = Math.max(MIN_H, resBounds.height + dy);
    }
    // North → grow height up (move top edge)
    if (dir.includes('n')) {
      const newH = Math.max(MIN_H, resBounds.height - dy);
      top = resBounds.top + (resBounds.height - newH);
      height = newH;
    }

    shell.style.left   = left + 'px';
    shell.style.top    = top + 'px';
    shell.style.width  = width + 'px';
    shell.style.height = height + 'px';
  });

  function endResize(e) {
    if (!isResizing || e.pointerId !== resizePointerId) return;
    isResizing = false;
    resizePointerId = null;
    shell.classList.remove('is-resizing');
    if (resizeHandleEl && resizeHandleEl.hasPointerCapture(e.pointerId)) {
      resizeHandleEl.releasePointerCapture(e.pointerId);
    }
    resizeHandleEl = null;
  }

  shell.addEventListener('pointerup', endResize);
  shell.addEventListener('pointercancel', endResize);

  /* ==========================================================
     TRAFFIC LIGHT BUTTONS (functional)
     ========================================================== */
  const dotRed    = document.querySelector('.dot--r');
  const dotYellow = document.querySelector('.dot--y');
  const dotGreen  = document.querySelector('.dot--g');

  // Red dot → collapse to title bar / restore
  if (dotRed) {
    dotRed.style.cursor = 'pointer';
    dotRed.title = 'Collapse / Restore';
    dotRed.addEventListener('click', () => {
      if (shell.classList.contains('is-collapsed')) {
        shell.classList.remove('is-collapsed');
        if (preCollapseHeight) shell.style.height = preCollapseHeight + 'px';
      } else {
        if (shell.classList.contains('is-maximized')) toggleMaximize();
        preCollapseHeight = shell.offsetHeight;
        shell.style.height = '';
        shell.classList.add('is-collapsed');
      }
    });
  }

  // Yellow dot → minimize (shrink to smallest size) / restore
  if (dotYellow) {
    dotYellow.style.cursor = 'pointer';
    dotYellow.title = 'Minimize / Restore';
    dotYellow.addEventListener('click', () => {
      if (shell.classList.contains('is-collapsed')) shell.classList.remove('is-collapsed');
      if (shell.classList.contains('is-maximized')) toggleMaximize();

      const atMin = shell.offsetWidth <= MIN_W && shell.offsetHeight <= MIN_H;
      if (atMin && preMinBounds) {
        shell.style.width  = preMinBounds.width + 'px';
        shell.style.height = preMinBounds.height + 'px';
        preMinBounds = null;
      } else {
        preMinBounds = { width: shell.offsetWidth, height: shell.offsetHeight };
        shell.style.width  = MIN_W + 'px';
        shell.style.height = MIN_H + 'px';
      }
      clampToViewport();
    });
  }

  // Green dot → maximize / restore
  if (dotGreen) {
    dotGreen.style.cursor = 'pointer';
    dotGreen.title = 'Maximize / Restore';
    dotGreen.addEventListener('click', toggleMaximize);
  }

  /* ==========================================================
     TAB NAVIGATION
     ========================================================== */
  const tabList = Array.from(tabs);

  function switchTo(id, focusTab) {
    tabList.forEach(t => {
      const isActive = t.dataset.sec === id;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive);
      // Roving tabindex: only the selected tab is in the tab order.
      t.tabIndex = isActive ? 0 : -1;
      if (isActive && focusTab) t.focus();
    });

    panes.forEach(p => {
      p.classList.remove('active');
      p.hidden = true;
    });

    const target = document.getElementById('pane-' + id);
    if (target) {
      target.hidden = false;
      target.classList.add('active');
      viewport.scrollTop = 0;
    }
  }

  tabList.forEach(t => t.addEventListener('click', () => switchTo(t.dataset.sec)));

  /* Arrow / Home / End navigation per the ARIA tabs pattern. */
  document.getElementById('tabs').addEventListener('keydown', e => {
    const idx = tabList.indexOf(document.activeElement);
    if (idx === -1) return;

    let next = null;
    if (e.key === 'ArrowRight') next = (idx + 1) % tabList.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + tabList.length) % tabList.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabList.length - 1;
    else return;

    e.preventDefault();
    switchTo(tabList[next].dataset.sec, true);
  });

  /* ==========================================================
     COMMAND INTERPRETER
     ========================================================== */
  const CMDS = {
    help: () =>
`commands:
  about        show profile
  experience   work history
  projects     side projects
  skills       tech stack
  education    academics
  contact      get in touch
  resume       download PDF
  clear        clear output
  whoami       quick bio
  date         current time
  maximize     toggle fullscreen
  minimize     shrink / restore window
  collapse     fold to title bar
  center       reset position`,

    whoami: () => 'Gunjit Valechha — Data Engineer @ HDFC Bank',
    date:   () => new Date().toLocaleString(),
    clear:  () => { document.querySelectorAll('.cmd-out').forEach(e => e.remove()); return null; },

    resume: () => {
      const a = document.createElement('a');
      a.href = 'GV_Resume.pdf'; a.download = 'Gunjit_Valechha_Resume.pdf'; a.click();
      return 'downloading resume…';
    },

    maximize: () => { toggleMaximize(); return null; },
    minimize: () => { dotYellow && dotYellow.click(); return null; },
    collapse: () => { dotRed && dotRed.click(); return null; },
    center:   () => {
      if (shell.classList.contains('is-maximized')) shell.classList.remove('is-maximized');
      centerShell();
      return null;
    },

    about:      () => { switchTo('about');      return null; },
    experience: () => { switchTo('experience'); return null; },
    projects:   () => { switchTo('projects');   return null; },
    skills:     () => { switchTo('skills');     return null; },
    education:  () => { switchTo('education');  return null; },
    contact:    () => { switchTo('contact');    return null; },
  };

  CMDS.ls = CMDS.help;
  CMDS['-h'] = CMDS.help;
  CMDS['--help'] = CMDS.help;
  CMDS.dl = CMDS.resume;
  CMDS.download = CMDS.resume;

  const history = [];
  let hIdx = 0;

  function output(text, err) {
    const d = document.createElement('div');
    d.className = 'cmd-out' + (err ? ' cmd-out--err' : '');
    d.textContent = text;
    document.getElementById('input-row').before(d);
    viewport.scrollTop = viewport.scrollHeight;
  }

  if (cmdField) {
    cmdField.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const raw = cmdField.value.trim().toLowerCase();
        cmdField.value = '';
        if (!raw) return;
        history.push(raw);
        hIdx = history.length;
        const fn = CMDS[raw];
        if (fn) { const r = fn(); if (r !== null) output(r); }
        else output(`command not found: ${raw}. type 'help' for commands.`, true);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (hIdx > 0) { hIdx--; cmdField.value = history[hIdx]; }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (hIdx < history.length - 1) { hIdx++; cmdField.value = history[hIdx]; }
        else { hIdx = history.length; cmdField.value = ''; }
      }
    });
  }

  /* ==========================================================
     FOOTER YEAR
     ========================================================== */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ==========================================================
     GLOBAL KEYS
     - "/" focuses the command input (browser find-in-page is left alone,
       and no other printable key is hijacked).
     - Escape blurs it.
     ========================================================== */
  document.addEventListener('keydown', e => {
    if (!cmdField) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const el = document.activeElement;
    const typingElsewhere =
      el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

    if (e.key === '/' && !typingElsewhere) {
      e.preventDefault();
      cmdField.focus();
    } else if (e.key === 'Escape' && el === cmdField) {
      cmdField.blur();
    }
  });

  /* ==========================================================
     WINDOW RESIZE → keep shell in bounds
     ========================================================== */
  window.addEventListener('resize', clampToViewport);

})();
