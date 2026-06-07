// ─────────────────────────────────────────────────────────────────────────────
// Genera un subconjunt curat de Game Icons (set complet = 6.3 MB, massa per a una
// PWA offline). Trien-se a mà els noms EXACTES de menjar, beguda, estris de cuina i
// objectes nàutics/eines que complementen lucide + Tabler.
//
// Sortida: src/features/objects/gameIconsSubset.json (artefacte versionat).
// Re-executar quan calgui afegir icones:  node scripts/build-game-icons-subset.mjs
//
// El JSON de Game Icons NO és dependència de runtime: viu a devDependencies i només
// el llegeix aquest script. El que s'envia a l'app és el subconjunt generat.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const src = resolve(root, 'node_modules/@iconify-json/game-icons/icons.json');
const out = resolve(root, 'src/features/objects/gameIconsSubset.json');

/**
 * Allowlist de noms EXACTES de Game Icons. Curada a mà: només icones de línia útils
 * per a un veler (menjar, beguda, cuina, nàutica, eines, seguretat, estiba).
 * Game-icons té noms idiosincràtics i molt soroll temàtic de videojocs → res de
 * cerca per substring, només noms verificats.
 */
const ALLOW = [
  // Peix i marisc
  'fish-cooked', 'clownfish', 'shrimp', 'crab', 'octopus', 'squid', 'oyster',
  'canned-fish', 'fish-bucket', 'fishing-pole', 'fishing-net', 'fish-scales',
  // Carn
  'meat', 'steak', 'ham-shank', 'sausage', 'bacon', 'chicken-leg', 'roast-chicken',
  'meat-cleaver', 'meat-hook', 'sausages-ribbon',
  // Ous i làctics
  'big-egg', 'raw-egg', 'egg-clutch', 'fried-eggs', 'cheese-wedge', 'milk-carton',
  'butter',
  // Cereals, farines, pasta, pa
  'wheat', 'grain', 'grain-bundle', 'flour', 'corn', 'rice-cooker', 'bowl-of-rice',
  'noodles', 'fast-noodles', 'noodle-ball', 'sliced-bread', 'bread', 'bread-slice',
  'croissant', 'dough-roller',
  // Llegums, fruita seca i llavors
  'jelly-beans', 'coffee-beans', 'beanstalk', 'peanut', 'almond', 'coconuts',
  'apple-seeds', 'plant-seed', 'seedling', 'chestnut-leaf',
  // Tubercles i verdura
  'potato', 'carrot', 'tomato', 'garlic', 'chili-pepper', 'bell-pepper',
  'mushroom', 'mushrooms', 'sliced-mushroom', 'broccoli', 'cabbage', 'beet', 'leek',
  'pumpkin',
  // Fruita
  'banana', 'banana-bunch', 'grapes', 'cherry', 'strawberry', 'raspberry', 'elderberry',
  'watermelon', 'pineapple', 'lemon', 'cut-lemon', 'orange', 'orange-slice', 'peach',
  'pear', 'avocado', 'kiwi-fruit', 'olive', 'shiny-apple', 'apple-core',
  'fruit-bowl', 'berries-bowl', 'berry-bush',
  // Condiments, espècies i bàsics de rebost
  'salt-shaker', 'herbs-bundle', 'cool-spices', 'hot-spices', 'powder', 'powder-bag',
  'sugar-cane', 'oil-can', 'saucepan', 'dripping-honey', 'honeycomb',
  // Dolços
  'cupcake', 'donut', 'cookie', 'pie-slice', 'chocolate-bar', 'ice-cream-cone',
  'ice-cream-scoop', 'candy-canes', 'spiral-lollipop', 'cake-slice',
  // Peix i carn (ingredient cru)
  'fish-eggs', 'sliced-sausage', 'manual-meat-grinder',
  // Plats preparats
  'pizza-slice', 'sandwich', 'hamburger', 'hot-dog', 'sushis', 'cooking-pot',
  'camp-cooking-pot', 'cauldron', 'french-fries', 'doner-kebab', 'bubbling-bowl',
  // Pots, conserves i recipients
  'honey-jar', 'mason-jar', 'covered-jar', 'cloth-jar', 'opened-food-can', 'canned-fish',
  'cannister', 'soda-can', 'oil-drum', 'barrel', 'cellar-barrels', 'water-gallon',
  'waterskin', 'water-flask', 'round-bottom-flask',
  // Sacs i bosses
  'knapsack', 'fertilizer-bag', 'powder-bag', 'paper-bag-folded', 'paper-bag-open',
  'chips-bag', 'shopping-bag',
  // Beguda
  'beer-bottle', 'beer-stein', 'wine-bottle', 'wine-glass', 'water-bottle', 'baby-bottle',
  'brandy-bottle', 'sake-bottle', 'soda-bottle', 'coffee-cup', 'coffee-mug', 'coffee-pot',
  'teapot', 'moka-pot', 'martini', 'champagne-cork',
  // Estris de cuina
  'spoon', 'fork-knife-spoon', 'knife-fork', 'ladle', 'whisk', 'cooking-glove',
  'kitchen-scale', 'bowl-spiral',
  // Nàutica
  'anchor', 'cargo-ship', 'sailboat', 'small-fishing-sailboat', 'shooner-sailboat',
  'sail', 'paddles', 'paddle-steamer', 'compass', 'life-buoy', 'buoy', 'ship-wheel',
  'lighthouse', 'harbor-dock', 'cargo-crate', 'life-jacket', 'fishing-hook',
  'boat-fishing', 'boat-horizon',
  // Eines
  'wrench', 'monkey-wrench', 'claw-hammer', 'screwdriver', 'hand-saw', 'crosscut-saw',
  'chainsaw', 'drill', 'toolbox', 'gears', 'cog', 'spanner', 'metal-bar', 'screw',
  'metal-plate', 'triple-plier', 'flat-platform', 'wood-beam',
  // Combustible, energia, seguretat
  'car-battery', 'fuel-tank', 'gas-pump', 'oil-drum', 'jerrycan', 'gas-stove',
  'flashlight', 'light-bulb', 'fire-extinguisher', 'first-aid-kit', 'medicines',
  'pill', 'bandage-roll', 'syringe', 'matchbox', 'lighter', 'candle-holder',
  'lantern-flame', 'torch', 'campfire',
  // Estiba i càmping
  'cardboard-box', 'cardboard-box-closed', 'wooden-crate', 'backpack', 'duffel-bag',
  'knapsack', 'beach-bucket', 'empty-metal-bucket', 'empty-wood-bucket', 'camping-tent',
  'barracks-tent', 'treasure-map', 'binoculars', 'walkie-talkie', 'gps',
  'locked-chest', 'open-chest',
];

const gi = JSON.parse(readFileSync(src, 'utf8'));
const subset = {
  prefix: gi.prefix,
  lastModified: gi.lastModified,
  width: gi.width,
  height: gi.height,
  icons: {},
};

const missing = [];
for (const name of ALLOW) {
  if (gi.icons[name]) subset.icons[name] = gi.icons[name];
  else missing.push(name);
}

writeFileSync(out, JSON.stringify(subset));
const kept = Object.keys(subset.icons).length;
const bytes = Buffer.byteLength(JSON.stringify(subset));
console.log(`game-icons subset: ${kept} icones, ${(bytes / 1024).toFixed(0)} KB raw → ${out}`);
if (missing.length) console.warn(`AVÍS: ${missing.length} noms inexistents (revisa l'allowlist): ${missing.join(', ')}`);
