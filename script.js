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

  centerShell();

  /* ==========================================================
     DRAG TO MOVE (title bar)
     ========================================================== */
  let isDragging = false;
  let dragStartX, dragStartY, shellStartX, shellStartY;

  header.addEventListener('mousedown', e => {
    // Don't drag when clicking on tabs, dots, or interactive elements
    if (e.target.closest('.tab, .dots, a, button, input')) return;
    if (shell.classList.contains('is-maximized')) return;

    isDragging = true;
    shell.classList.add('is-dragging');
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    shellStartX = shell.offsetLeft;
    shellStartY = shell.offsetTop;
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    shell.style.left = (shellStartX + dx) + 'px';
    shell.style.top  = (shellStartY + dy) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      shell.classList.remove('is-dragging');
    }
  });

  /* ==========================================================
     DOUBLE-CLICK TITLE BAR → MAXIMIZE / RESTORE
     ========================================================== */
  let preMaxBounds = null;

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

  shell.addEventListener('mousedown', e => {
    const handle = e.target.closest('.resize-handle');
    if (!handle) return;
    if (shell.classList.contains('is-maximized')) return;

    isResizing = true;
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
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('mousemove', e => {
    if (!isResizing) return;

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

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      shell.classList.remove('is-resizing');
    }
  });

  /* ==========================================================
     TRAFFIC LIGHT BUTTONS (functional)
     ========================================================== */
  const dotRed    = document.querySelector('.dot--r');
  const dotYellow = document.querySelector('.dot--y');
  const dotGreen  = document.querySelector('.dot--g');

  // Red dot → shrink to minimum
  if (dotRed) {
    dotRed.style.cursor = 'pointer';
    dotRed.title = 'Minimize';
    dotRed.addEventListener('click', () => {
      shell.style.width  = MIN_W + 'px';
      shell.style.height = MIN_H + 'px';
    });
  }

  // Yellow dot → center in viewport
  if (dotYellow) {
    dotYellow.style.cursor = 'pointer';
    dotYellow.title = 'Center';
    dotYellow.addEventListener('click', () => {
      if (shell.classList.contains('is-maximized')) {
        shell.classList.remove('is-maximized');
      }
      centerShell();
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
  function switchTo(id) {
    tabs.forEach(t => {
      const isActive = t.dataset.sec === id;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive);
    });
    panes.forEach(p => p.classList.remove('active'));
    const target = document.getElementById('pane-' + id);
    if (target) {
      target.classList.add('active');
      viewport.scrollTop = 0;
    }
  }

  tabs.forEach(t => t.addEventListener('click', () => switchTo(t.dataset.sec)));

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
     GLOBAL KEY → FOCUS INPUT
     ========================================================== */
  document.addEventListener('keydown', e => {
    if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1 && document.activeElement !== cmdField) {
      cmdField.focus();
    }
  });

  /* ==========================================================
     WINDOW RESIZE → keep shell in bounds
     ========================================================== */
  window.addEventListener('resize', () => {
    if (shell.classList.contains('is-maximized')) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const l  = shell.offsetLeft;
    const t  = shell.offsetTop;
    const w  = shell.offsetWidth;
    const h  = shell.offsetHeight;

    if (l + w > vw) shell.style.left = Math.max(0, vw - w) + 'px';
    if (t + h > vh) shell.style.top  = Math.max(0, vh - h) + 'px';
  });

})();
