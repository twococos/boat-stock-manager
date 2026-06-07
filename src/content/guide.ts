// ─────────────────────────────────────────────────────────────────────────────
//  CONTINGUT DE LA GUIA DEL VAIXELL
// ─────────────────────────────────────────────────────────────────────────────
//
//  Aquest és l'ÚNIC fitxer que cal tocar per editar o ampliar la guia que veu la
//  tripulació. No té lògica: només dades. El renderer (src/routes/Guide.tsx) recorre
//  aquestes seccions i blocs automàticament — no cal tocar res més.
//
//  ┌── COM AFEGIR UN TEMA ───────────────────────────────────────────────────────┐
//  │ Copia un objecte de `guideSections` (de '{' a '},') i:                       │
//  │   · `id`    → identificador únic en minúscules-amb-guions (és l'àncora de     │
//  │               l'índex; ha de ser únic). Ex: 'fondejar'.                       │
//  │   · `title` → títol visible del tema. Ex: 'Fondejar'.                         │
//  │   · `icon`  → un nom de la llista GUIDE_ICONS de més avall (afegeix-ne si en  │
//  │               vols un de nou).                                                │
//  │   · `blocks`→ la llista de continguts del tema, EN ORDRE. Pots barrejar text  │
//  │               i fotos com vulguis. Tipus de bloc disponibles:                 │
//  │                                                                              │
//  │     { kind: 'paragraph', text: 'Un paràgraf curt.' }                          │
//  │     { kind: 'steps', items: ['Pas 1', 'Pas 2', 'Pas 3'] }   // numerats       │
//  │     { kind: 'list',  items: ['Una cosa', 'Una altra'] }      // amb pics       │
//  │     { kind: 'image', src: 'guide/foto.jpg', caption: 'Peu opcional' }         │
//  │     { kind: 'note',  text: 'Avís o consell destacat.' }      // caixa groga    │
//  └──────────────────────────────────────────────────────────────────────────────┘
//
//  ┌── COM AFEGIR UNA FOTO ──────────────────────────────────────────────────────┐
//  │ 1. Posa el fitxer (JPG/PNG/WEBP) a la carpeta  public/guide/                  │
//  │ 2. Referencia'l amb un bloc image i la ruta SENSE la barra inicial:           │
//  │       { kind: 'image', src: 'guide/el-meu-fitxer.jpg', caption: '…' }         │
//  │    (el renderer ja hi posa el prefix de desplegament; tu sempre 'guide/...')  │
//  │ Les fotos es precachegen amb la PWA → es veuen offline.                       │
//  │ Consell: redimensiona-les a ~1200 px d'ample per no inflar l'app.             │
//  └──────────────────────────────────────────────────────────────────────────────┘
//
//  Idioma: text en català (és el que llegeix la tripulació).
// ─────────────────────────────────────────────────────────────────────────────

import {
  Book,
  Sailboat,
  Droplet,
  Flame,
  Archive,
  Anchor,
  LifeBuoy,
  type LucideIcon,
} from '@/components/ui/icons';

/**
 * Icones disponibles per a les seccions, referenciades pel seu nom (string) al
 * contingut. Per fer-ne servir una de nova: importa-la de '@/components/ui/icons'
 * (afegint-la allà si cal) i registra-la aquí.
 */
export const GUIDE_ICONS = {
  book: Book,
  sailboat: Sailboat,
  water: Droplet,
  flame: Flame,
  stowage: Archive,
  anchor: Anchor,
  safety: LifeBuoy,
} satisfies Record<string, LucideIcon>;

export type GuideIconName = keyof typeof GUIDE_ICONS;

/** Una peça de contingut dins d'una secció. Veure la capçalera per a exemples. */
export type GuideBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'steps'; items: string[] }
  | { kind: 'list'; items: string[] }
  | { kind: 'image'; src: string; caption?: string }
  | { kind: 'note'; text: string };

/** Un tema de la guia. L'`id` és l'àncora de l'índex (ha de ser únic). */
export interface GuideSection {
  id: string;
  title: string;
  icon: GuideIconName;
  blocks: GuideBlock[];
}

// ─────────────────────────────────────────────────────────────────────────────
//  EL CONTINGUT
//
//  ⚠️ Les seccions de sota són MOSTRES per ensenyar el format. Substitueix-ne el
//  text pel real i posa les fotos a public/guide/. Esborra les que no vulguis.
// ─────────────────────────────────────────────────────────────────────────────

export const guideSections: GuideSection[] = [
  {
    id: 'wc',
    title: 'El WC (vàter marí)',
    icon: 'water',
    blocks: [
      {
        kind: 'paragraph',
        text: 'El vàter del vaixell és manual i agafa aigua del mar. No té res a veure amb un de casa: si no segueixes els passos pot embussar-se o entrar aigua.',
      },
      {
        kind: 'note',
        text: 'Regla d’or: NOMÉS hi va el que has menjat o begut + paper just. Res de tovalloletes, compreses ni greixos.',
      },
      {
        kind: 'image',
        src: 'guide/wc-valvules.jpg',
        caption: 'Les dues vàlvules sota el lavabo: entrada (esquerra) i sortida (dreta).',
      },
      {
        kind: 'steps',
        items: [
          'Obre la vàlvula d’entrada d’aigua de mar (palanca en línia amb el tub).',
          'Posa la maneta de la bomba en mode "aigua" (humit) i bomba unes quantes vegades.',
          'Quan estigui net, passa la maneta a "sec" i bomba fins a buidar la tassa del tot.',
          'Tanca la vàlvula d’entrada en acabar.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Si nota molta resistència, NO forcis la bomba: probablement hi ha alguna cosa que no havia d’anar-hi. Avisa el patró.',
      },
    ],
  },
  {
    id: 'vela-major',
    title: 'Hissar la vela major',
    icon: 'sailboat',
    blocks: [
      {
        kind: 'paragraph',
        text: 'Es hissa sempre amb el vaixell de cara al vent i el motor a ralentí per mantenir el rumb.',
      },
      {
        kind: 'list',
        items: [
          'Drissa de major: cap de color blau, a la base del pal (banda d’estribord).',
          'Lazy bag obert i veles lliures de nusos.',
          'Escota de major amollada perquè la botavara pugui pujar lliure.',
        ],
      },
      {
        kind: 'steps',
        items: [
          'Posa proa al vent i mantén-la amb el motor.',
          'Treu les voltes de la drissa del winch i comprova que corre lliure.',
          'Hissa a mà tant com puguis; quan costi, fes les últimes voltes amb el winch.',
          'Tensa fins que desapareguin les arrugues horitzontals de la vela.',
          'Volteja la drissa a la cornamusa i recull el sobrant.',
        ],
      },
      {
        kind: 'image',
        src: 'guide/vela-drissa.jpg',
        caption: 'La drissa de major al winch d’estribord.',
      },
      {
        kind: 'note',
        text: 'Mai posis els dits entre el cap i el winch mentre algú cargola. Avisa "hissant!" abans de començar.',
      },
    ],
  },
  {
    id: 'estiba',
    title: 'On es guarden les coses',
    icon: 'stowage',
    blocks: [
      {
        kind: 'paragraph',
        text: 'Cada cosa té el seu lloc perquè no es bellugui amb onatge. Si dubtes d’on va una cosa, mira la secció Llocs de l’app: cada compartiment hi té foto i etiqueta.',
      },
      {
        kind: 'list',
        items: [
          'Menjar sec i conserves: armariets sobre l’aigüera.',
          'Fred: nevera sota el banc de babord (no la deixis oberta!).',
          'Eines i recanvis: calaix de sota l’escala de baixada.',
          'Armilles i material de seguretat: banqueta de la banyera.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Quan acabis d’usar alguna cosa, torna-la al seu lloc immediatament. En navegació, una cosa fora del seu lloc acaba per terra.',
      },
    ],
  },
];
