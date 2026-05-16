import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { SUPPORTED_LANGS } from '../../i18n';

interface Props {
  compact?: boolean;
}

export default function LanguageSwitcher({ compact }: Props) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  const current = SUPPORTED_LANGS.find((l) => l.code === i18n.resolvedLanguage) ?? SUPPORTED_LANGS[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost text-sm"
        title={t('language.switch')}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe size={16} />
        {compact ? current.shortLabel : current.label}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-1 z-50 panel py-1 min-w-[10rem]"
        >
          {SUPPORTED_LANGS.map((lng) => {
            const active = lng.code === current.code;
            return (
              <li key={lng.code}>
                <button
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    i18n.changeLanguage(lng.code);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-mint-500/10 ${
                    active ? 'text-mint-600 font-bold' : 'text-leaf-700'
                  }`}
                >
                  <span className="flex-1 text-left">{lng.label}</span>
                  {active && <Check size={14} className="text-mint-500" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
