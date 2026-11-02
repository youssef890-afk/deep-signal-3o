import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

let activeModalCount = 0;
let previousBodyOverflow = '';

export function useModalScrollLock(open: boolean): void {
  useEffect(() => {
    if (!open) return;

    if (activeModalCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
    }
    activeModalCount += 1;
    document.body.style.overflow = 'hidden';

    return () => {
      activeModalCount = Math.max(0, activeModalCount - 1);
      if (activeModalCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
        previousBodyOverflow = '';
      }
    };
  }, [open]);
}

export function ModalPortal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}
