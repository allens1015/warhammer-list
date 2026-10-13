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
// What a champion or character may take; wizards add arcane items
export const MAGIC_ITEM_TYPES = ['magic_weapon', 'magic_armour', 'talisman', 'enchanted_item']
export const WIZARD_ITEM_TYPES = [...MAGIC_ITEM_TYPES, 'arcane_item']
