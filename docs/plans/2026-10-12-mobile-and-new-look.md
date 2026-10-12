# Emberfall: mobile play + new look, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the full game, co-op included, playable on a phone in landscape, built together with the v9 Delivery B "minimal glass" look, while desktop keyboard and mouse play stays unchanged.

**Architecture:** the game is plain browser JS in `src/*`, concatenated into `index.html` by `build.sh`. There are three new files:
- `86-ui.js`: the glass components, frames and portraits
- `87-touch.js`: touch controls and auto-aim
- `88-layout.js`: the phone layout, orientation and graphics

Touch writes into the same `players[0].input` the keyboard and mouse fill (`readInput`, src/50-game.js:246), so the game, co-op and net logic stay as they are. The co-op additions are new message types in `src/96-net.js`. Decision logic lives in small pure functions tested by the `?selftest` harness (src/97-selftest.js).

**Tech Stack:** vanilla JS, canvas, CSS custom properties, Pointer Events, WebRTC (existing), and Inter from Google Fonts. There's no Node; Git Bash runs `build.sh`. Preview with the launch config "emberfall" (port 8790).

**Specs:** `docs/specs/2026-10-12-mobile-design.md` (this plan) and `docs/specs/2026-10-12-v9-design.md` → Delivery B (B1–B6, implemented here as Tasks 1–4).

## Global Constraints
- Edit `src/*` only, then `sh build.sh`. Never hand-edit `index.html`.
- Match the existing style: dense one-line functions, short names, no libraries other than the Inter webfont.
- Colours: health `#e5484d`, mana `#4c8dff`, XP `#c9a227`. Panels: `rgba(10,12,16,.62)`, an 8 px radius, a 1 px `rgba(255,255,255,.08)` hairline, and `backdrop-filter: blur(10px)` where supported. Rarity and level colours are unchanged. Every colour and size is a CSS custom property on `:root`.
- Text: body ≥ 14 px, labels ≥ 12 px, contrast ≥ 4.5:1, numbers in `font-variant-numeric: tabular-nums`. Cinzel only for the title screen, region banners and story screens.
- Settings live in `emberfall-settings` via `loadSettings()` / `saveSettings()` (src/75-loot.js:84). The new defaults are `{uiSize:null, gfx:'auto'}`, where `uiSize:null` means 100 on desktop and 85 on a phone.
- **Phone mode** = touch present AND `Math.min(innerWidth,innerHeight) < 500`. **Touch present** = `matchMedia('(pointer:coarse)').matches`, or a `pointerdown` with `pointerType==='touch'` has happened.
- Touch numbers:
  - Joystick: radius 60 px, dead zone 10%, run threshold 0.5, active zone the left 45% of the screen.
  - Buttons: attack 84 px, abilities 56 px, quick buttons 40 px.
  - Gestures: a drag is more than 18 px, a hold for tooltips is 450 ms.
  - Tap targets in windows ≥ 44 px, bottom-sheet rows ≥ 48 px.
- Auto-aim score: `d × (1.6 − 0.6·cosθ)`. It is sticky until a candidate scores under 70% of the current target.
- Co-op:
  - A guest that goes to the background is "away" and protected for up to 60 s.
  - A host that goes to the background pauses the world, and guests are sent home after 3 min.
  - The relay fallback starts after 4 s (instead of 9 s) when either side is a phone.
  - A phone host sends snapshots at 10 Hz.
- Quick chat lines, exactly: "Help!", "Follow me", "Wait", "Loot here", "Ready", "Thanks", "On my way", "Heading back to town".
- Work on the git branch `v9-b-mobile`, created from `main` before Task 1.
- Commit after each task with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. **Never push.** Pushing publishes the live game, and Anders says yes separately for the beta and for the release.

## Review Focus
1. **A phone rotated mid-fight or mid-cast:** the orientation card pauses the game (solo) and releases every held touch (stick, attack, drag-aim), so nothing stays stuck "on". Test `touchReset clears inputs` (Task 6).
2. **Two fingers on the same control, or a finger sliding off a button:** each control owns one pointer id. `pointercancel` and `lostpointercapture` release it. Test `second pointer ignored by stick` (Task 6).
3. **No enemy in range or none in sight when tapping an ability:** it casts in the facing direction and never at a wall-blocked or dead target. Tests `aim with no candidates faces forward` and `aim ignores blocked and dead` (Task 5).
4. **A guest returning after the host already left, or after 60 s:** it must land in the normal "host left → home" path, not a frozen "away" state. Test `away guest past 60s is dropped` (Task 9).
5. **Desktop with a touchscreen (touch laptop):** the controls hide on mouse movement or a key press, the desktop layout stays, and `uiSize` keeps its desktop default. Test `touch laptop stays desktop layout` (Task 7).

---

### Task 1: Glass visual system and shared components (B1, B5 components)

**Files:**
- Modify: `src/00-head.html` (`:root` tokens, the Inter `<link>`, panel/button/row/tab/tooltip CSS, remove the gold rims and bevels from `.panel`, `.btn`, `.x`, `.cell`)
- Create: `src/86-ui.js`
- Test: `src/97-selftest.js`

**Interfaces:**
- Produces: the CSS classes `.glass`, `.g-head`, `.g-tabs`, `.g-btn`, `.g-row`, `.g-tip` and `.sheet` (a bottom sheet, hidden until `.open`). The CSS vars are `--panel`, `--line`, `--hp`, `--mp`, `--xp`, `--r` (radius), `--ui` (scale factor, default 1), `--fs` (body font size), `--fs-s` (label size).
- Produces in 86-ui.js:
  - `uiPanel(title, {tabs?:string[], onTab?:(i)=>void, onClose?:()=>void}) -> HTMLElement`
  - `uiSheet(title, rows:{label,icon?,onTap}[]) -> {el, close()}`
  - `uiToken(name) -> string` (reads a CSS var from `:root`)

- [ ] **Step 1: Write the failing tests:** `uiToken('--hp')` is `'#e5484d'`; `uiToken('--mp')` is `'#4c8dff'`; `uiSheet('x',[{label:'a',onTap(){}}]).el.querySelectorAll('.g-row').length` is 1.
- [ ] **Step 2:** `sh build.sh`, open `index.html?selftest`. Expected: `SELFTEST FAIL` for the three new tests.
- [ ] **Step 3: Add the tokens and CSS, and implement the three functions.**
- [ ] **Step 4:** Rebuild, then rerun. Expected: `SELFTEST PASS n`. Screenshot the title screen and the HUD: there are no gold rims left on panels.
- [ ] **Step 5: Commit** `v9 B1: glass tokens and shared components`.

### Task 2: Player frame and live portrait (B2, B3)

**Files:**
- Modify: `src/00-head.html:196-210` (replace `#unit` and the `#orbHp` / `#orbMp` orbs with `#pframe`: a portrait canvas, name and level, the `hp` and `mp` bars with "412 / 560" text, an XP line, `#buffs`), `src/50-game.js:548-560` (`updateHud`), `src/96-net.js:177` (`renderParty`), `src/94-select.js` (hero cards)
- Modify: `src/86-ui.js`
- Test: `src/97-selftest.js`

**Interfaces:**
- Produces: `drawPortrait(canvas, look, gear) -> void` draws head and shoulders with the same code as the in-game hero figure (src/70-gfx25d.js), framed in a circle.
- Produces: `portraitKey(look, gear) -> string`, the cache key. It changes only when the look, the head gear or the chest gear changes. `portraitFor(p) -> HTMLCanvasElement` returns a 112×112 canvas cached per `portraitKey`.
- Produces: low health adds the `.low` class to `#pframe` (a red edge pulse) when `hp/maxHp < .3`. The orb CSS is removed.
- Consumes: for party frames, `look` and `gear` are already sent in the `ap` block of the host snapshot (src/96-net.js:136) and in `hero`.

- [ ] **Step 1: Write the failing tests:**
  - `portraitKey` is the same for the same look and gear, and different when the hair changes or a helm is equipped.
  - `portraitFor(p)` returns the same canvas object twice for the same hero.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement.** Hook `portraitFor` into `#pframe`, `renderParty` (32 px on a phone, 40 px on desktop) and the select cards.
- [ ] **Step 4:** Run. Expected: PASS. Take screenshots of the portrait with a hood, a helm, a beard and bald. Check low health pulses.
- [ ] **Step 5: Commit** `v9 B2-B3: player frame and live portraits`.

### Task 3: Target frame, action bar and combat text (B4, B5)

**Files:**
- Modify: `src/00-head.html` (`#tframe` top centre, replacing `#bossbar`), `src/50-game.js` (`updateHud`, the action bar build into `#abar`, `floatText`)
- Modify: `src/86-ui.js`
- Test: `src/97-selftest.js`

**Interfaces:**
- Produces: `hudTarget -> unit|null`. It's set by mouse hover or last hit on desktop, and by `Aim.target` in Task 5. `#tframe` shows a monster portrait (the corpse/creature drawing), the name, the level in its level colour and an HP bar. It gets `.boss` (a wider bar) when `u.boss`.
- Produces: `abarState(p, i) -> {cd:number, cdFrac:number, poor:boolean, ready:boolean}`.
  - `ready` is true only for 0.6 s after the cooldown ends, for the glow.
  - `poor` is `p.mana < abilCost(p,i)`.
- Combat text: Inter 700 with a 3 px dark outline. Crits are 1.4× size.

- [ ] **Step 1: Write the failing tests:** `abarState` gives `cdFrac` .5 halfway through the cooldown, `poor` true when mana is below the cost, and `ready` true at 0.3 s after the cooldown ends and false at 0.7 s.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement** the frames, the slot sweep with seconds, the key label in the corner, the mana tint and the ready glow.
- [ ] **Step 4:** Run. Expected: PASS. Take screenshots: a boss target, an ability on cooldown, and one you can't afford.
- [ ] **Step 5: Commit** `v9 B4-B5: target frame, action bar, combat text`.

### Task 4: Windows restyled and the UI size setting (B5 windows, B6)

**Files:**
- Modify: `src/00-head.html` and the window builders in `src/50-game.js` (inventory, shop, talents, pause, dialog, settings), `src/60-systems.js` (professions), `src/75-loot.js` (loot), `src/93-friends.js`, the map and quests
- Test: `src/97-selftest.js`

**Interfaces:**
- Consumes: `uiPanel` and `.g-*` (Task 1).
- Produces: `uiScale(settings, phone:boolean) -> number` returns `(settings.uiSize ?? (phone?85:100))/100`, clamped to 0.8–1.3. `applyUi()` sets `--ui` on `:root`. A Settings slider (80–130, step 5) saves `uiSize`.

- [ ] **Step 1: Write the failing tests:** `uiScale({uiSize:null},false)` is 1, `uiScale({uiSize:null},true)` is .85, `uiScale({uiSize:200},false)` is 1.3, and `loadSettings()` without storage includes `uiSize:null, gfx:'auto'`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement** and move every listed window to the glass components.
- [ ] **Step 4:** Run. Expected: PASS. Take a before and after screenshot of each window at UI sizes 80% and 130%, and at 760 px width. Check that two-tab co-op party frames show portraits (`?nettest=a` / `?nettest=b`).
- [ ] **Step 5: Commit** `v9 B5-B6: glass windows and UI size`.

### Task 5: Auto-aim (pure logic)

**Files:**
- Create: `src/87-touch.js` (the aim section)
- Test: `src/97-selftest.js`

**Interfaces:**
- Consumes: `enemies` (the global array), `lineClear(x0,y0,x1,y1,set)` (src/20-world.js:31) with the blocking tile set the monster LOS already uses (src/85-vision.js), and `players`.
- Produces: `aimRange(p, i) -> number` gives the attack (i=0) and melee abilities 120, and ranged and spell abilities 460. Classify by the ability's `cast` using `melee(` (the existing helper); store the result per class once.
- Produces: `aimScore(p, e, face:{x,y}) -> number` returns `d × (1.6 − 0.6·cosθ)`, where θ is the angle between `face` (the move vector if moving, else the facing from `p.aim`) and the direction to `e`.
- Produces: `aimPick(p, cands, face, cur) -> unit|null` keeps `cur` if it is still a candidate, unless some candidate scores `< 0.7 ×` cur's score.
- Produces: `aimCands(p, range) -> unit[]` returns live, in-range enemies in line of sight.
- Produces: `aimFriendly(p, range) -> unit` returns the most hurt (lowest hp/maxHp) party member in range, else `p`. It's used for abilities flagged `heal:true`. Add `heal:true` to the Paladin heal entries in `ABIL` (src/30-data.js).
- Produces: `Aim = {target:null}` and `aimPoint(p, i) -> {x,y}`. It returns the target's position, or `p` + 200 px along the facing direction when there's no target, and sets `hudTarget`.

- [ ] **Step 1: Write the failing tests:**
  - `aimScore`: the same distance ahead scores lower than behind (θ=0 gives `d`, θ=π gives `2.2·d`).
  - `aim prefers ahead`: an enemy ahead at 200 beats one behind at 150.
  - `aim is sticky`: cur at score 100 is kept against a candidate at 75 and dropped against one at 65.
  - `aim with no candidates faces forward`: `aimPoint` is 200 px along the facing.
  - `aim ignores blocked and dead`: a dead enemy and a wall-blocked enemy are not candidates.
  - `friendly aim picks most hurt`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Commit** `mobile: auto-aim`.

### Task 6: Touch controls

**Files:**
- Modify: `src/87-touch.js` (the controls section), `src/00-head.html` (the `#touch` layer: `#stick`, `#atk`, `#arc` with 6 slots, `#quick` with 5 buttons, `#ctx`, `#menuBtn`, and the menu grid), `src/50-game.js:246` (`readInput` reads touch when active)
- Test: `src/97-selftest.js`

**Interfaces:**
- Consumes: `aimPoint`, `Aim` (Task 5), `abarState` (Task 3), `interactables(p)` (src/60-systems.js:17; use `.label`, and fall back to "Talk" for the warden and "Shop" for the merchant), `useAbility`, `drinkPotion`, `eatFood`, `toggleMount`, `startHearth`, `showTip` / `hideTip`, and the `toggle*` window functions.
- Produces: `Touch = {on:false, mx:0, my:0, fire:false, aimOverride:null, ptr:{}}`.
  - `stickVec(dx, dy) -> {x, y}` applies the 60 px radius and 10% dead zone and returns a vector of length ≤ 1. Walk speed comes from its length, and the run threshold is 0.5.
  - `readInput`: when `Touch.on`, use `Touch.mx/my` and `Touch.fire`. The aim is `Touch.aimOverride` while drag-aiming, else `aimPoint(p, i)` for the slot being fired.
- Produces: `touchReset()` clears every pointer, `fire` and `aimOverride`. It's called on `blur`, on orientation change and on window open.
- Ability slots: a tap casts with `aimPoint`. A drag of more than 18 px draws an aim line or circle and casts on release at `aimOverride`. Dragging back onto the slot cancels.
- The menu button (top right) opens a grid with Inventory, Talents, Professions, Map, Quests, Friends, Settings, Mute and Pause. Tapping the minimap opens the world map.
- The context button shows only when `interactables(p)[0]` exists, labelled with it, and calls its `act()`.
- A hold of 450 ms on any `[data-tip]` element opens `showTip`, and lifting the finger hides it. In the inventory, a hold also replaces right-click.
- Show and hide: show on a touch `pointerdown`. Hide on `mousemove` with `pointerType==='mouse'` or on any `keydown`.

- [ ] **Step 1: Write the failing tests:**
  - `stickVec dead zone`: (5, 0) gives (0, 0).
  - `stickVec clamps`: (120, 0) gives (1, 0).
  - `drag threshold`: 17 px is a tap and 19 px is a drag.
  - `second pointer ignored by stick`: a stick owned by pointer 1 ignores a pointerdown from pointer 2 in the left zone.
  - `touchReset clears inputs`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement** the controls with Pointer Events and `setPointerCapture`, one owner pointer per control. Add `touch-action:none` on `#touch` and on the canvas.
- [ ] **Step 4:** Run. Expected: PASS. In the built-in browser, at 844×390 with mobile emulation:
  - Move with the stick, attack the auto-target, and tap and drag an ability.
  - Loot with the context button and open the inventory from the menu.
  - Then at desktop size: WASD and the mouse work, and the touch layer is hidden.
- [ ] **Step 5: Commit** `mobile: touch controls`.

### Task 7: Phone layout, windows, orientation, graphics

**Files:**
- Create: `src/88-layout.js`
- Modify: `src/00-head.html` (the `body.phone` CSS: compact frames, a 120 px minimap, one-line quest, party stack, toasts and hints in the middle top, fullscreen windows with top tabs, the `.sheet` dialogs and loot; the viewport meta gets `viewport-fit=cover`; `env(safe-area-inset-*)` padding), `src/10-core.js:6` (`resize` uses `renderScale()`), `src/77-fx.js` (particle count × `fxScale()`), `src/50-game.js` (inventory tap actions; the world map gets pinch and drag on a phone)
- Test: `src/97-selftest.js`

**Interfaces:**
- Produces:
  - `isPhone() -> boolean`, by the Global Constraints rule.
  - `applyLayout()` toggles `body.phone`, calls `applyUi()` and `touchReset()` when the layout changes, and runs on resize and orientation change.
  - `renderScale(gfx, phone, dpr) -> number` returns 1 when `gfx==='low'`, or when `gfx==='auto' && phone`. Otherwise it returns the current `Math.min(2, Math.max(1.5, dpr))`.
  - `fxScale() -> number` is .5 on a phone with auto or low graphics, and 1 otherwise.
  - Orientation: in portrait on a phone, show the `#turn` card ("Turn your phone sideways"), call `touchReset()` and pause (solo only; in co-op the host-pause path from Task 9 applies).
  - Inventory on a phone: a tap selects the item, and an action row offers Equip, Use, Sell (only when a shop is open), Drop and Compare.
  - Dialog and loot open as `uiSheet` on a phone.
  - Settings gets **Graphics: Auto / High / Low**, saved as `gfx`.

- [ ] **Step 1: Write the failing tests:**
  - `renderScale('auto',true,3)` is 1, `renderScale('auto',false,3)` is 2, `renderScale('low',false,2)` is 1, and `renderScale('high',true,3)` is 2.
  - `isPhone` with a fake 844×390 coarse pointer is true, and with 1280×800 it's false.
  - `touch laptop stays desktop layout`: 1280×800 with a coarse pointer gives `isPhone()` false, and `uiScale` gives 1.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement.** Make `isPhone` read `innerWidth` / `innerHeight` / `matchMedia` through a small injectable `env` object so the tests can fake them.
- [ ] **Step 4:** Run. Expected: PASS. Take screenshots at 844×390 and 915×412: the HUD, every window, a loot sheet, the dialog sheet, the world map and the portrait card. Check the 60 fps feel with the graphics on Auto.
- [ ] **Step 5: Commit** `mobile: phone layout, orientation, graphics setting`.

### Task 8: Co-op social UI on touch and quick chat

**Files:**
- Modify: `src/93-friends.js` (the friends window goes fullscreen on a phone; the invite and join banner gets Accept and Decline buttons of at least 48 px and stays 20 s in `#netAsks`), `src/96-net.js` (the `chat` message; the party portrait tap menu offers Teleport, Whisper and Leave party; "Rise beside" opens as a sheet), `src/00-head.html` (the chat button, `#chatLog` with 3 lines in the middle top, bubbles over heroes), `src/50-game.js` (Enter opens chat on desktop and the keydown handler ignores game keys while it's open)
- Test: `src/97-selftest.js`

**Interfaces:**
- Produces: `CHAT_LINES` (the 8 lines in the Global Constraints) and `chatClean(s) -> string` (trim, collapse whitespace, max 120 characters, strip `<>`). `sendChat(text, to?:uid)` sends `{t:'chat', m, w?:uid}`: a host relays it to all guests, and a guest sends it to the host. `onChat(fromName, m, whisper)` pushes to the log (newest 3 shown, 50 kept) and shows a 4 s bubble over the sender.
- The host relays `chat` to everyone except the sender, and only a whisper (`w`) goes to that one uid.

- [ ] **Step 1: Write the failing tests:** `chatClean('  hi   there ')` is `'hi there'`, `chatClean('<b>x')` is `'bx'`, a 300-character string becomes 120 characters, `CHAT_LINES.length` is 8, and `CHAT_LINES[7]` is `'Heading back to town'`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run. Expected: PASS. In two-tab co-op (`?nettest=a` on a phone-sized tab, `?nettest=b` on desktop): invite and accept with the banner, send a preset line and a free-text line both ways, whisper, and teleport from the party portrait.
- [ ] **Step 5: Commit** `mobile: touch social UI and quick chat`.

### Task 9: Background and reconnect, relay timing, phone host rate

**Files:**
- Modify: `src/96-net.js` (`visibilitychange`; the messages `away`, `hpause`, `resync`; the relay fallback timer at :47–48; `SNAP_DT` when the host is on a phone), `src/50-game.js` (monsters ignore protected away proxies in targeting), `src/00-head.html` (the `#hostWait` card, the greyed `.away` party portrait)
- Test: `src/97-selftest.js`

**Interfaces:**
- Produces:
  - **Guest hidden:** send `{t:'away',v:1}`. Shown again: send `{t:'away',v:0}`, then `{t:'resync'}`.
  - **Host on `away`:** set `pr.awayBg = time` (or clear it). Monsters skip a proxy with `awayBg` set. After 60 s of `awayBg`, run the existing peer-dropped path (`peerLost`).
  - **Host on `resync`:** set `Net.sentCorp = null` and `Net.apT = 0` so the next snapshot is full.
  - **Host hidden:** send `{t:'hpause',v:1}` to all. Shown again: send `{t:'hpause',v:0}` plus a full snapshot.
  - **Guest on `hpause`:** show `#hostWait` with "Waiting for [host name]…" and freeze local prediction. After 180 s, run the existing "host left → return home" path.
- Produces: `awayExpired(since, now) -> boolean` (more than 60 s) and `hostWaitExpired(since, now) -> boolean` (more than 180 s).
- Produces: `relayDelay(localPhone, peerPhone) -> ms` returns 4000 if either side is a phone, else 9000. `isPhone()` travels in `hello` as `ph:1`.
- Produces: `snapDt(hostPhone) -> s` returns 0.1 for a phone host and the current `SNAP_DT` otherwise. Guests already interpolate between snapshots; check that this holds at 10 Hz.

- [ ] **Step 1: Write the failing tests:**
  - `awayExpired(0, 59)` is false and `awayExpired(0, 61)` is true.
  - `hostWaitExpired(0, 181)` is true.
  - `relayDelay(true, false)` is 4000 and `relayDelay(false, false)` is 9000.
  - `snapDt(true)` is .1.
  - `away guest past 60s is dropped`: a fake proxy with `awayBg = 0` at `time = 61`, after the host tick, has gone through `peerLost`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run. Expected: PASS. In two-tab co-op, hide and show each tab (switch the browser tab):
  - The guest goes away, comes back and resyncs.
  - The host hides, and the guest sees the wait card and resumes.
  - Force the relay with the existing developer option (or by blocking ICE) and check play continues.
- [ ] **Step 5: Commit** `mobile: background, reconnect, relay timing`.

### Task 10: Home-screen app

**Files:**
- Create: `manifest.webmanifest` (`name` "Emberfall", `short_name` "Emberfall", `display` "fullscreen", `orientation` "landscape", `background_color` and `theme_color` `#0a0c10`, `start_url` "./"), `icons/icon-192.png`, `icons/icon-512.png` (an ember or lamp mark drawn with a small script from the game's canvas code or made by hand; no external assets)
- Modify: `src/00-head.html` (`<link rel=manifest>`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` black-translucent, `apple-touch-icon`)

**Interfaces:**
- Consumes: nothing from earlier tasks. No service worker.

- [ ] **Step 1:** Add the files and tags, then rebuild.
- [ ] **Step 2:** In the built-in browser, `read_network_requests` shows `manifest.webmanifest` and both icons load with status 200, and the console has no manifest errors.
- [ ] **Step 3: Commit** `mobile: home-screen app manifest`.

### Task 11: Full verification and the beta copy

- [ ] **Step 1:** `index.html?selftest` shows `SELFTEST PASS n` (all tests).
- [ ] **Step 2: Desktop regression.** Play 3 minutes with keyboard and mouse: move, fight, loot, shop, talents and the map all work, the touch layer never shows, and the look matches the new B design.
- [ ] **Step 3: Phone pass** at 844×390 and 915×412 with mobile emulation: a full loop of fight → loot → town → shop → quest hand-in, plus the portrait card and Graphics Auto/Low.
- [ ] **Step 4: Two-tab co-op**, phone tab as host and then as guest, covering the Task 8 and Task 9 checks.
- [ ] **Step 5: Beta copy.** Add `beta.sh`, which runs `build.sh` and then copies `index.html`, `manifest.webmanifest` and `icons/` into `beta/`. Commit it. **Ask Anders** in chat (plus a dashboard card) for a yes to push, and push only after that yes. He tests from `<live address>/beta/` on his phone, including co-op on mobile data with the desktop.
- [ ] **Step 6: Release.** After his feedback is fixed and a **second yes**, merge to `main` and push. Then tick the milestones in memory `project-rpg-game.md`.
