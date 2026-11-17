import type { GamePanelId } from '../types/game-ui'

const menuItems: { id: GamePanelId; title: string; subtitle: string; index: string }[] = [
  { id: 'new-adventure', title: 'مغامرة جديدة', subtitle: 'NEW ADVENTURE', index: '01' },
  { id: 'continue', title: 'متابعة الرحلة', subtitle: 'CONTINUE', index: '02' },
  { id: 'garage', title: 'المرآب', subtitle: 'GARAGE', index: '03' },
  { id: 'world-map', title: 'خريطة العالم', subtitle: 'WORLD MAP', index: '04' },
  { id: 'settings', title: 'الإعدادات', subtitle: 'SETTINGS', index: '05' },
  { id: 'exit', title: 'إنهاء', subtitle: 'EXIT GAME', index: '06' },
]

type MainMenuProps = {
  onSelect: (panel: GamePanelId) => void
}

export function MainMenu({ onSelect }: MainMenuProps) {
  return (
    <nav className="main-menu" aria-label="القائمة الرئيسية">
      <div className="menu-heading">
        <span className="section-kicker">رحلتك تبدأ من هنا</span>
        <span className="section-index">القائمة الرئيسية <i>—</i> MAIN MENU</span>
      </div>
      <div className="menu-list">
        {menuItems.map((item) => (
          <button
            className="menu-item"
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
          >
            <span className="menu-number" aria-hidden="true">{item.index}</span>
            <span className="menu-copy">
              <span className="menu-title">{item.title}</span>
              <span className="menu-subtitle">{item.subtitle}</span>
            </span>
            <span className="menu-arrow" aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
      <p className="menu-note">نسخة استكشافية — أنظمة اللعب قيد التطوير</p>
    </nav>
  )
}
