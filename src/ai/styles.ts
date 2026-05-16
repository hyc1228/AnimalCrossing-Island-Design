import { TERRAIN } from '../types';
import type { StyleDef } from './types';

export const STYLES: StyleDef[] = [
  {
    id: 'japanese',
    name: '日式庭院',
    emoji: '⛩️',
    description: '禅意石灯笼、竹林、樱花、锦鲤池，宁静淡雅的东方美学。',
    palette: {
      primaryItems: ['stone_lantern', 'torii_gate', 'rock_garden', 'koi_pond', 'zen_bell'],
      accentItems: ['tea_table', 'bench_wooden', 'water_well'],
      flowers: ['flower_lily_white', 'flower_cosmos_pink', 'flower_mum_white', 'flower_tulip_pink'],
      fences: ['fence_bamboo'],
      trees: ['tree_cherry', 'bamboo', 'tree_pine'],
    },
    terrainPalette: {
      base: TERRAIN.GRASS,
      path: TERRAIN.PATH_STONE,
      accent: TERRAIN.WATER,
    },
  },
  {
    id: 'garden',
    name: '田园农家',
    emoji: '🌻',
    description: '木栅栏围合的小院、风车、果树和花田，温馨自然的乡村风。',
    palette: {
      primaryItems: ['windmill', 'planter_box', 'sandbox', 'water_well', 'swing'],
      accentItems: ['bench_wooden', 'cafe_chair', 'log_bench'],
      flowers: ['flower_tulip_yellow', 'flower_cosmos_pink', 'flower_rose_red'],
      fences: ['fence_wood'],
      trees: ['tree_fruit_apple', 'tree_oak', 'shrub'],
    },
    terrainPalette: {
      base: TERRAIN.GRASS,
      path: TERRAIN.PATH_WOOD,
      accent: TERRAIN.FLOWER_BED,
    },
  },
  {
    id: 'fairy',
    name: '童话森林',
    emoji: '🍄',
    description: '蘑菇、灯笼、原木椅围炉，松林深处的童话气息。',
    palette: {
      primaryItems: ['tent', 'campfire', 'mushroom_deco', 'lamp_post_garden', 'water_well'],
      accentItems: ['log_bench', 'swing', 'planter_box'],
      flowers: ['flower_rose_white', 'flower_hyacinth_blue', 'flower_tulip_pink'],
      fences: ['fence_log'],
      trees: ['tree_pine', 'tree_oak', 'shrub'],
    },
    terrainPalette: {
      base: TERRAIN.GRASS,
      path: TERRAIN.PATH_BRICK,
    },
  },
  {
    id: 'cafe',
    name: '咖啡街区',
    emoji: '☕',
    description: '砖路、街灯、复古电话亭和露天咖啡座，浪漫的城市街角。',
    palette: {
      primaryItems: ['parasol', 'cafe_chair', 'tea_table', 'streetlight', 'phone_booth'],
      accentItems: ['planter_box', 'bench_wooden', 'mailbox', 'lamp_post_garden'],
      flowers: ['flower_rose_red', 'flower_tulip_pink'],
      fences: ['fence_wood'],
      trees: ['tree_palm', 'tree_oak', 'shrub'],
    },
    terrainPalette: {
      base: TERRAIN.GRASS,
      path: TERRAIN.PATH_BRICK,
      accent: TERRAIN.SAND,
    },
  },
  {
    id: 'modern',
    name: '现代极简',
    emoji: '🏙️',
    description: '几何雕塑、铁栅栏、喷泉与极简路灯，干净利落的现代感。',
    palette: {
      primaryItems: ['fountain', 'modern_sculpture', 'streetlight', 'flag_pole'],
      accentItems: ['phone_booth', 'mailbox', 'planter_box', 'bench_wooden'],
      flowers: ['flower_hyacinth_blue', 'flower_rose_white'],
      fences: ['fence_iron'],
      trees: ['tree_pine', 'shrub'],
    },
    terrainPalette: {
      base: TERRAIN.GRASS,
      path: TERRAIN.PATH_STONE,
      accent: TERRAIN.WATER,
    },
  },
];

export const STYLES_BY_ID = Object.fromEntries(STYLES.map((s) => [s.id, s]));
