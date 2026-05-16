import type { ItemDef } from '../types';

// Curated set of ~60 high-frequency items for MVP.
// Color hexes are tuned to read clearly on grass background.
export const ITEMS: ItemDef[] = [
  // ===== Buildings =====
  { key: 'resident_services', name: '居民服务中心', category: 'building', layer: 'building', w: 6, h: 4, color: '#d9a35b', emoji: '🏛️', source: '主线剧情', tags: ['core'] },
  { key: 'museum', name: '博物馆', category: 'building', layer: 'building', w: 6, h: 5, color: '#b08968', emoji: '🏛️', source: '主线', tags: ['core'] },
  { key: 'tailor_shop', name: '艾布鲁服饰店', category: 'building', layer: 'building', w: 4, h: 4, color: '#e07a5f', emoji: '👗', source: '主线', tags: ['core'] },
  { key: 'nooks_cranny', name: '狸端百货', category: 'building', layer: 'building', w: 5, h: 4, color: '#f4a261', emoji: '🏬', source: '主线', tags: ['core'] },
  { key: 'campsite', name: '露营地', category: 'building', layer: 'building', w: 4, h: 3, color: '#a98467', emoji: '⛺', source: '主线', tags: ['core', 'garden', 'fairy'] },
  { key: 'house_player', name: '玩家房屋', category: 'building', layer: 'building', w: 4, h: 4, color: '#e9c46a', emoji: '🏠', source: '建造', tags: ['core'] },
  { key: 'house_villager', name: '居民小屋', category: 'building', layer: 'building', w: 4, h: 4, color: '#fce5c0', emoji: '🏡', source: '邀请入住', tags: ['core'] },

  // ===== Bridges & Inclines =====
  { key: 'bridge_wooden', name: '木桥', category: 'bridge', layer: 'building', w: 4, h: 1, color: '#a0522d', emoji: '🌉', price: 98000, tags: ['japanese', 'garden'] },
  { key: 'bridge_stone', name: '石桥', category: 'bridge', layer: 'building', w: 4, h: 1, color: '#9a9a9a', emoji: '🌉', price: 168000, tags: ['japanese', 'modern'] },
  { key: 'bridge_brick', name: '砖桥', category: 'bridge', layer: 'building', w: 4, h: 1, color: '#a35e3b', emoji: '🌉', price: 168000, tags: ['fairy', 'cafe'] },
  { key: 'incline_wood', name: '木坡道', category: 'incline', layer: 'building', w: 2, h: 4, color: '#b48a5e', emoji: '🪜', price: 98000, tags: ['japanese', 'garden'] },
  { key: 'incline_stone', name: '石坡道', category: 'incline', layer: 'building', w: 2, h: 4, color: '#8a8a8a', emoji: '🪜', price: 128000, tags: ['modern'] },

  // ===== Trees =====
  { key: 'tree_oak', name: '阔叶树', category: 'tree', layer: 'decoration', w: 1, h: 1, color: '#3a6a2b', emoji: '🌳', source: '砍树苗/移植', tags: ['garden', 'fairy', 'cafe'] },
  { key: 'tree_pine', name: '松树', category: 'tree', layer: 'decoration', w: 1, h: 1, color: '#2f5a23', emoji: '🌲', source: '砍树苗', tags: ['fairy', 'modern'] },
  { key: 'tree_cherry', name: '樱花树', category: 'tree', layer: 'decoration', w: 1, h: 1, color: '#f7b5c4', emoji: '🌸', source: '春季活动', tags: ['japanese', 'fairy'] },
  { key: 'tree_palm', name: '椰子树', category: 'tree', layer: 'decoration', w: 1, h: 1, color: '#6b8e23', emoji: '🌴', source: '沙滩种植', tags: ['cafe', 'garden'] },
  { key: 'bamboo', name: '竹子', category: 'tree', layer: 'decoration', w: 1, h: 1, color: '#7caa55', emoji: '🎍', source: '神秘岛', tags: ['japanese'] },
  { key: 'tree_fruit_apple', name: '苹果树', category: 'tree', layer: 'decoration', w: 1, h: 1, color: '#7da34a', emoji: '🍎', source: '果树', tags: ['garden'] },
  { key: 'shrub', name: '灌木', category: 'tree', layer: 'decoration', w: 1, h: 1, color: '#6fa14a', emoji: '🌿', source: '雷亚', tags: ['garden', 'fairy', 'cafe', 'modern'] },

  // ===== Flowers =====
  { key: 'flower_rose_red', name: '红玫瑰', category: 'flower', layer: 'decoration', w: 1, h: 1, color: '#d94c4c', emoji: '🌹', source: '种植', tags: ['fairy', 'cafe'] },
  { key: 'flower_rose_white', name: '白玫瑰', category: 'flower', layer: 'decoration', w: 1, h: 1, color: '#f5f5f5', emoji: '🌼', source: '种植', tags: ['fairy', 'modern'] },
  { key: 'flower_tulip_yellow', name: '黄郁金香', category: 'flower', layer: 'decoration', w: 1, h: 1, color: '#f1c40f', emoji: '🌷', source: '种植', tags: ['garden'] },
  { key: 'flower_tulip_pink', name: '粉郁金香', category: 'flower', layer: 'decoration', w: 1, h: 1, color: '#f4b6c2', emoji: '🌷', source: '种植', tags: ['fairy', 'cafe', 'japanese'] },
  { key: 'flower_lily_white', name: '白百合', category: 'flower', layer: 'decoration', w: 1, h: 1, color: '#fafafa', emoji: '⚜️', source: '种植', tags: ['japanese'] },
  { key: 'flower_cosmos_pink', name: '粉波斯菊', category: 'flower', layer: 'decoration', w: 1, h: 1, color: '#f3a6c4', emoji: '🌸', source: '种植', tags: ['japanese', 'garden'] },
  { key: 'flower_hyacinth_blue', name: '蓝风信子', category: 'flower', layer: 'decoration', w: 1, h: 1, color: '#5b9bd5', emoji: '💐', source: '种植', tags: ['modern', 'fairy'] },
  { key: 'flower_mum_white', name: '白菊花', category: 'flower', layer: 'decoration', w: 1, h: 1, color: '#ffffff', emoji: '🏵️', source: '种植', tags: ['japanese'] },

  // ===== Fences =====
  { key: 'fence_bamboo', name: '竹篱笆', category: 'fence', layer: 'decoration', w: 1, h: 1, color: '#cdb377', emoji: '🪵', diy: true, tags: ['japanese'] },
  { key: 'fence_wood', name: '木栅栏', category: 'fence', layer: 'decoration', w: 1, h: 1, color: '#a0744f', emoji: '🪵', diy: true, tags: ['garden', 'cafe'] },
  { key: 'fence_iron', name: '铁栅栏', category: 'fence', layer: 'decoration', w: 1, h: 1, color: '#4a4a4a', emoji: '🔲', diy: true, tags: ['modern'] },
  { key: 'fence_log', name: '原木栅栏', category: 'fence', layer: 'decoration', w: 1, h: 1, color: '#b48a5e', emoji: '🪵', diy: true, tags: ['fairy', 'garden'] },

  // ===== Furniture / Decoration =====
  { key: 'stone_lantern', name: '石灯笼', category: 'decoration', layer: 'decoration', w: 1, h: 1, color: '#888888', emoji: '🏮', diy: true, tags: ['japanese'] },
  { key: 'zen_bell', name: '钟楼', category: 'decoration', layer: 'decoration', w: 2, h: 2, color: '#7a5230', emoji: '🔔', source: '诺顿百货', price: 18000, tags: ['japanese'] },
  { key: 'tea_table', name: '茶几', category: 'furniture', layer: 'decoration', w: 1, h: 2, color: '#8b5a2b', emoji: '🍵', source: '商店', price: 1200, tags: ['japanese', 'cafe'] },
  { key: 'cafe_chair', name: '咖啡椅', category: 'furniture', layer: 'decoration', w: 1, h: 1, color: '#6d4c41', emoji: '🪑', source: '商店', price: 800, tags: ['cafe', 'garden'] },
  { key: 'parasol', name: '海滩遮阳伞', category: 'furniture', layer: 'decoration', w: 2, h: 2, color: '#e76f51', emoji: '🏖️', source: '商店', price: 2400, tags: ['cafe'] },
  { key: 'bench_wooden', name: '木长椅', category: 'furniture', layer: 'decoration', w: 2, h: 1, color: '#8b6f47', emoji: '🪑', source: '商店', price: 1500, tags: ['garden', 'cafe', 'japanese'] },
  { key: 'streetlight', name: '路灯', category: 'decoration', layer: 'decoration', w: 1, h: 1, color: '#444', emoji: '💡', diy: true, tags: ['modern', 'cafe'] },
  { key: 'fountain', name: '喷泉', category: 'decoration', layer: 'decoration', w: 3, h: 3, color: '#7cc7ff', emoji: '⛲', source: '商店', price: 18000, tags: ['modern', 'garden'] },
  { key: 'windmill', name: '风车', category: 'decoration', layer: 'decoration', w: 2, h: 2, color: '#e6e6e6', emoji: '🌬️', source: '商店', price: 5000, tags: ['garden', 'fairy'] },
  { key: 'mailbox', name: '邮筒', category: 'decoration', layer: 'decoration', w: 1, h: 1, color: '#c0392b', emoji: '📮', diy: true, tags: ['modern', 'cafe'] },
  { key: 'campfire', name: '篝火', category: 'decoration', layer: 'decoration', w: 1, h: 1, color: '#e76f51', emoji: '🔥', diy: true, tags: ['fairy', 'garden'] },
  { key: 'tent', name: '帐篷', category: 'decoration', layer: 'decoration', w: 2, h: 2, color: '#b08968', emoji: '⛺', source: '商店', price: 5000, tags: ['fairy', 'garden'] },
  { key: 'log_bench', name: '原木长椅', category: 'furniture', layer: 'decoration', w: 2, h: 1, color: '#a0744f', emoji: '🪵', diy: true, tags: ['fairy', 'garden'] },
  { key: 'sandbox', name: '沙坑', category: 'decoration', layer: 'decoration', w: 2, h: 2, color: '#ecc77d', emoji: '🪣', source: '商店', price: 3500, tags: ['garden'] },
  { key: 'swing', name: '秋千', category: 'decoration', layer: 'decoration', w: 1, h: 2, color: '#888', emoji: '🪢', source: '商店', price: 4200, tags: ['garden', 'fairy'] },
  { key: 'koi_pond', name: '锦鲤池装饰', category: 'decoration', layer: 'decoration', w: 3, h: 2, color: '#5b9bd5', emoji: '🐟', source: '商店', price: 7800, tags: ['japanese'] },
  { key: 'torii_gate', name: '鸟居', category: 'decoration', layer: 'decoration', w: 2, h: 1, color: '#c0392b', emoji: '⛩️', diy: true, tags: ['japanese'] },
  { key: 'rock_garden', name: '枯山水石组', category: 'decoration', layer: 'decoration', w: 2, h: 2, color: '#bfbfbf', emoji: '🪨', diy: true, tags: ['japanese'] },
  { key: 'flag_pole', name: '旗杆', category: 'decoration', layer: 'decoration', w: 1, h: 1, color: '#888', emoji: '🚩', source: '商店', price: 4500, tags: ['modern'] },
  { key: 'phone_booth', name: '复古电话亭', category: 'decoration', layer: 'decoration', w: 1, h: 1, color: '#c0392b', emoji: '☎️', source: '商店', price: 5500, tags: ['cafe', 'modern'] },
  { key: 'planter_box', name: '花箱', category: 'furniture', layer: 'decoration', w: 2, h: 1, color: '#8b5a2b', emoji: '🪴', diy: true, tags: ['cafe', 'garden', 'fairy'] },
  { key: 'lamp_post_garden', name: '园林路灯', category: 'decoration', layer: 'decoration', w: 1, h: 1, color: '#3a3a3a', emoji: '🪔', source: '商店', price: 1800, tags: ['fairy', 'garden', 'cafe'] },
  { key: 'mushroom_deco', name: '蘑菇装饰', category: 'decoration', layer: 'decoration', w: 1, h: 1, color: '#d94c4c', emoji: '🍄', diy: true, tags: ['fairy'] },
  { key: 'water_well', name: '水井', category: 'decoration', layer: 'decoration', w: 2, h: 2, color: '#8a8a8a', emoji: '🕳️', diy: true, tags: ['fairy', 'garden', 'japanese'] },
  { key: 'modern_sculpture', name: '现代雕塑', category: 'decoration', layer: 'decoration', w: 1, h: 1, color: '#cccccc', emoji: '🗿', source: '商店', price: 9800, tags: ['modern'] },
];

export const ITEMS_BY_KEY: Record<string, ItemDef> = Object.fromEntries(
  ITEMS.map((i) => [i.key, i]),
);

export const ITEM_CATEGORIES: Array<{
  key: ItemDef['category'];
  label: string;
}> = [
  { key: 'building', label: '建筑' },
  { key: 'bridge', label: '桥梁' },
  { key: 'incline', label: '坡道' },
  { key: 'tree', label: '树木' },
  { key: 'flower', label: '花草' },
  { key: 'fence', label: '栅栏' },
  { key: 'furniture', label: '家具' },
  { key: 'decoration', label: '装饰' },
];
