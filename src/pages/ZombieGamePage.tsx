import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function ZombieGamePage() {
  return (
    <div className="px-3 pt-3 sm:px-5" dir="rtl">
      <div className="mx-auto mb-2 flex w-full max-w-[1280px] items-center justify-between gap-3">
        <Link
          to="/games"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/70 transition hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          الرجوع لمركز الألعاب
        </Link>
        <h1 className="text-sm font-bold text-red-200 sm:text-base">زومبي: النجاة الأخيرة</h1>
      </div>
      <iframe
        title="لعبة زومبي: النجاة الأخيرة"
        src="/zombie-game.html"
        className="mx-auto block h-[calc(100dvh-230px)] min-h-[380px] w-full max-w-[1280px] overflow-hidden rounded-xl border border-white/10 bg-[#090c10] lg:h-[calc(100dvh-145px)]"
      />
    </div>
  );
}
