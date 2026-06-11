// Data tables — all content lives here, not in logic branches.

const CROPS = {
  wheat: {
    name: 'Wheat', latin: 'FRVMENTVM',
    growDays: 1.2, flowerFrom: 0.35, flowerTo: 0.85,
    yieldItem: 'wheat', yieldN: 2, seedKey: '1',
    stalk: [212, 180, 90], bloom: [240, 220, 140],
  },
  poppy: {
    name: 'Poppy', latin: 'PAPAVER',
    growDays: 0.9, flowerFrom: 0.30, flowerTo: 1.0,
    yieldItem: 'poppy', yieldN: 2, seedKey: '2',
    stalk: [110, 150, 80], bloom: [205, 70, 60],
  },
  vine: {
    name: 'Vine', latin: 'VITIS',
    growDays: 2.0, flowerFrom: 0.30, flowerTo: 0.55,
    yieldItem: 'grapes', yieldN: 2, seedKey: '3',
    stalk: [90, 130, 70], bloom: [170, 200, 150],
  },
  goldbloom: { // hybrid — seeds only born of cross-pollination, then sowable
    name: 'Goldbloom', latin: 'FLORA AVREA',
    growDays: 1.0, flowerFrom: 0.4, flowerTo: 0.9,
    yieldItem: 'goldbloom', yieldN: 1, seedKey: '4', hybridOnly: true,
    stalk: [200, 170, 70], bloom: [255, 210, 80],
  },
};

const FISH = [
  { id: 'sardine', name: 'Sardine', weight: 62, item: 'fish' },
  { id: 'bream',   name: 'Bream',   weight: 30, item: 'fish' },
  { id: 'tuna',    name: 'Tuna',    weight: 8,  item: 'tuna' }, // rare; slack/dawn boosted
];

const ITEMS = {
  denarii:   { name: 'Denarii',   price: 1 },
  wheat:     { name: 'Wheat',     price: 3 },
  poppy:     { name: 'Poppy',     price: 4 },
  grapes:    { name: 'Grapes',    price: 8 },
  goldbloom: { name: 'Goldbloom', price: 14 },
  clam:      { name: 'Clam',      price: 3 },
  urchin:    { name: 'Urchin',    price: 5 },
  fish:      { name: 'Fish',      price: 2 },
  tuna:      { name: 'Tuna',      price: 9 },
  salt:      { name: 'Salt',      price: 4 },
  garum:     { name: 'Garum',     price: 25 },
  laurel:    { name: 'Laurel',    price: 15 },
};

const SELLABLE = ['wheat', 'poppy', 'grapes', 'goldbloom', 'clam', 'urchin',
                  'fish', 'tuna', 'salt', 'garum', 'laurel'];
