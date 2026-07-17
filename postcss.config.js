@tailwind base;
@tailwind components;
@tailwind utilities;

/* ─── TEMA CLARO ─── */
:root {
  --color-bg:        #f2f2f7;
  --color-surface:   #ffffff;
  --color-border:    rgba(0,0,0,0.08);
  --color-text:      #1c1c1e;
  --color-muted:     #8e8e93;
  --color-accent:    #007AFF;
  --color-accent-fg: #ffffff;
  --font-body:       'Inter', system-ui, sans-serif;
  --radius-widget:   18px;
  --pixel-shadow:    none;
}

/* ─── TEMA ESCURO ─── */
.dark {
  --color-bg:        #1c1c1e;
  --color-surface:   #2c2c2e;
  --color-border:    rgba(255,255,255,0.10);
  --color-text:      #f2f2f7;
  --color-muted:     #8e8e93;
}

/* ─── TEMA PIXEL ART ─── */
.pixel {
  --color-bg:        #0f0f23;
  --color-surface:   #1a1a3e;
  --color-border:    #4040a0;
  --color-text:      #e0e0ff;
  --color-muted:     #8080c0;
  --color-accent:    #ffff00;
  --color-accent-fg: #000000;
  --font-body:       'Press Start 2P', monospace;
  --radius-widget:   0px;
  --pixel-shadow:    4px 4px 0px #000, -2px -2px 0px rgba(255,255,255,0.1);
}

/* ─── FONTES ─── */
.font-inter    { --font-body: 'Inter', system-ui, sans-serif; }
.font-fraunces { --font-body: 'Fraunces', Georgia, serif; }
.font-dm       { --font-body: 'DM Sans', system-ui, sans-serif; }
.font-mono-jb  { --font-body: 'JetBrains Mono', monospace; }
.font-pixel    { --font-body: 'Press Start 2P', monospace; }

html, body, #root {
  height: 100%;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  transition: background 0.3s, color 0.3s;
}

/* ─── WIDGET ─── */
.widget {
  background: var(--color-surface);
  border-radius: var(--radius-widget);
  box-shadow: 0 2px 20px -4px rgba(0,0,0,0.10), 0 0 0 0.5px var(--color-border);
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.2s;
}
.dark .widget {
  box-shadow: 0 2px 20px -4px rgba(0,0,0,0.4), 0 0 0 0.5px var(--color-border);
}
.pixel .widget {
  box-shadow: var(--pixel-shadow);
  border: 2px solid var(--color-border);
  image-rendering: pixelated;
}
.widget-press:active { transform: scale(0.98); }
.pixel .widget-press:active { transform: translate(2px,2px); }

/* ─── GLASS ─── */
.glass {
  background: rgba(255,255,255,0.72);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 0.5px solid rgba(0,0,0,0.08);
}
.dark .glass {
  background: rgba(28,28,30,0.85);
  border-bottom: 0.5px solid rgba(255,255,255,0.08);
}
.pixel .glass {
  background: var(--color-surface);
  backdrop-filter: none;
  border-bottom: 2px solid var(--color-border);
}

/* ─── INPUTS ─── */
.v-input {
  width: 100%;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: calc(var(--radius-widget) * 0.67);
  padding: 10px 14px;
  font-family: var(--font-body);
  font-size: 15px;
  color: var(--color-text);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.pixel .v-input {
  border: 2px solid var(--color-border);
  border-radius: 0;
  font-size: 8px;
  padding: 8px 10px;
}
.v-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(0,122,255,0.15);
}
.pixel .v-input:focus { box-shadow: none; }
.v-input::placeholder { color: var(--color-muted); }

/* ─── BOTÓNS ─── */
.v-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: calc(var(--radius-widget) * 0.67);
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  border: none;
  outline: none;
}
.pixel .v-btn {
  border-radius: 0;
  border: 2px solid currentColor;
  font-size: 8px;
  padding: 8px 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.v-btn:active { transform: scale(0.97); }
.pixel .v-btn:active { transform: translate(2px,2px); box-shadow: none !important; }
.v-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.v-btn-primary { background: var(--color-accent); color: var(--color-accent-fg); }
.v-btn-secondary { background: var(--color-border); color: var(--color-text); }
.v-btn-ghost { background: transparent; color: var(--color-muted); }
.v-btn-sm { padding: 6px 12px; font-size: 13px; border-radius: calc(var(--radius-widget) * 0.5); }
.pixel .v-btn-sm { font-size: 7px; padding: 6px 8px; }

/* ─── PILL ─── */
.pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 999px;
  font-size: 12px; font-weight: 500;
  background: var(--color-accent); color: var(--color-accent-fg);
}
.pixel .pill {
  border-radius: 0; border: 2px solid var(--color-accent);
  font-size: 7px; padding: 3px 6px;
}

/* ─── ANIMACIÓNS ─── */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-up { animation: fadeUp 0.25s ease both; }

@keyframes pixelIn {
  0%   { opacity: 0; clip-path: inset(50%); }
  50%  { opacity: 1; clip-path: inset(10%); }
  100% { opacity: 1; clip-path: inset(0%); }
}
.pixel .fade-up { animation: pixelIn 0.3s steps(6) both; }

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}
.scale-in { animation: scaleIn 0.2s ease both; }

/* ─── PIXEL EXTRAS ─── */
.pixel * { image-rendering: pixelated; }
.pixel h1, .pixel h2, .pixel h3 { text-shadow: 2px 2px 0 rgba(0,0,0,0.5); }
.pixel .text-3xl { font-size: 14px !important; line-height: 1.8; }
.pixel .text-2xl { font-size: 12px !important; line-height: 1.8; }
.pixel .text-xl  { font-size: 10px !important; line-height: 1.8; }
.pixel .text-lg  { font-size: 9px  !important; line-height: 1.8; }
.pixel .text-sm, .pixel .text-xs { font-size: 7px !important; line-height: 1.8; }

/* ─── SCROLLBAR ─── */
::-webkit-scrollbar { height: 4px; width: 4px; }
::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 999px; }

/* ─── FOCUS ─── */
:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }

/* ─── DIVIDER ─── */
.v-divider { border: none; border-top: 0.5px solid var(--color-border); }

/* ─── GOOGLE MAPS overrides ─── */
.gm-style .gm-style-iw-c {
  background: var(--color-surface) !important;
  border-radius: 14px !important;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2) !important;
  padding: 0 !important;
}
.gm-style .gm-style-iw-d { overflow: hidden !important; }
.gm-style .gm-style-iw-t::after { background: var(--color-surface) !important; }
.gm-ui-hover-effect { display: none !important; }
