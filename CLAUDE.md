# Warhammer List — Project Context

List building tool for Warhammer Fantasy 7th edition. User picks an army and a points cap, then adds discrete units under Lords / Heroes / Core / Special / Rare headers. Each added unit is its own row (no stacking) and will become individually editable.

Forked in spirit from `../warhammer-draft` (same stack, shell, design tokens, and starting data). The draft mechanics — cards, draw pool, tier weights — are gone and should not come back.

**Tech stack:** Vue 3 Composition API + Vite + Tailwind CSS v4 (`@tailwindcss/vite`, no postcss config). `lucide-vue-next` for icons. Unit data comes from local JSON files; the only backend is Firebase (Google sign-in + Firestore) for saved lists.

**Design:** Tailwind design tokens as CSS custom properties in `src/style.css`. Visually minimal by intent: settings row, composition row, list.

**Keep it simple.** No overengineering. Dark Elves is the reference army and data template; Skaven rides along as long as its data stays correct.

---

## File Layout

| File | Role |
|---|---|
| `src/composables/listConfig.js` | Static config: `CATEGORY_ORDER`, `CATEGORY_LABELS`, `ROLE_LABELS`, `MAGIC_TYPE_LABELS`, `MAGIC_ITEM_TYPES`, `WIZARD_ITEM_TYPES` |
| `src/composables/useList.js` | All state and logic: army selection, `armyList`, points, slots, `available`, `listJson`, `add` / `resize` / `toggleCommand` / `toggleOption` / `selectItem` / `removeItem` / `setGeneral` / `duplicate` / `remove` / `reset` / `switchArmy` / `snapshot` / `load` |
| `src/composables/useSavedLists.js` | Saved lists: `savedLists`, `currentId`, `listName`, `dirty`, `error`, `save` / `open` / `newList` / `removeSaved`. Knows nothing about Warhammer or Firebase; it is handed `snapshot`, `load`, `reset`, the `user` ref and the two stores. |
| `src/composables/savedListStores.js` | `localStore(key)` and `cloudStore(uid, collection)`. A store is `{ list(), put(saved), remove(id) }`, all async. |
| `src/composables/useAuth.js` | Google sign-in (popup): `user` (`{ uid, name }` or null), `authError`, `signIn`, `signOut`. Module-level singleton. |
| `src/firebase.js` | Firebase init; exports `auth` and `db`. Holds the public web config. |
| `firestore.rules` | Copy of the rules published in the Firebase console. |
| `src/App.vue` | Root shell. Calls `useList()`, passes state down. |
| `src/components/SavedLists.vue` | Saved-list dropdown ("New list" + saved lists), name field, Save, Delete, "Unsaved changes" / error note, sign-in / sign-out. |
| `src/components/SettingsPanel.vue` | Army dropdown, points cap, composition counts, Reset button. |
| `src/components/ArmyList.vue` | Points total, Copy List (plain text), one section per category with a plus button that opens the add-unit menu. |
| `src/components/ArmyListItem.vue` | One unit row: size input (multi-model units), name, cost, tooltip, General checkbox, duplicate and remove buttons, plus a line of command/option toggle chips. |
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
| `giftsOfKhaine`, `magicItems` | number / object | Points allowance for Gifts of Khaine / magic items, on a unit (characters, Assassin) or on a champion `command` entry ("Hag only", "Dread Knight only"). Opens a magic item slot. Unit-level `magicItems` may instead be `{ types, allowance? }` to narrow the item types and/or drop the points limit (Morathi: one arcane and/or one enchanted item). |
| `wizard` | boolean | Character may take arcane items. |
| `leadership` | number | Lords and heroes. Used only for the General warning. |
| `canBeGeneral` | boolean | `false` on a lord/hero who can't be the General (Shadowblade). Lords and heroes are eligible by default; nothing else is. |
| `generalMakesCore` | array | Unit names that become Core while this character is the General (Hellebron → Witch Elves). |
| `stackable` | boolean | Magic items. May be taken several times by one model and sits outside the one-per-type rule (Dispel Scroll, Power Stone). User-confirmed. |
| `onFootOnly` | boolean | Magic items. Not offered to, and dropped from, a model with a `Mount` option selected. |
| `countsAs` | string | Gifts of Khaine that are also a magic item type (Venom Sword, Cloak of Twilight). **Not used yet.** |
| `description` | string | Rules text, rendered as HTML (`v-html`) in tooltips |
| `repeatable` | boolean | `false` = unique; greyed out in the add menu once in the list |
| `command` | array | `[{ role, pointsCost, name?, repeatable?, magicStandard? }]`. `role` is `champion`, `musician` or `standard`. Flat cost; unit size unchanged. Entries sharing a role are pick-one (e.g. a named character replacing the champion); `repeatable: false` makes one unique across the army. `pointsCost` is the full price of that entry. `magicStandard` is the banner allowance: it opens a magic item slot when that entry is selected. |
| `options` | array | `[{ name, pointsCost, perModel?, group?, required?, requires?, onePerArmy?, extraHeroSlots?, battleStandard? }]`. `perModel: true` multiplies by unit size, otherwise a one-off cost. Options sharing a `group` are pick-one and render as one dropdown labelled with the group name (`Mount`, `Close Combat Weapon`, `Armour`...); ungrouped options render as chips. `required: true` on a group's options means it can't be empty and starts on its first option (Morathi's magic weapon). `requires: "champion"` locks the option until a command entry of that role is selected. `onePerArmy` limits the option to one entry in the list. `extraHeroSlots` is added to the Characters count (Black Dragon; Manticore for a Master). `battleStandard` opens the battle standard's magic banner slot. The group name `Mount` is what marks a model as mounted. Cost 0 shows as "free". |
| `maxPerSlot` | number | How many of this unit share one Special/Rare choice (Reaper Bolt Thrower: 2). |
| `mounts`, `choices`, `slotsUsed` | | Draft-era fields. Removed from Dark Elves; still present and unused on Skaven units (prices there are for the old draft blocks). |

Magic items live in the same JSON (`category: "magic"`). They are one per army unless `repeatable: true`.

## Magic Item Slots

`itemSlots(unit, entry)` in `useList.js` returns the allowances an entry currently has open. A slot is `{ key, label, types, allowance?, holders, single?, onePerType?, excludes? }`: which item types it accepts, the points total it may hold (none = unlimited), who holds it, and which other slots must be empty for it to hold anything.

| Slot key | Opened by | Accepts | Rule |
|---|---|---|---|
| `standard` | selected command entry with `magicStandard` | `magic_standard` | `single` |
| `items` | unit-level `magicItems` (characters) | `MAGIC_ITEM_TYPES`, or `WIZARD_ITEM_TYPES` (adds arcane) when `wizard`, or the types given | `onePerType`; excludes `battleStandard` |
| `battleStandard` | selected option with `battleStandard` | `magic_standard`, any cost | `single`; excludes `items` |
| `championItems` | selected champion with `magicItems` | `MAGIC_ITEM_TYPES` (no arcane, champions aren't wizards) | `onePerType` |
| `championGifts` | selected champion with `giftsOfKhaine` | `gifts_of_khaine` | any number of different gifts |
| `gifts` | unit-level `giftsOfKhaine` (Assassin) | `gifts_of_khaine` | any number of different gifts |

Shared rules: the slot's total may not exceed its allowance; an item is one per army unless `repeatable: true`; `onlyFor` is matched against the slot's `holders` (unit name, plus the champion's name for champion slots). Picking an item replaces whatever it conflicts with (everything in a `single` slot, the same type in a `onePerType` slot) and is refused if the result would be over the allowance.

Selections are stored as `entry.items[slotKey] = [names]` via `selectItem` / `removeItem`. `pruneItems` runs after every command/option toggle and drops anything the entry can no longer hold (slot closed, mount taken with an on-foot-only item). The row renders a `<select>` for a `single` slot, and removable chips plus an "Add…" `<select>` (grouped by item type when the slot takes several) for the others.

User-confirmed rules: one magic item of each type per model; Gifts of Khaine are not held to that (several different gifts allowed); champions can't take arcane items. `stackable` items repeat in `entry.items[slotKey]` (one name per copy), don't replace anything and aren't replaced; `removeItem` removes one copy. Not handled yet: the battle standard note that a Death Hag with a magic banner can't take gifts that are also magic items (`countsAs`; moot today since neither such gift is available to her). Skaven data uses a stray `arcane` type on three items instead of `arcane_item`.

---

## List Entries

`armyList` entries hold selections only: `{ id, name, count, command: [keys], options: [names], items: { slotKey: [names] } }`, plus `generalId` alongside the list (a command key is the entry's `name`, or its `role` when unnamed). `resolvedList` joins each entry with its unit data and derives the cost, which is never stored:

`count * (pointsCost + selected perModel options) + selected flat options + selected command + selected magic items`

`listJson` (the render source) has one section per category, always present, built from `resolvedList`. `listText` turns it into the plain-text export behind the Copy List button (the earlier Copy JSON button was dropped at the user's request). 

## Saving

`snapshot()` in `useList.js` is the save format: `{ army, pointsCap, general, entries }`. `entries` are `armyList` entries without ids; `general` is the General's index into `entries` (ids are regenerated on load). `load(saved)` replaces the current list: it drops units, command keys, options and items the data no longer has, clamps sizes, and runs `pruneItems` on every entry. It does not re-check allowances or one-per-army limits.

A saved list is `{ id, name, updatedAt, list }`, where `list` is a snapshot. Saving is explicit (Save button): it overwrites the open list, or creates one when "New list" is selected. Opening another list or "New list" discards unsaved changes without asking; deleting a saved list asks first and leaves the units on screen.

**Where lists live:** signed out, in local storage under `warhammer-list:lists`. Signed in, in Firestore at `users/<uid>/warhammer-lists/<list id>` (one document per list, the saved object as-is). On sign-in, `useSavedLists` moves this browser's local lists into the account and clears them locally. On sign-out the account's lists leave the dropdown and whatever is on screen stays as an unsaved list. Lists are fetched once per sign-in (`firebase/firestore/lite`, chosen for bundle size: no realtime updates, no offline cache), so another device's changes show up on reload. A failed load, save or delete sets `error` and changes nothing.

**Format changes:** saved lists are not versioned or migrated (user's choice: an old list may lose parts or stop loading, and gets deleted). `load` drops what it doesn't recognise and the row then shows "Unsaved changes". A list `load` rejects or throws on still becomes the open one, with an empty screen and "This list couldn't be opened.", so that Delete works on it.

**Firebase project:** `rpgbookshelf` (ID `rpgbookshelf-dc8f8`), free Spark plan, Firestore in `nam5`, Google the only sign-in provider. Chosen by the user over Supabase because the tool is used about once a month and Supabase pauses idle free projects. It is a site-level project: another rpgbookshelf tool can register its own web app, reuse `useAuth.js` / `savedListStores.js`, and keep its data in its own collection under `users/<uid>/`, with no rules change. The rules (`firestore.rules`) give a signed-in user their own `users/<uid>/` area and nothing else. They deliberately don't validate the shape of what is written: that was drafted and dropped as overkill (2026-10-13), since stored data is never executed, a user only reads back their own, `load` discards anything it doesn't recognise, and shape rules would have to be republished with every format change. Every hostname the app is served from must be in the console's authorised domains (Authentication → Settings) or sign-in fails with `auth/unauthorized-domain`. Analytics is not used. Google's sign-in popup shows the Firebase domain (`rpgbookshelf-dc8f8.firebaseapp.com`) rather than "RPG Bookshelf" because the app's branding isn't verified; that needs a home page and privacy policy on a domain the user owns, so it waits until the site is live on a custom domain (today it runs only on Pantheon dev and DDEV). The web config in `src/firebase.js` is public by design; a service account key must never be committed.

---

## Composition

Brackets come from `settings.json` (by points cap): min core, max special, rare, characters, lords. The `slots` computed counts choices used; it is display only, nothing is enforced or highlighted yet.

- Lords: one per lord entry.
- Characters: lords + heroes + `extraHeroSlots` of selected options (book: a model on a Black Dragon, or a Master on a Manticore, takes one additional Hero choice).
- Core: entries with `countsAsCore` not `false` (Harpies and the Assassin don't count; the Assassin also isn't a character).
- Special / Rare: per unit name, `ceil(entries / maxPerSlot)`.

`minCore` values (2/3/4/5) are user-confirmed.

**General:** `generalId` in `useList.js` holds the entry id of the General (one per army, optional, cleared when that entry is removed). Eligible rows show a "General" checkbox. `categoryOf(unit)` applies `generalMakesCore`, so affected units move to the Core section, the Core add menu and the Core count. If another eligible character in the list has a higher `leadership`, the General's row shows a red warning naming them; the pick is still allowed (user's choice: warn, don't block). Characters without `leadership` (all of Skaven) never trigger it.

**Over the limit:** the points total turns red when it exceeds the cap (user's choice: highlight, don't block). Composition counts are not highlighted yet.

---

## Roadmap

1. Dark Elves is fully transcribed from the 7th ed army list pages the user supplied (gitignored PNGs in `src/data/`, `darkelves1`–`9`): core, special, lords, heroes, rare. Named characters' fixed equipment and rules were not written into `description`. The Assassin stays a standalone Core row by the user's decision (the book's one-per-infantry-unit limit is not modelled).
2. Composition validation: highlight counts that break a limit (user has only asked for the points total so far). Named characters' gear in descriptions is deliberately left out for now.
3. Persistence is built (see Saving): local storage plus Google sign-in and Firestore. The user confirmed Google sign-in works on DDEV (2026-10-13).
4. Skaven: bring its data up to the same format (its characters still carry draft `mounts`/`choices`), plus attachments that add a model (Packmaster, weapon teams).
5. Stretch: importing a warhammer-draft export was scoped and shelved as more trouble than it's worth; draft-style features may be added to this app instead.

Known data oddities in `skaven.json`: `Weapon Teams (pick one)` costs 0, and `Giant Rats` base cost (3/model) disagrees with its own `choices` base (35).

---

## Deployment: Drupal 10 Portfolio (Pantheon)

Embedded in the `rpgbookshelf` Drupal site as one of several Vue tools. Drupal is a page shell only. In `web/modules/custom/rpgbookshelf_tools/`, the `vue_app` field formatter renders `<div id="app"></div>` and attaches the library named by the field value; each tool needs an entry in `rpgbookshelf_tools.libraries.yml` pointing at `tools/<tool>/assets/main.js` and `index.css`.

`vite.config.js` pins output names (`assets/main.js`, `assets/index.css`) and reads `VITE_BASE_URL`. `./deploy-local.sh` builds with the module base path and copies `dist/assets/` to `tools/warhammer-list/assets/`. Local dev is just `npm run dev`.
