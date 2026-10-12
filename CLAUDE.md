# Warhammer List — Project Context

List building tool for Warhammer Fantasy 7th edition. User picks an army and a points cap, then adds discrete units under Lords / Heroes / Core / Special / Rare headers. Each added unit is its own row (no stacking) and will become individually editable.

Forked in spirit from `../warhammer-draft` (same stack, shell, design tokens, and starting data). The draft mechanics — cards, draw pool, tier weights — are gone and should not come back.

**Tech stack:** Vue 3 Composition API + Vite + Tailwind CSS v4 (`@tailwindcss/vite`, no postcss config). `lucide-vue-next` for icons. No backend — all data from local JSON files.

**Design:** Tailwind design tokens as CSS custom properties in `src/style.css`. Visually minimal by intent: settings row, composition row, list.

**Keep it simple.** No overengineering. Dark Elves is the reference army and data template; Skaven rides along as long as its data stays correct.

---

## File Layout

| File | Role |
|---|---|
| `src/composables/listConfig.js` | Static config: `CATEGORY_ORDER`, `CATEGORY_LABELS`, `ROLE_LABELS`, `MAGIC_TYPE_LABELS`, `CHAMPION_ITEM_TYPES` |
| `src/composables/useList.js` | All state and logic: army selection, `armyList`, points, slots, `available`, `listJson`, `add` / `resize` / `toggleCommand` / `toggleOption` / `selectItem` / `removeItem` / `remove` / `reset` / `switchArmy` |
| `src/App.vue` | Root shell. Calls `useList()`, passes state down. |
| `src/components/SettingsPanel.vue` | Army dropdown, points cap, composition counts, Reset button. |
| `src/components/ArmyList.vue` | Points total, Copy JSON, one section per category with a plus button that opens the add-unit menu. |
| `src/components/ArmyListItem.vue` | One unit row: size input (multi-model units), name, cost, tooltip, remove, plus a line of command/option toggle chips. |
| `src/data/dark-elves.json`, `skaven.json` | Unit data. |
| `src/data/settings.json` | Composition brackets, default points cap. |
| `deploy-local.sh` | Build and copy assets into the local Drupal module. |

---

## Unit Data Fields

| Field | Type | Notes |
|---|---|---|
| `name` | string | Display name |
| `category` | string | `lord`, `hero`, `core`, `special`, `rare`, `magic` |
| `type` | string | `model` for non-magic. Magic subtypes: `magic_weapon`, `magic_armour`, `talisman`, `arcane_item`, `enchanted_item`, `magic_standard`, `gifts_of_khaine` |
| `pointsCost` | number | **Cost per model.** (In warhammer-draft this was the cost of the whole `count` block — it was divided by `count` when the data was brought over.) |
| `count` | number | Starting size when the unit is added. `count > 1` marks the unit as resizable. |
| `minSize`, `maxSize` | number | Optional book unit size limits; resize clamps to them. |
| `countsAsCore` | boolean | `false` on a Core unit that doesn't count towards the Core minimum (Harpies, Assassin). |
| `onlyFor` | array | Magic items. Names of the units or champions allowed to take it (Sea Serpent Standard → Black Ark Corsairs; Witchbrew → Hag, Death Hag; Rending Stars → Dark Elf Assassin). |
| `giftsOfKhaine`, `magicItems` | number | Points allowance for Gifts of Khaine / magic items, on a unit (Assassin) or on a champion `command` entry ("Hag only", "Dread Knight only"). Opens a magic item slot. |
| `description` | string | Rules text, rendered as HTML (`v-html`) in tooltips |
| `repeatable` | boolean | `false` = unique; greyed out in the add menu once in the list |
| `command` | array | `[{ role, pointsCost, name?, repeatable?, magicStandard? }]`. `role` is `champion`, `musician` or `standard`. Flat cost; unit size unchanged. Entries sharing a role are pick-one (e.g. a named character replacing the champion); `repeatable: false` makes one unique across the army. `pointsCost` is the full price of that entry. `magicStandard` is the banner allowance: it opens a magic item slot when that entry is selected. |
| `options` | array | `[{ name, pointsCost, perModel?, group?, requires? }]`. `perModel: true` multiplies by unit size, otherwise a one-off cost. Options sharing a `group` are pick-one. `requires: "champion"` locks the option until a command entry of that role is selected. Cost 0 shows as "free". |
| `mounts` | array | Characters. `[{ name, pointsCost, slotsUsed? }]`, full character cost per mount. **Not used yet.** |
| `choices` | array | `[{ name, pointsCost, repeatable? }]`. Draft-era variants priced for the old block size. Removed from Dark Elves core/special; still on Morathi and several Skaven units. **Not used, not converted to per-model.** |
| `slotsUsed`, `maxPerSlot` | | Draft-era composition overrides. **Not used yet.** |

Magic items live in the same JSON (`category: "magic"`). They are one per army unless `repeatable: true`.

## Magic Item Slots

`itemSlots(unit, entry)` in `useList.js` returns the allowances an entry currently has open. A slot is `{ key, label, types, allowance, holders, single?, onePerType? }`: which item types it accepts, the points total it may hold, and who holds it.

| Slot key | Opened by | Accepts | Rule |
|---|---|---|---|
| `standard` | selected command entry with `magicStandard` | `magic_standard` | `single` |
| `championItems` | selected champion with `magicItems` | `CHAMPION_ITEM_TYPES` (no arcane, champions aren't wizards) | `onePerType` |
| `championGifts` | selected champion with `giftsOfKhaine` | `gifts_of_khaine` | any number of different gifts |
| `gifts` | unit-level `giftsOfKhaine` (Assassin) | `gifts_of_khaine` | any number of different gifts |

Shared rules: the slot's total may not exceed its allowance; an item is one per army unless `repeatable: true`; `onlyFor` is matched against the slot's `holders` (unit name, plus the champion's name for champion slots). Picking an item replaces whatever it conflicts with (everything in a `single` slot, the same type in a `onePerType` slot) and is refused if the result would be over the allowance.

Selections are stored as `entry.items[slotKey] = [names]` via `selectItem` / `removeItem`, and dropped when the slot closes (e.g. the standard bearer or champion is deselected). The row renders a `<select>` for a `single` slot, and removable chips plus an "Add…" `<select>` (grouped by item type when the slot takes several) for the others.

Character magic items should be another slot source here (`onePerType`, user-confirmed rule). Not handled yet: gifts that also count as a magic item type ("Venom Sword (Magic weapon)", "Cloak of Twilight (Enchanted item…)"), "Models on foot only", and taking a repeatable item (Dispel Scroll) more than once on one model. Skaven data uses a stray `arcane` type on three items instead of `arcane_item`.

---

## List Entries

`armyList` entries hold selections only: `{ id, name, count, command: [keys], options: [names], items: { slotKey: [names] } }` (a command key is the entry's `name`, or its `role` when unnamed). `resolvedList` joins each entry with its unit data and derives the cost, which is never stored:

`count * (pointsCost + selected perModel options) + selected flat options + selected command + selected magic items`

`listJson` (the render source and Copy JSON payload) has one section per category, always present, built from `resolvedList`. `armyList` plus the army key and points cap is the natural save format.

---

## Composition

Brackets come from `settings.json` (by points cap): min core, max special, rare, characters, lords. Current slot math is a **placeholder**: one slot per entry (Core skips `countsAsCore: false` units), display only, nothing enforced. `minCore` values (2/3/4/5) were added from memory of the 7th ed rulebook and are awaiting the user's confirmation. Still to work through: `slotsUsed` (e.g. dragon mounts), `maxPerSlot` (two Reaper Bolt Throwers per rare slot), and warn vs block.

---

## Roadmap

1. Dark Elves core and special carry book sizes, command and options (transcribed from the 7th ed army list pages the user supplied as PNGs in `src/data/`). Still to do: lords, heroes, rare, all of Skaven, and attachments that add a model (Skaven Packmaster, weapon teams). The Assassin stays a standalone Core row by the user's decision (the book's one-per-infantry-unit limit is not modelled). The reference PNGs in `src/data/` are gitignored.
2. Characters: mount selection, then magic items with per-character allowances.
3. Composition math and validation.
4. Persistence (local storage or export) once the entry shape settles.

Known data oddities in `skaven.json`: `Weapon Teams (pick one)` costs 0, and `Giant Rats` base cost (3/model) disagrees with its own `choices` base (35).

---

## Deployment: Drupal 10 Portfolio (Pantheon)

Embedded in the `rpgbookshelf` Drupal site as one of several Vue tools. Drupal is a page shell only. In `web/modules/custom/rpgbookshelf_tools/`, the `vue_app` field formatter renders `<div id="app"></div>` and attaches the library named by the field value; each tool needs an entry in `rpgbookshelf_tools.libraries.yml` pointing at `tools/<tool>/assets/main.js` and `index.css`.

`vite.config.js` pins output names (`assets/main.js`, `assets/index.css`) and reads `VITE_BASE_URL`. `./deploy-local.sh` builds with the module base path and copies `dist/assets/` to `tools/warhammer-list/assets/`. Local dev is just `npm run dev`.
