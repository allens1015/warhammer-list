export const CATEGORY_ORDER = ['lord', 'hero', 'core', 'special', 'rare']
export const CATEGORY_LABELS = {
  lord: 'Lords', hero: 'Heroes', core: 'Core',
  special: 'Special', rare: 'Rare',
}
export const ROLE_LABELS = { champion: 'Champion', musician: 'Musician', standard: 'Standard Bearer' }

export const MAGIC_TYPE_LABELS = {
  magic_weapon: 'Magic Weapons', magic_armour: 'Magic Armour', talisman: 'Talismans',
  arcane_item: 'Arcane Items', enchanted_item: 'Enchanted Items',
  magic_standard: 'Magic Standards', gifts_of_khaine: 'Gifts of Khaine',
}
// Champions are not wizards, so no arcane items
export const CHAMPION_ITEM_TYPES = ['magic_weapon', 'magic_armour', 'talisman', 'enchanted_item']
