# Emberfall: mobile play + new look, design spec

Date: 2026-10-12. Status: approved in chat (three sections), spec awaiting review.
Builds on: `2026-10-12-v9-design.md`, Delivery B ("minimal glass"), which is built together with this.

## Goal
Play the **full game** on a phone in landscape, with the same game, saves, logins and co-op as on desktop. One interface for every device: touch devices get a control layer and a compact layout; desktop keyboard + mouse play is unchanged.

## Decisions (Anders, 2026-10-12)
- The full game, not a lite version or a companion app.
- Built together with Delivery B, so nothing gets built twice.
- Right thumb: smart auto-aim. A tap hits the auto-target; dragging an ability aims it by hand.
- Left thumb: a floating joystick.

## 1. Touch controls (landscape)
Shown only when the device has touch (`matchMedia('(pointer:coarse)')` or the first `touchstart`). They hide again after any mouse movement or key press, so a touch laptop still works both ways.

- **Joystick:** appears where the thumb lands on the left 45% of the screen. It has a 60 px radius and a 10% dead zone, and the walk speed scales with the stick distance (the run threshold is 0.5). It writes the same move vector the WASD keys produce.
- **Attack button:** 84 px, bottom right. Holding it attacks the auto-target continuously, the same as holding the left mouse button.
- **Ability arc:** abilities 1–5 sit in an arc around the attack button (56 px each), with the spec ability (R) on top.
  - **Tap:** casts at the auto-target. With no target in range, it casts in the facing direction.
  - **Drag (more than 18 px):** shows an aim line or circle and casts on release. Dragging back onto the button cancels.
  - Cooldown sweep with seconds, a tint when there's too little mana, and a glow when ready (as in B5).
- **Quick buttons (40 px):** a small row above the arc with health potion (Q), mana potion (Z), food (X), mount (F) and hearthstone (H).
- **Context button:** appears above the arc only when `interactables(p)[0]` exists, labelled with that action: "Talk", "Loot", "Enter", "Drink", "Gather", "Shop". It runs the same `act()` as E.
- **Menu button:** top right, next to the minimap. It opens a grid with Inventory, Talents, Professions, Map, Quests, Friends, Settings, Mute and Pause. Tapping the minimap opens the world map.
- **Hold for tooltips:** holding 450 ms on an item, ability or talent shows its tooltip, and lifting your finger closes it. A hold also replaces right-click on inventory items.
- **Portrait orientation:** a full-screen "Turn your phone sideways" card, and the game pauses while it's showing.
- **Multi-touch:** each control tracks its own pointer id, so you can move and cast at the same time.

### Auto-aim
- **Candidates:** live enemies within the ability's range (the attack range for the attack button) and in line of sight (the existing LOS helper).
- **Score:** `distance × (1.6 − 0.6 × cos(angle between facing/move direction and enemy))`. The lowest score wins, so enemies straight ahead are preferred.
- **Sticky:** the current target is kept while it's alive and in range, even if another enemy scores slightly better. It switches only when the new score is under 70% of the current one.
- **Display:** the target gets a thin ring under its feet and appears in the target frame (B4).
- Healing or friendly spells (Paladin heals) target the most hurt party member in range, or yourself.

## 2. Phone layout and windows
The phone layout is active when `min(innerWidth, innerHeight) < 500` and touch is present.

- **Top left:** the B2 player frame, compact (a 44 px portrait).
- **Top centre:** the B4 target frame, only while there is a target.
- **Top right:** a 120 px minimap and one line of quest text (tap to expand). Party frames fold into a stack of 32 px portraits with health rings.
- **Bottom corners:** reserved for the thumbs. Toasts, hints and chat move up to the middle top area.
- **Windows** (inventory, shop, talents, professions, quests, settings, friends, pause): fullscreen on a phone, with tabs across the top and tap targets of at least 44 px.
  - Inventory: tap to select an item. The action buttons are Equip, Use, Sell (at a shop), Drop and Compare.
- **Dialogs and the loot window:** bottom sheets that slide up, with rows of at least 48 px.
- **World map:** fullscreen, pinch to zoom, drag to pan.
- **UI size:** the B6 setting defaults to 85% on phones and is still adjustable.
- **Safe areas:** `viewport-fit=cover` plus `env(safe-area-inset-*)` padding on every edge element.
- **Performance:** on phones the render scale drops to 1.0× (from 1.5×+) and particle counts are halved. Settings get **Graphics: Auto / High / Low**, stored in `emberfall-settings`.
- **Home-screen app:** a `manifest.webmanifest` (name, icons, `display: fullscreen`, `orientation: landscape`) plus the iOS meta tags, so "Add to Home Screen" runs the game without browser bars. No offline service worker in this round.

## 3. Code structure
New source files, built into `index.html` by `build.sh` as usual:
- `86-ui.js`: the B shared glass components (panel, header, tabs, button, row, tooltip, bottom sheet).
- `87-touch.js`: joystick, attack and ability buttons, auto-aim, hold for tooltips, multi-touch tracking.
- `88-layout.js`: picks the phone or desktop layout, handles the orientation card and the safe areas.

Touch writes into the same `players[0].input` object the keyboard and mouse use (move vector, `abil[n]`, aim point). The game logic, co-op and net code don't change. Auto-aim turns the chosen target into the aim point the casting code already reads.

## 4. Order of work
1. B1–B6: the glass visual system, player and target frames, portraits, action bar, windows, UI size (desktop first, as already specified).
2. Touch controls and auto-aim.
3. The phone layout, fullscreen windows, bottom sheets, performance setting.
4. The home-screen manifest and icons.

## 5. Testing
- **In-browser self-tests** (`?selftest`):
  - Auto-aim picks the right target, keeps it, and switches only past the threshold.
  - A joystick vector becomes the right move input.
  - A tap casts and a drag aims.
- **Screenshots** in the built-in browser at 844×390 (iPhone landscape) and 915×412 (Android landscape), with touch emulation. Each window is checked at UI sizes 85% and 130%.
- **Desktop regression:** the keyboard and mouse flow looks and works the same apart from the new B look. The B testing list also applies.
- **Two-tab co-op:** one tab in phone mode and one on desktop.
- **Real phone:** Anders tests on his phone from a beta copy (a `beta/` folder on the live site, published only after his yes). The main game is updated only after a second yes.

## Out of scope (parked)
Gamepad support, a reworked mobile login and sign-up flow (it only gets scaled), an offline service worker, app-store packaging, and portrait-mode play.
