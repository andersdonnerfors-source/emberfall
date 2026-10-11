# Emberfall v9 Delivery A (quick wins) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a warning `!` while mobs notice you, a personal auto loot setting with a rarity filter, and one loot window covering every corpse in reach.

**Architecture:** the game is plain browser JS split into `src/*` and concatenated into `index.html` by `build.sh`. New decision logic goes into small pure functions (testable without a running game), wired into the existing loot (`src/75-loot.js`), awareness (`src/85-vision.js`) and settings (`src/00-head.html`, `src/50-game.js`) code. A tiny in-browser self-test file runs those pure functions when the page is opened with `?selftest`.

**Tech Stack:** vanilla JS, canvas, localStorage. There's no Node; Git Bash runs `build.sh`. The browser preview uses the launch config "emberfall" on port 8765.

**Spec:** `docs/specs/2026-10-12-v9-design.md` (Delivery A)

## Global Constraints
- Edit `src/*` only, then run `sh build.sh` to regenerate `index.html`. Never hand-edit `index.html`.
- Match the existing code style: dense one-line functions, short names, no new libraries.
- Rarity indexes come from `RAR` (src/30-data.js:234): 0 Common, 1 Magic, 2 Rare, 3 Epic, 4 Legendary. The spec's "Uncommon" means **Magic**, and the default minimum is **1 (Magic)**.
- Settings key `emberfall-settings`, shape `{autoLoot:false, lootMinRar:1}`. It's read with `fetchStore`, written with `store` (src/10-core.js).
- `LOOT_REACH` = 170 (src/75-loot.js) is the reach for both area loot and auto loot.
- The host stays authoritative in co-op. Guests only ever send `{t:'take',cid,did}` (handled at src/96-net.js:81).
- Commit after each task with the attribution line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. **Do not push.** Pushing publishes the live game, and Anders decides when.

## Review Focus
1. **Guest auto loot while the host's `cs` sync replaces corpse objects** (src/96-net.js:167): area loot and auto loot must look corpses up by `id` after a sync, not hold stale objects. Test: `lootGroupsRefresh` keeps groups by id (Task 3).
2. **Guest sends the same `take` twice** before the host replies (auto loot every 0.25 s): a guest must remove the row locally on send and never resend that `did`. Test: `autoLootPick` skips ids in a `pending` set (Task 2).
3. **Full bag:** items stay on the corpse, gold, potions and materials are still taken, and the warning appears at most once every 10 s. Test: `autoLootPick` with `bagFree=0` (Task 2).
4. **Old saves and no localStorage** (Claude app preview blocks storage): settings fall back to defaults without errors. Test: `loadSettings()` with `fetchStore` returning null (Task 2).
5. **Escape and closing:** Escape closes the area loot window, and walking away from every corpse closes it. Checked manually in Task 3's browser step.

---

### Task 1: Self-test harness and the warning `!`

**Files:**
- Create: `src/97-selftest.js`
- Modify: `src/85-vision.js:32-36` (`drawAwareness`)

**Interfaces:**
- Produces: `test(name, fn)` and `eq(actual, expected, msg)` in 97-selftest.js. They run only when `/[?&]selftest\b/` matches `location.search`, and log `SELFTEST PASS n` or `SELFTEST FAIL name: msg` to the console after load (`setTimeout(...,0)`). Later tasks append tests to this file.
- Produces: `awarenessMark(u, now) -> null | {ch:'!', col:string, size:number, bar:number|null}`. Noticing returns a colour lerped from amber `rgb(255,200,60)` (alert 0) to red `rgb(255,74,58)` (alert 1), size 18, and `bar = alert`. Aggro flash returns red `#ff4a3a`, with size easing from 28 to 20 over the first 0.3 s of the 0.7 s flash, and `bar = null`. Otherwise it returns null.

- [ ] **Step 1: Write the failing tests** in `src/97-selftest.js`:
  - `awarenessMark({side:'enemy',alert:.5},10)` has `.ch === '!'` and `.bar === .5`.
  - `awarenessMark({side:'enemy',alert:0},10) === null`.
  - `awarenessMark({side:'enemy',aggroFlash:10.7},10).size === 28` (flash just started), and at `now=10.5` the size is 20.
  - `awarenessMark({side:'player',alert:1},10) === null`.
- [ ] **Step 2:** Run `sh build.sh`, open `http://localhost:8765/index.html?selftest` in the preview, and read the console. Expected: `SELFTEST FAIL` (awarenessMark is not defined).
- [ ] **Step 3:** Implement `awarenessMark` in 85-vision.js, and rewrite `drawAwareness` to draw from it (keep the shadow offset and the 24×3 bar).
- [ ] **Step 4:** Rebuild and reload `?selftest`. Expected: `SELFTEST PASS 4`. Then play normally, walk toward a higher-level mob and screenshot the amber `!` and the red pulse on aggro.
- [ ] **Step 5:** Commit: `Warning ! while monsters notice you`.

### Task 2: Settings and auto loot

**Files:**
- Modify: `src/75-loot.js` (refactor `takeLoot`, add auto loot)
- Modify: `src/00-head.html:293-298` (settings panel)
- Modify: `src/50-game.js:209` (call auto loot), `:706-710` (settings wiring)
- Test: `src/97-selftest.js`

**Interfaces:**
- Consumes: `test`, `eq` (Task 1).
- Produces:
  - `const Settings` object plus `loadSettings() -> {autoLoot:boolean, lootMinRar:number}` (merges `fetchStore('emberfall-settings')` over the defaults; null-safe) and `saveSettings()`.
  - `takeLoot(c, d, quiet) -> boolean`: the existing function with the corpse passed in instead of read from `lootOpen`. Guests add `d.id` to `Loot.pending` (a `Set`) when sending.
  - `autoLootPick(loot, minRar, bagFree, pending) -> {take:Drop[], blocked:boolean}`. It takes all gold, sup and mat drops, plus items with `item.rar >= minRar` while `bagFree > 0` (counting down), and skips drops whose `id` is in `pending`. `blocked` is true if an eligible item didn't fit.
  - `autoLootTick(dt)`: runs every 0.25 s when `Settings.autoLoot` is on and the player is alive, not flying, not in a shop and not paused. It sweeps `corpsesOf(zone)` within `LOOT_REACH`, calls `takeLoot` for each pick (quiet), and shows one toast per sweep listing up to 4 labels, then "+N more" (`lootLabel`). If `blocked`, it toasts "Your bag is full" at most once per 10 s. It re-renders loot and inventory if they're open, then calls `save()`.

- [ ] **Step 1: Write the failing tests:**
  - With loot `[gold 5, mat, item rar 0, item rar 2]`, minRar 1 and bagFree 5, `take` contains gold, mat and the rar-2 item (3 drops), and `blocked` is false.
  - The same loot with bagFree 0: `take` has 2 drops (gold and mat), and `blocked` is true.
  - A pending set containing the gold's id: the gold is excluded.
  - `loadSettings()` with `localStorage` holding nothing returns `{autoLoot:false, lootMinRar:1}`.
- [ ] **Step 2:** Rebuild and run `?selftest`. Expected: FAIL on `autoLootPick`.
- [ ] **Step 3:** Implement the functions above, and update the existing callers of `takeLoot` (`takeAll`, the row click in `renderLoot`) to pass the corpse. Add the panel rows to the settings panel: `<label class="set"><span>Auto loot</span><input type="checkbox" id="setAutoLoot"></label>`, and a `<select id="setLootRar">` with the five `RAR` names, labelled "Auto loot items of at least". Populate them in the `id==='settings'` branch at 50-game.js:706, and save on change. Clear `Loot.pending` entries when the host's `got` arrives or the corpse sync no longer has that drop.
- [ ] **Step 4:** Rebuild and run `?selftest`. Expected: `SELFTEST PASS 8`. Then in the browser: turn auto loot on with Magic, kill mobs and walk over them. Check the toast, that Common items stay on the corpse, and the full-bag case (fill the bag via the console, `players[0].bag.length=players[0].bagSize`).
- [ ] **Step 5:** Two tabs, `?nettest=a` and `?nettest=b`, in a party. The guest has auto loot on and the host off. Kill a pack. The guest gets the loot once with no duplicates (check the host's console for errors). Commit: `Auto loot setting with rarity filter (solo and co-op)`.

### Task 3: Area loot window

**Files:**
- Modify: `src/75-loot.js` (`openLoot`, `closeLoot`, `renderLoot`, `takeAll`, `updateCorpses`)
- Modify: `src/96-net.js:117,167` (re-render after `got` and corpse sync)
- Modify: `src/00-head.html` (CSS for a group header `.lgroup` in the loot panel)
- Test: `src/97-selftest.js`

**Interfaces:**
- Consumes: `takeLoot(c,d,quiet)` (Task 2).
- Produces:
  - `lootOpen` becomes `null | {ids:number[]}`, the corpse ids in the window.
  - `corpsesInReach(p, corpses) -> Corpse[]`: lootable corpses with `dist(p,c) <= LOOT_REACH`, nearest first.
  - `lootGroupsRefresh(ids, corpses, p) -> number[]`: keeps the ids still present, lootable and within `LOOT_REACH + 60`. The window closes when this is empty.
  - `openLoot(c)`: if `c` is in reach, it opens with `corpsesInReach(p, corpsesOf(zone))`, which always includes `c`.
  - `renderLoot()`: one `.lgroup` header (corpse name) per corpse, then its rows. The title is "Loot" when there's more than one corpse, or the corpse name when there's one.
  - `takeAll()`: takes every drop of every listed corpse.
- Every place that compared `lootOpen === c` or read `lootOpen.id` (src/96-net.js:117,167, `updateCorpses`) now uses `lootOpen.ids.includes(c.id)` and `lootGroupsRefresh`.

- [ ] **Step 1: Write the failing tests:**
  - `corpsesInReach({x:0,y:0}, [{x:100,y:0,loot:[1]},{x:300,y:0,loot:[1]},{x:50,y:0,loot:[1]},{x:20,y:0,loot:[]}])` returns the 50 then the 100 corpse (length 2).
  - `lootGroupsRefresh([1,2,3], [{id:1,x:0,y:0,loot:[1]},{id:3,x:0,y:0,loot:[]}], {x:0,y:0})` equals `[1]`.
- [ ] **Step 2:** Rebuild and run `?selftest`. Expected: FAIL on `corpsesInReach`.
- [ ] **Step 3:** Implement as above.
- [ ] **Step 4:** Rebuild and run `?selftest`. Expected: `SELFTEST PASS 10`. In the browser: kill 3 mobs close together, click one corpse, and check that the window shows 3 groups. Take one row; Take all empties all of them and closes the window. Escape closes it, and so does walking away. Screenshot.
- [ ] **Step 5:** Two-tab co-op: the guest opens area loot over 2 corpses and takes all. The host's corpses empty and the guest's window closes. Commit: `Loot window shows every corpse in reach`.

### Task 4: Wrap-up
- [ ] Update the How to play text (src/00-head.html, the howto panel) with one sentence on area loot and the auto loot setting.
- [ ] Rebuild, run a short normal play session with no `?selftest`, and check the console for errors.
- [ ] Update the memory hub `project-rpg-game.md`: Delivery A done, with its milestone ticked.
- [ ] Commit: `v9 A: quick wins done`. Ask Anders whether to push (publish) now.

---

Deliveries B (new look) and C (skills, keys, balance) get their own plans after Anders has played A.
