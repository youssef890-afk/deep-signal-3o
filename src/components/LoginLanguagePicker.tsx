import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Globe2, Languages } from 'lucide-react';
import 'flag-icons/css/flag-icons.min.css';
import { getBrowserLanguageCodes, languages, type LanguageOption } from '@/i18n/languages';
import { translate, translateLanguagePicker, type Language } from '@/lib/i18n';
import { translateAuth } from '@/i18n/auth';

type Props = {
  language: Language;
  onSelect: (language: Language) => void;
  onOpenChange?: (open: boolean) => void;
  compactAnchorRef: RefObject<HTMLDivElement>;
  robotRef: RefObject<HTMLDivElement>;
};

type LanguageLabel = LanguageOption & {
  nativeName: string;
  englishName: string;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: 'below' | 'bubble';
};

function getLanguageLabels(currentLanguage: Language): LanguageLabel[] {
  return languages.map((language) => {
    let nativeName: string = language.code;
    let englishName: string = language.code;

    if (typeof Intl.DisplayNames === 'function') {
      try {
        nativeName = new Intl.DisplayNames([language.code], { type: 'language' }).of(language.code) ?? language.code;
      } catch {
        nativeName = language.code;
      }

      try {
        englishName = new Intl.DisplayNames(['en'], { type: 'language' }).of(language.code) ?? language.code;
      } catch {
        englishName = language.code;
      }
    }

    const firstCharacter = [...nativeName][0];
    if (firstCharacter) {
      nativeName = firstCharacter.toLocaleUpperCase(language.code) + nativeName.slice(firstCharacter.length);
    }

    if (language.code === 'ary') {
      nativeName = translateAuth(currentLanguage, 'darijaLanguageName');
      englishName = translateAuth('en', 'darijaLanguageEnglishName');
    }

    return { ...language, nativeName, englishName };
  });
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();
}

function isAvailableLanguage(code: string): code is Language {
  return languages.some((option) => option.code === code && option.available);
}

function getOrderedLanguages(currentLanguage: Language): LanguageLabel[] {
  const languageLabels = getLanguageLabels(currentLanguage);
  const browserCodes = getBrowserLanguageCodes();
  const browserPreference = languageLabels.find(
    (language) => !language.available && language.code === browserCodes[0],
  )?.code;

  return [...languageLabels].sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    if (a.code === browserPreference) return -1;
    if (b.code === browserPreference) return 1;
    return a.nativeName.localeCompare(b.nativeName);
  });
}

export default function LoginLanguagePicker({ language, onSelect, onOpenChange, compactAnchorRef, robotRef }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const orderedLanguages = useMemo(() => {
    const ordered = getOrderedLanguages(language);
    return [...ordered].sort((a, b) => Number(b.code === language) - Number(a.code === language));
  }, [language]);
  const selected = orderedLanguages.find((option) => option.code === language) ?? orderedLanguages[0];
  const results = useMemo(() => {
    const search = normalize(query.trim());
    if (!search) return orderedLanguages;
    return orderedLanguages.filter((option) =>
      [option.nativeName, option.englishName, option.code].some((value) => normalize(value).includes(search)),
    );
  }, [orderedLanguages, query]);
  const activeOption = results[activeIndex];
  const listboxId = 'login-language-listbox';

  const updatePosition = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;

    const rect = input.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const viewportBottom = viewportTop + viewportHeight;
    const below = Math.max(0, viewportBottom - rect.bottom - 8);
    const maxAllowed = Math.min(viewportHeight * 0.4, viewportHeight - 24);
    const width = Math.min(Math.max(rect.width, 272), window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));

    if (below >= Math.min(220, maxAllowed)) {
      setPosition({
        top: rect.bottom + 8,
        left,
        width,
        maxHeight: Math.min(maxAllowed, below),
        placement: 'below',
      });
      return;
    }

    const bubble = compactAnchorRef.current?.getBoundingClientRect();
    const robotBottom = robotRef.current?.getBoundingClientRect().bottom ?? viewportTop;
    const bubbleTop = bubble
      ? Math.max(viewportTop + 8, bubble.top, robotBottom + 8)
      : Math.max(viewportTop + 8, rect.top - maxAllowed - 8, robotBottom + 8);
    const compactSpace = Math.max(0, rect.top - bubbleTop - 8);

    setPosition({
      top: bubbleTop,
      left,
      width,
      maxHeight: Math.min(maxAllowed, compactSpace, viewportBottom - bubbleTop - 8),
      placement: 'bubble',
    });
  }, [compactAnchorRef, robotRef]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const viewport = window.visualViewport;
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    viewport?.addEventListener('resize', updatePosition);
    viewport?.addEventListener('scroll', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      viewport?.removeEventListener('resize', updatePosition);
      viewport?.removeEventListener('scroll', updatePosition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    onOpenChange?.(open);
  }, [onOpenChange, open]);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !inputRef.current?.contains(event.target) && !listRef.current?.contains(event.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('pointerdown', dismissOutside);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('pointerdown', dismissOutside);
    };
  }, [open]);

  useEffect(() => {
    if (activeOption) {
      const option = document.getElementById(`login-language-option-${activeOption.code}`);
      const list = listRef.current;
      if (option && list) {
        const optionTop = option.offsetTop - list.offsetTop;
        if (optionTop < list.scrollTop) list.scrollTop = optionTop;
        else if (optionTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
          list.scrollTop = optionTop + option.offsetHeight - list.clientHeight;
        }
      }
    }
  }, [activeOption]);

  const selectLanguage = (option: LanguageLabel) => {
    if (!option.available || !isAvailableLanguage(option.code)) return;
    onSelect(option.code);
    setOpen(false);
    setQuery('');
  };

  const findEnabledIndex = (start: number, direction: 1 | -1): number => {
    for (let offset = 0; offset < results.length; offset += 1) {
      const index = ((start + direction * offset) % results.length + results.length) % results.length;
      if (results[index].available) return index;
    }
    return start;
  };

  const moveActive = (direction: 1 | -1) => {
    if (!results.length) return;
    setActiveIndex((current) => findEnabledIndex(current + direction, direction));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(findEnabledIndex(0, 1));
      } else {
        moveActive(1);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(findEnabledIndex(results.length - 1, -1));
      } else {
        moveActive(-1);
      }
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      if (activeOption?.available) selectLanguage(activeOption);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <>
      <div className="flex h-9 w-[168px] max-w-full items-center gap-1.5 rounded-full border border-[var(--text)]/15 bg-[var(--text)]/[.04] px-3 transition focus-within:border-[var(--accent)]/55 focus-within:bg-[var(--text)]/[.08] focus-within:ring-2 focus-within:ring-[var(--accent)]/25">
        {selected.code === 'ar' ? (
          <Globe2 aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--text)]/70" />
        ) : selected.genericFlag ? (
          <Languages aria-hidden="true" className="h-[18px] w-6 shrink-0 text-[var(--text)]/60" />
        ) : (
          <span aria-hidden="true" className={`fi fi-${selected.country} h-3.5 w-5 shrink-0 rounded-sm border border-[var(--text)]/15`} />
        )}
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label={translate(language, 'language')}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-activedescendant={open && activeOption ? `login-language-option-${activeOption.code}` : undefined}
          autoComplete="off"
          value={open ? query : selected.nativeName}
          placeholder={translateLanguagePicker(language, 'searchPlaceholder')}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent py-0 text-xs font-semibold text-[var(--text)] outline-none placeholder:font-normal placeholder:text-[var(--text)]/55"
        />
        <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 text-[var(--text)]/60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && position && createPortal(
        <div
          ref={listRef}
          className="z-[10000] overflow-y-auto overscroll-contain rounded-2xl border border-[var(--text)]/10 bg-[var(--surface-2)] p-1.5 shadow-[0_12px_36px_rgba(0,0,0,.28)]"
          id={listboxId}
          role="listbox"
          aria-label={translate(language, 'language')}
          dir={language === 'ar' || language === 'ary' ? 'rtl' : 'ltr'}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            width: position.width,
            maxHeight: position.maxHeight,
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {results.length ? results.map((option, index) => {
            const isSelected = option.code === language;
            const isActive = index === activeIndex;
            return (
              <div
                key={option.code}
                id={`login-language-option-${option.code}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={!option.available}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectLanguage(option)}
                className={`flex h-14 cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 transition ${isSelected ? 'bg-[var(--accent)]/10' : ''} ${isActive ? 'border-[var(--accent)]/35 bg-[var(--text)]/[.09] ring-1 ring-[var(--accent)]/25' : 'hover:bg-[var(--text)]/[.06]'} ${option.available ? 'text-[var(--text)]' : 'cursor-not-allowed text-[var(--text)]/40'}`}
              >
                {option.code === 'ar' ? (
                  <Globe2 aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--text)]/65" />
                ) : option.genericFlag ? (
                  <Languages aria-hidden="true" className="h-[18px] w-6 shrink-0 text-[var(--text)]/55" />
                ) : (
                  <span aria-hidden="true" className={`fi fi-${option.country} h-3.5 w-5 shrink-0 rounded-sm border border-[var(--text)]/15`} />
                )}
                <span className="min-w-0 flex-1 text-start">
                  <span lang={option.code} className="block truncate font-sans text-sm font-semibold">{option.nativeName}</span>
                  {option.englishName !== option.nativeName && <span lang="en" className="block truncate font-sans text-xs text-[var(--text)]/45">{option.englishName}</span>}
                </span>
                {option.available
                  ? isSelected && <Check aria-label={translate(language, 'language')} className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                  : <span className="shrink-0 rounded-full border border-[var(--text)]/10 bg-[var(--text)]/[.04] px-2 py-0.5 text-[10px]">{translateLanguagePicker(language, 'comingSoon')}</span>}
              </div>
            );
          }) : (
            <div className="px-4 py-5 text-center" role="status">
              <p className="text-sm font-semibold text-[var(--text)]">{translateLanguagePicker(language, 'noResults')}</p>
              <p className="mt-1 text-xs text-[var(--text)]/45">{translateLanguagePicker(language, 'noResultsSuggestion')}</p>
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
