import type { GamePanelId, GraphicsQuality } from '../types/game-ui'

type FeaturePanelProps = {
  panel: GamePanelId
  quality: GraphicsQuality
  sensitivity: number
  onQualityChange: (quality: GraphicsQuality) => void
  onSensitivityChange: (sensitivity: number) => void
  onBack: () => void
}

const unavailablePanels: Record<Exclude<GamePanelId, 'settings'>, { title: string; eyebrow: string; message: string }> = {
  'new-adventure': {
    title: 'مغامرة جديدة',
    eyebrow: 'NEW ADVENTURE · COMING SOON',
    message: 'بداية القصة ونظام الحفظ غير موجودين في هذا النموذج بعد. المتاح حالياً هو استكشاف مشهد الصحراء ثلاثي الأبعاد.',
  },
  continue: {
    title: 'متابعة الرحلة',
    eyebrow: 'CONTINUE · NO SAVE DATA',
    message: 'لا يوجد نظام حفظ أو تقدم سابق في النموذج الحالي، لذلك لا يمكن استكمال مغامرة محفوظة بعد.',
  },
  garage: {
    title: 'المرآب',
    eyebrow: 'GARAGE · COMING SOON',
    message: 'مشهد المرآب والسيارات القابلة للاختيار لم يجهزا بعد. هذا القسم حالياً مجرد معاينة واضحة للحالة.',
  },
  'world-map': {
    title: 'خريطة العالم',
    eyebrow: 'WORLD MAP · COMING SOON',
    message: 'الخريطة التفاعلية ومناطق الاستكشاف ليست جزءاً من النموذج الحالي بعد.',
  },
  exit: {
    title: 'إلى اللقاء',
    eyebrow: 'EXIT GAME',
    message: 'اللعبة تعمل داخل المتصفح، لذلك لا يمكن إغلاق نافذته بأمان من هنا. يمكنك إغلاق علامة التبويب عندما تريد الخروج.',
  },
}

const qualityOptions: { id: GraphicsQuality; title: string; subtitle: string }[] = [
  { id: 'cinematic', title: 'سينمائي', subtitle: 'CINEMATIC' },
  { id: 'balanced', title: 'متوازن', subtitle: 'BALANCED' },
  { id: 'performance', title: 'أداء', subtitle: 'PERFORMANCE' },
]

export function FeaturePanel({
  panel,
  quality,
  sensitivity,
  onQualityChange,
  onSensitivityChange,
  onBack,
}: FeaturePanelProps) {
  const isSettings = panel === 'settings'
  const content = panel === 'settings' ? undefined : unavailablePanels[panel]

  return (
    <section className="feature-panel" dir="rtl" aria-labelledby="panel-title">
      <button className="back-button" type="button" onClick={onBack}>
        <span aria-hidden="true">→</span> رجوع للقائمة
      </button>

      {isSettings ? (
        <>
          <span className="panel-eyebrow">SETTINGS · إعدادات العرض</span>
          <h1 id="panel-title" className="panel-title">الإعدادات</h1>
          <p className="panel-description">غيّر جودة مشهد الصحراء وحساسية تحريك الكاميرا.</p>

          <div className="setting-block">
            <div className="setting-heading">
              <span>جودة الرسوم</span>
              <span className="setting-hint">GRAPHICS QUALITY</span>
            </div>
            <div className="quality-options" role="group" aria-label="جودة الرسوم">
              {qualityOptions.map((option) => (
                <button
                  className={`quality-option${quality === option.id ? ' is-selected' : ''}`}
                  type="button"
                  key={option.id}
                  aria-pressed={quality === option.id}
                  onClick={() => onQualityChange(option.id)}
                >
                  <span>{option.title}</span>
                  <small>{option.subtitle}</small>
                </button>
              ))}
            </div>
            <p className="setting-caption">يغيّر هذا الخيار دقة العرض والظلال مباشرةً.</p>
          </div>

          <div className="setting-block">
            <label className="setting-heading" htmlFor="camera-sensitivity">
              <span>حساسية الكاميرا</span>
              <span className="setting-value">{sensitivity.toFixed(1)}</span>
            </label>
            <input
              id="camera-sensitivity"
              className="sensitivity-slider"
              type="range"
              min="0.3"
              max="1.8"
              step="0.1"
              value={sensitivity}
              onChange={(event) => onSensitivityChange(Number(event.target.value))}
            />
            <div className="range-labels"><span>هادئة</span><span>سريعة</span></div>
          </div>

          <div className="setting-unavailable">
            <span className="unavailable-icon" aria-hidden="true">♪</span>
            <span><strong>الصوت</strong><small>غير متاح — لا يوجد نظام صوت في النموذج بعد</small></span>
            <span className="unavailable-tag">قريباً</span>
          </div>
        </>
      ) : (
        <div className="coming-soon-content">
          <span className="panel-eyebrow">{content!.eyebrow}</span>
          <div className="panel-emblem" aria-hidden="true">EA</div>
          <h1 id="panel-title" className="panel-title">{content!.title}</h1>
          <p className="panel-description">{content!.message}</p>
          <span className="prototype-status"><i /> نموذج بصري — ليس نظام لعب مكتملاً</span>
        </div>
      )}
    </section>
  )
}
