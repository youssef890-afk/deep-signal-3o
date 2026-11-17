import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { GamePanelId, GraphicsQuality } from '@/games/echo-of-ashes/types/game-ui';
import { FeaturePanel } from '@/games/echo-of-ashes/components/FeaturePanel';
import { MainMenu } from '@/games/echo-of-ashes/components/MainMenu';
import GameCanvas from '@/games/echo-of-ashes/GameCanvas';
import '@/games/echo-of-ashes/game.css';

export default function EchoOfAshesPage() {
  const [activePanel, setActivePanel] = useState<GamePanelId | null>(null);
  const [quality, setQuality] = useState<GraphicsQuality>('cinematic');
  const [sensitivity, setSensitivity] = useState(0.8);

  return (
    <main className="game-shell">
      <div className="game-world" aria-hidden="true">
        <GameCanvas quality={quality} rotateSpeed={sensitivity} />
      </div>
      <div className="world-vignette" aria-hidden="true" />
      <div className="atmosphere-grain" aria-hidden="true" />

      <header className="topbar">
        <Link className="brand-lockup" to="/games" aria-label="العودة إلى الألعاب">
          <span className="brand-mark">EA</span>
          <span className="brand-wordmark">
            <strong>ECHO <i>OF</i> ASHES</strong>
            <small>صَدى الرَّماد</small>
          </span>
        </Link>
        <div className="world-status"><i /> معاينة العالم <span>WORLD PREVIEW</span></div>
      </header>

      {activePanel ? (
        <div className="panel-stage">
          <FeaturePanel
            panel={activePanel}
            quality={quality}
            sensitivity={sensitivity}
            onQualityChange={setQuality}
            onSensitivityChange={setSensitivity}
            onBack={() => setActivePanel(null)}
          />
        </div>
      ) : (
        <div className="main-stage">
          <section className="intro-panel" dir="rtl" aria-labelledby="game-title">
            <span className="intro-kicker"><i /> ما وراء الأفق الأخير</span>
            <h1 id="game-title" className="intro-title">صدى <em>الرماد</em></h1>
            <p className="intro-english">ECHO OF ASHES</p>
            <p className="intro-description">
              عالمٌ ينهض من الغبار. اكتشف حدود الصحراء في معاينة ثلاثية الأبعاد،
              وتعرّف على الرحلة القادمة.
            </p>
            <div className="intro-divider"><span /><i>✦</i><span /></div>
            <div className="world-caption">
              <span className="caption-index">01</span>
              <span><strong>جبهة الصحراء</strong><small>DESERT FRONTIER</small></span>
            </div>
          </section>
          <MainMenu onSelect={setActivePanel} />
        </div>
      )}

      <footer className="bottom-bar">
        <span className="footer-title">ECHO OF ASHES <i>©</i> 2026</span>
        <span className="footer-build"><i /> نموذج استكشافي · BUILD 0.1.0</span>
        <span className="drag-hint"><b>↔</b> اسحب المشهد لاستكشاف الصحراء</span>
      </footer>
    </main>
  );
}
