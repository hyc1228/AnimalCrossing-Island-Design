import type { TFunction } from 'i18next';
import type { ItemDef } from '../types';

// Look up localized item name; fall back to the bundled Chinese name.
export function itemName(def: ItemDef, t: TFunction): string {
  return t(`items.${def.key}`, { defaultValue: def.name });
}

// Source string normalization: try to map common Chinese strings to source keys.
const SOURCE_MAP: Record<string, string> = {
  主线剧情: 'main',
  主线: 'mainShort',
  邀请入住: 'invite',
  建造: 'build',
  '砍树苗/移植': 'cutting',
  砍树苗: 'sapling',
  春季活动: 'spring',
  沙滩种植: 'beach',
  神秘岛: 'mystery',
  果树: 'fruit',
  雷亚: 'leif',
  种植: 'plant',
  商店: 'shop',
  诺顿百货: 'nookShop',
};

export function itemSource(def: ItemDef, t: TFunction): string {
  if (def.diy) return t('sources.diy', { defaultValue: t('shopping.diy') });
  if (!def.source) return t('sources.shop', { defaultValue: '商店' });
  const key = SOURCE_MAP[def.source];
  if (key) return t(`sources.${key}`, { defaultValue: def.source });
  return def.source;
}

export function styleName(id: string, t: TFunction): string {
  return t(`styles.${id}.name`, { defaultValue: id });
}

export function styleDesc(id: string, t: TFunction): string {
  return t(`styles.${id}.desc`, { defaultValue: '' });
}

export function templateName(id: string, fallback: string, t: TFunction): string {
  return t(`templates.${id}.name`, { defaultValue: fallback });
}

export function templateDesc(id: string, fallback: string, t: TFunction): string {
  return t(`templates.${id}.desc`, { defaultValue: fallback });
}
