// Shared display panel for any `RecognitionResult`, whether it came from the
// vision pipeline (RecognizePage) or the text generation pipeline
// (GeneratePage). Keeps the two pages visually identical and lets us iterate
// on the styling once.

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Download, Wand2, Camera } from 'lucide-react';
import {
  Button as AIButton,
  Card as AICard,
  Divider as AIDivider,
} from 'animal-island-ui';
import type { MatchedItem, RecognitionResult } from '../../ai/visionTypes';
import type { StyleId } from '../../ai/types';

type DensityCode = 'sparse' | 'medium' | 'dense';

export interface ResultPanelProps {
  result: RecognitionResult;
  selected: Record<number, boolean>;
  onToggle: (i: number) => void;
  expandedMatches: Record<number, boolean>;
  onToggleExpand: (i: number) => void;
  onExport: () => void;
  onApply: () => void;
  densityLabel: (d: DensityCode) => string;
  styleLabel: (s: StyleId) => string;
  /** Override for the apply button label (defaults to "apply to canvas"). */
  applyLabel?: string;
}

export default function ResultPanel({
  result,
  selected,
  onToggle,
  expandedMatches,
  onToggleExpand,
  onExport,
  onApply,
  densityLabel,
  styleLabel,
  applyLabel,
}: ResultPanelProps) {
  const { t } = useTranslation();
  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected],
  );
  const totalCount = useMemo(
    () =>
      result.items.reduce(
        (sum, it, i) => (selected[i] ? sum + it.count : sum),
        0,
      ),
    [result.items, selected],
  );

  return (
    <AICard className="overflow-hidden flex flex-col h-full !p-0">
      <div className="p-4 border-b-2 border-cream-200">
        <h3 className="font-extrabold text-leaf-800 mb-2 text-sm flex items-center gap-1.5">
          <Sparkles size={14} className="text-mint-500" /> {t('recognize.stylesTitle')}
        </h3>
        <div className="space-y-1.5">
          {result.topStyles.slice(0, 5).map((s) => (
            <div key={s.style} className="flex items-center gap-2">
              <div className="w-24 text-xs text-leaf-700 font-semibold truncate">{styleLabel(s.style)}</div>
              <div className="flex-1 h-2.5 bg-cream-100 rounded-full overflow-hidden border border-cream-200">
                <div
                  className="h-full bg-mint-500 rounded-full transition-all"
                  style={{ width: `${Math.round(s.score * 100)}%` }}
                />
              </div>
              <div className="w-10 text-right text-xs font-extrabold text-leaf-800">
                {Math.round(s.score * 100)}%
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-leaf-700 mt-3 leading-relaxed">
          <span className="chip-mint mr-1.5 align-middle">
            {t('recognize.densityChip', { density: densityLabel(result.raw.density as DensityCode) })}
          </span>
          {result.raw.description}
        </p>
      </div>

      <AIDivider type="line-teal" />

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-4 py-2 bg-cream-100 flex items-center justify-between text-xs text-leaf-700 sticky top-0 z-10">
          <span>
            {t('recognize.itemsHeader', {
              kinds: result.items.length,
              selectedKinds: selectedCount,
              totalCount,
            })}
          </span>
          {result.usage && (
            <span className="text-leaf-500 font-mono">
              {result.usage.in}↑ {result.usage.out}↓ tokens
            </span>
          )}
        </div>

        {result.items.length === 0 && (
          <div className="p-8 text-center text-sm text-leaf-600">{t('recognize.itemsEmpty')}</div>
        )}

        {result.items.map((it, i) => (
          <ItemRow
            key={`${it.nameEn}-${i}`}
            item={it}
            checked={!!selected[i]}
            onToggle={() => onToggle(i)}
            expanded={!!expandedMatches[i]}
            onToggleExpand={() => onToggleExpand(i)}
          />
        ))}
      </div>

      <div className="p-3 border-t-2 border-cream-200 bg-cream-50 flex flex-wrap gap-2">
        <AIButton onClick={onExport} disabled={selectedCount === 0} icon={<Download size={14} />}>
          {t('recognize.exportShoppingList')}
        </AIButton>
        <div className="flex-1 min-w-[12rem]">
          <AIButton
            type="primary"
            block
            onClick={onApply}
            disabled={selectedCount === 0}
            icon={<Wand2 size={14} />}
          >
            {applyLabel ?? t('recognize.applyToCanvas')}
          </AIButton>
        </div>
      </div>
    </AICard>
  );
}

function ItemRow({
  item,
  checked,
  onToggle,
  expanded,
  onToggleExpand,
}: {
  item: MatchedItem;
  checked: boolean;
  onToggle: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const { t } = useTranslation();
  const best = item.matches[0];
  const noMatch = !best || best.score < 0.35;
  return (
    <div className={`border-b-2 border-cream-200/60 ${noMatch ? 'bg-sun-500/8' : ''}`}>
      <label className="flex items-center gap-3 px-3 py-2.5 hover:bg-cream-50 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="w-4 h-4 accent-mint-500"
        />
        <div className="w-10 h-10 rounded-xl bg-cream-100 border-2 border-cream-200 grid place-items-center overflow-hidden shrink-0">
          {best?.imageUrl ? (
            <img src={best.imageUrl} alt={best.name} className="w-full h-full object-contain" />
          ) : (
            <Camera size={16} className="text-leaf-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-leaf-800 truncate">
              {best ? best.name : item.nameEn}
            </span>
            <span className="chip-mint">× {item.count}</span>
            {noMatch && (
              <span className="chip-sun" title={t('recognize.unmatchedTooltip')}>
                {t('recognize.unmatched')}
              </span>
            )}
          </div>
          <div className="text-[11px] text-leaf-600 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{t('recognize.recognized', { value: Math.round(item.confidence * 100) })}</span>
            {best && <span>{t('recognize.matched', { value: Math.round(best.score * 100) })}</span>}
            {item.region && <span>· {item.region}</span>}
            {item.note && <span>· {item.note}</span>}
          </div>
        </div>
        {item.matches.length > 1 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleExpand();
            }}
            className="text-xs text-mint-600 hover:text-mint-700 font-bold whitespace-nowrap px-2 py-0.5 rounded-full hover:bg-mint-500/10 transition"
          >
            {expanded
              ? t('recognize.matchCollapse')
              : t('recognize.matchExpand', { count: item.matches.length - 1 })}
          </button>
        )}
      </label>
      {expanded && item.matches.length > 1 && (
        <div className="pl-14 pr-3 pb-2 flex flex-wrap gap-2 text-[11px]">
          {item.matches.slice(1).map((m) => (
            <div
              key={m.catalogKey}
              className="flex items-center gap-1.5 bg-white border-2 border-cream-200 rounded-full px-2.5 py-1"
              title={`${m.nameEn} · ${Math.round(m.score * 100)}%`}
            >
              {m.imageUrl ? (
                <img src={m.imageUrl} alt={m.name} className="w-5 h-5 object-contain" />
              ) : (
                <Camera size={10} className="text-leaf-500" />
              )}
              <span className="text-leaf-700 font-semibold">{m.name}</span>
              <span className="text-mint-600 font-bold">{Math.round(m.score * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
