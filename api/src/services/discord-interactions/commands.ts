// Discord ApplicationCommandOptionType values
const STRING = 3
const USER = 6

export const COMMAND_NAMES = ['item', 'price', 'builds'] as const
export type CommandName = (typeof COMMAND_NAMES)[number]

export const CLASS_CHOICES = [
  { name: 'Archer', value: 'archer' },
  { name: 'Warrior', value: 'warrior' },
  { name: 'Mage', value: 'mage' },
  { name: 'Assassin', value: 'assassin' },
  { name: 'Shaman', value: 'shaman' },
] as const

export const COMMANDS = [
  {
    name: 'item',
    description: 'Look up a Wynncraft item',
    options: [
      { name: 'name', description: 'Item name', type: STRING, required: true, autocomplete: true },
    ],
  },
  {
    name: 'price',
    description: 'Show market price for an item',
    options: [
      { name: 'item', description: 'Item name', type: STRING, required: true, autocomplete: true },
    ],
  },
  {
    name: 'builds',
    description: 'Search public saved builds (at least one filter required)',
    options: [
      { name: 'user', description: 'Discord user who saved the build', type: USER, required: false },
      { name: 'class', description: 'Class', type: STRING, required: false, choices: CLASS_CHOICES },
      { name: 'item', description: 'Item used in the build', type: STRING, required: false, autocomplete: true },
      { name: 'name', description: 'Search build titles (case-insensitive)', type: STRING, required: false },
    ],
  },
] as const
