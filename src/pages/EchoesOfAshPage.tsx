import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';

const EchoesOfAshGame = lazy(() => import('@/components/echoes-of-ash/EchoesOfAshGame'));

export default function EchoesOfAshPage() {
  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto mb-3 w-full max-w-[1280px] px-3 pt-4 sm:px-5">
        <Link
          to="/games"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/60 transition hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          الرجوع لمركز الألعاب
        </Link>
      </div>
      <Suspense
        fallback={
          <div className="mx-auto grid min-h-[50vh] max-w-[1280px] place-items-center text-amber-100/70">
            <Loader2 className="h-6 w-6 animate-spin" aria-label="جارٍ تحميل اللعبة" />
          </div>
        }
      >
        <EchoesOfAshGame />
      </Suspense>
    </div>
  );
}
