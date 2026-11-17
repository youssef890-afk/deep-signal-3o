import { Link } from 'react-router-dom';
import { ArrowUpLeft } from 'lucide-react';
import GameCanvas from '@/games/echo-of-ashes/GameCanvas';

export default function HeroSection() {
  return (
    <section
      dir="rtl"
      aria-labelledby="echo-of-ashes-hero-title"
      className="relative isolate mx-auto mb-5 min-h-[300px] w-full max-w-[1320px] overflow-hidden rounded-3xl border border-white/10 bg-[#17110d] shadow-[0_24px_70px_rgba(0,0,0,0.3)] sm:min-h-[340px]"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <GameCanvas quality="performance" rotateSpeed={0.25} />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-l from-[#100d0b]/95 via-[#100d0b]/65 to-[#100d0b]/15" />
      <div className="relative z-10 flex min-h-[300px] items-center px-6 py-8 sm:min-h-[340px] sm:px-10">
        <div className="max-w-xl">
          <p className="mb-3 text-xs font-semibold tracking-[.2em] text-orange-300">عالم ثلاثي الأبعاد · ECHO OF ASHES</p>
          <h2 id="echo-of-ashes-hero-title" className="text-4xl font-black tracking-tight text-white sm:text-6xl">
            صدى <span className="text-orange-400">الرماد</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-white/75 sm:text-base">
            اكتشف حدود الصحراء في معاينة تفاعلية ثلاثية الأبعاد.
          </p>
          <Link
            to="/games/echo-of-ashes"
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl border border-orange-300/70 bg-orange-500 px-5 py-3 text-sm font-bold text-black shadow-[0_0_28px_rgba(249,115,22,0.55)] transition hover:bg-orange-400 hover:shadow-[0_0_40px_rgba(249,115,22,0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#17110d]"
          >
            استكشف اللعبة <ArrowUpLeft aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
