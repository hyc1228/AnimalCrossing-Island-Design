import { generateLayout } from '../ai/generator';
import { GRID_COLS, GRID_ROWS, type TemplateDef } from '../types';
import { emptyTerrain } from '../utils/grid';

// We generate template designs by running the AI rule engine with fixed seeds.
// This keeps the data lean (just a seed per template) while producing varied results.

interface TemplateSpec {
  id: string;
  name: string;
  description: string;
  style: TemplateDef['style'];
  seed: number;
  density: 'sparse' | 'medium' | 'dense';
}

const SPECS: TemplateSpec[] = [
  {
    id: 'tpl_japanese_zen',
    name: '禅意日式庭院',
    description: '樱花、石灯笼、锦鲤池构成的宁静日式花园，适合喜欢东方美学的玩家。',
    style: 'japanese',
    seed: 12345,
    density: 'medium',
  },
  {
    id: 'tpl_garden_farm',
    name: '田园农家小院',
    description: '风车、果树、菜地与木栅栏围合的温馨乡村，慢生活气息浓厚。',
    style: 'garden',
    seed: 67890,
    density: 'medium',
  },
  {
    id: 'tpl_fairy_forest',
    name: '童话精灵森林',
    description: '松林深处的蘑菇与篝火，灯笼小径通向神秘营地。',
    style: 'fairy',
    seed: 24680,
    density: 'dense',
  },
  {
    id: 'tpl_cafe_street',
    name: '巴黎咖啡街区',
    description: '砖路两侧露天咖啡座、复古电话亭与街灯，浪漫的城市街角。',
    style: 'cafe',
    seed: 13579,
    density: 'medium',
  },
  {
    id: 'tpl_modern_minimal',
    name: '现代极简广场',
    description: '喷泉、雕塑、铁栅栏组成的简洁广场，干净利落的现代感。',
    style: 'modern',
    seed: 99999,
    density: 'sparse',
  },
];

let cache: TemplateDef[] | null = null;

export function getTemplates(): TemplateDef[] {
  if (cache) return cache;
  cache = SPECS.map((spec) => {
    const baseTerrain = emptyTerrain();
    const result = generateLayout(
      { styleId: spec.style, seed: spec.seed, density: spec.density },
      [],
      baseTerrain,
    );
    return {
      id: spec.id,
      name: spec.name,
      description: spec.description,
      style: spec.style,
      design: {
        size: { cols: GRID_COLS, rows: GRID_ROWS },
        items: result.items,
        terrain: result.terrain ?? baseTerrain,
      },
    };
  });
  return cache;
}
