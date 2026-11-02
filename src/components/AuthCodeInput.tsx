import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  digitLabel: (position: number) => string;
};

export default function AuthCodeInput({ value, onChange, label, digitLabel }: Props) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? '');

  const updateAt = (index: number, next: string) => {
    const clean = next.replace(/\D/g, '').slice(-1);
    const result = [...digits];
    result[index] = clean;
    onChange(result.join(''));
    if (clean && index < result.length - 1) inputs.current[index + 1]?.focus();
  };

  const pasteCode = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      return;
    }
    if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < 5) inputs.current[index + 1]?.focus();
  };

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-[var(--text)]/75">{label}</legend>
      <div className="flex justify-center gap-2" dir="ltr">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => { inputs.current[index] = element; }}
            type="text"
            inputMode="numeric"
            autoFocus={index === 0}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            name={index === 0 ? 'one-time-code' : undefined}
            aria-label={digitLabel(index + 1)}
            value={digit}
            maxLength={1}
            onChange={(event) => updateAt(index, event.target.value)}
            onPaste={pasteCode}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className="h-12 w-10 rounded-xl border border-[var(--text)]/15 bg-[var(--surface-2)] text-center text-lg font-semibold text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25 sm:w-12"
          />
        ))}
      </div>
    </fieldset>
  );
}
