// ─────────────────────────────────────────────────────────────────────────────
// Catàleg curat d'icones de menjar/beguda (lucide-react) per al selector d'icones.
//
// Cada entrada té una clau estable (la que es desa a `ItemObject.icon`), el component
// lucide i un conjunt de paraules clau en català + anglès per a la cerca. Les claus NO
// s'han de canviar mai un cop publicades (es desen als esdeveniments).
// ─────────────────────────────────────────────────────────────────────────────
import {
  Apple,
  Banana,
  Cherry,
  Grape,
  Carrot,
  Citrus,
  LeafyGreen,
  Sprout,
  Bean,
  Nut,
  Wheat,
  Egg,
  EggFried,
  Fish,
  Shrimp,
  Beef,
  Ham,
  Drumstick,
  Bird,
  Milk,
  Croissant,
  Cookie,
  Cake,
  CakeSlice,
  Donut,
  Candy,
  CandyCane,
  Lollipop,
  Popcorn,
  IceCream,
  IceCreamCone,
  Pizza,
  Sandwich,
  Hamburger,
  Soup,
  Salad,
  CookingPot,
  Coffee,
  CupSoda,
  GlassWater,
  Wine,
  Beer,
  Martini,
  Utensils,
  UtensilsCrossed,
  Vegan,
  type LucideIcon,
} from 'lucide-react';

export interface FoodIconEntry {
  key: string;
  Icon: LucideIcon;
  keywords: string[];
}

/** Llista ordenada d'icones disponibles al selector. */
export const FOOD_ICONS: FoodIconEntry[] = [
  // Fruita i verdura
  { key: 'apple', Icon: Apple, keywords: ['poma', 'fruita', 'apple', 'fruit'] },
  { key: 'banana', Icon: Banana, keywords: ['plàtan', 'platan', 'banana'] },
  { key: 'cherry', Icon: Cherry, keywords: ['cirera', 'cireres', 'cherry'] },
  { key: 'grape', Icon: Grape, keywords: ['raïm', 'raim', 'grape', 'grapes', 'vi', 'wine'] },
  { key: 'carrot', Icon: Carrot, keywords: ['pastanaga', 'verdura', 'carrot', 'vegetable'] },
  { key: 'citrus', Icon: Citrus, keywords: ['cítric', 'citric', 'taronja', 'llimona', 'citrus', 'orange', 'lemon'] },
  { key: 'leafy', Icon: LeafyGreen, keywords: ['enciam', 'verdura', 'fulla', 'lettuce', 'greens', 'vegetable'] },
  { key: 'sprout', Icon: Sprout, keywords: ['brot', 'germinat', 'planta', 'sprout', 'herb'] },
  { key: 'bean', Icon: Bean, keywords: ['mongeta', 'llegum', 'fesol', 'bean', 'legume'] },
  { key: 'nut', Icon: Nut, keywords: ['fruit sec', 'nou', 'ametlla', 'nut', 'nuts'] },
  { key: 'wheat', Icon: Wheat, keywords: ['blat', 'cereal', 'gra', 'wheat', 'grain', 'flour', 'farina'] },
  // Proteïna
  { key: 'egg', Icon: Egg, keywords: ['ou', 'ous', 'egg', 'eggs'] },
  { key: 'eggFried', Icon: EggFried, keywords: ['ou ferrat', 'esmorzar', 'fried egg', 'breakfast'] },
  { key: 'fish', Icon: Fish, keywords: ['peix', 'fish', 'pescat'] },
  { key: 'shrimp', Icon: Shrimp, keywords: ['gamba', 'marisc', 'shrimp', 'prawn', 'seafood'] },
  { key: 'beef', Icon: Beef, keywords: ['carn', 'vedella', 'bistec', 'beef', 'meat', 'steak'] },
  { key: 'ham', Icon: Ham, keywords: ['pernil', 'cuixa', 'ham', 'pork'] },
  { key: 'drumstick', Icon: Drumstick, keywords: ['pollastre', 'cuixa', 'chicken', 'drumstick', 'poultry'] },
  { key: 'bird', Icon: Bird, keywords: ['au', 'pollastre', 'ocell', 'bird', 'poultry'] },
  { key: 'milk', Icon: Milk, keywords: ['llet', 'làctic', 'lactic', 'milk', 'dairy'] },
  // Pa, dolços i snacks
  { key: 'croissant', Icon: Croissant, keywords: ['croissant', 'brioix', 'esmorzar', 'pastís', 'breakfast', 'pastry'] },
  { key: 'cookie', Icon: Cookie, keywords: ['galeta', 'cookie', 'snack', 'picar'] },
  { key: 'cake', Icon: Cake, keywords: ['pastís', 'pastis', 'aniversari', 'cake', 'dessert', 'postre'] },
  { key: 'cakeSlice', Icon: CakeSlice, keywords: ['tros pastís', 'postre', 'cake', 'dessert'] },
  { key: 'donut', Icon: Donut, keywords: ['donut', 'rosquilla', 'dolç', 'dolc', 'sweet'] },
  { key: 'candy', Icon: Candy, keywords: ['caramel', 'llaminadura', 'candy', 'sweet', 'dolç'] },
  { key: 'candyCane', Icon: CandyCane, keywords: ['bastó caramel', 'nadal', 'candy cane', 'sweet'] },
  { key: 'lollipop', Icon: Lollipop, keywords: ['piruleta', 'caramel', 'lollipop', 'sweet'] },
  { key: 'popcorn', Icon: Popcorn, keywords: ['crispetes', 'pop corn', 'popcorn', 'snack', 'picar'] },
  { key: 'iceCream', Icon: IceCream, keywords: ['gelat', 'ice cream', 'postre', 'dessert'] },
  { key: 'iceCreamCone', Icon: IceCreamCone, keywords: ['gelat con', 'ice cream', 'cornet', 'dessert'] },
  // Plats preparats
  { key: 'pizza', Icon: Pizza, keywords: ['pizza', 'plat'] },
  { key: 'sandwich', Icon: Sandwich, keywords: ['entrepà', 'entrepa', 'sandwich', 'badall'] },
  { key: 'hamburger', Icon: Hamburger, keywords: ['hamburguesa', 'burger', 'hamburger'] },
  { key: 'soup', Icon: Soup, keywords: ['sopa', 'brou', 'soup', 'broth'] },
  { key: 'salad', Icon: Salad, keywords: ['amanida', 'enciam', 'salad', 'vegetal'] },
  { key: 'cookingPot', Icon: CookingPot, keywords: ['olla', 'guisat', 'cassola', 'pot', 'stew'] },
  // Begudes
  { key: 'coffee', Icon: Coffee, keywords: ['cafè', 'cafe', 'te', 'coffee', 'tea', 'beguda'] },
  { key: 'cupSoda', Icon: CupSoda, keywords: ['refresc', 'soda', 'beguda', 'drink', 'soft drink'] },
  { key: 'water', Icon: GlassWater, keywords: ['aigua', 'got', 'water', 'beguda', 'drink'] },
  { key: 'wine', Icon: Wine, keywords: ['vi', 'copa', 'wine', 'beguda'] },
  { key: 'beer', Icon: Beer, keywords: ['cervesa', 'beer', 'beguda'] },
  { key: 'martini', Icon: Martini, keywords: ['còctel', 'coctel', 'cocktail', 'martini', 'beguda'] },
  // Genèric
  { key: 'utensils', Icon: Utensils, keywords: ['coberts', 'menjar', 'plat', 'utensils', 'food', 'meal'] },
  { key: 'utensilsCrossed', Icon: UtensilsCrossed, keywords: ['coberts', 'menjar', 'restaurant', 'food'] },
  { key: 'vegan', Icon: Vegan, keywords: ['vegà', 'vega', 'vegetal', 'vegan', 'veggie'] },
];

/** Cerca ràpida clau → entrada (per renderitzar la icona d'un objecte). */
const BY_KEY = new Map(FOOD_ICONS.map((e) => [e.key, e]));

export function findFoodIcon(key: string | undefined): FoodIconEntry | undefined {
  return key ? BY_KEY.get(key) : undefined;
}

/** Filtra el catàleg per una consulta (paraules clau, accent-insensible). */
export function searchFoodIcons(query: string): FoodIconEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return FOOD_ICONS;
  // Treu els diacrítics combinants (rang Unicode ̀–ͯ) per cercar sense accents.
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const nq = norm(q);
  return FOOD_ICONS.filter(
    (e) =>
      e.key.includes(nq) ||
      e.keywords.some((k) => norm(k).includes(nq)),
  );
}
