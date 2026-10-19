import { useEffect } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react';
import './Youssef555Page.css';

const interests = ['Learning', 'Creativity', 'Technology'];

export default function Youssef555Page() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Youssef555 - Personal Introduction';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="youssef-page" lang="en" dir="ltr">
      <div className="youssef-shell">
        <header className="youssef-header">
          <a className="youssef-mark" href="#top" aria-label="Youssef555 home">Y<span>555</span></a>
          <nav className="youssef-nav" aria-label="Main navigation">
            <a href="#about">About</a>
            <a href="#interests">Interests</a>
            <a className="youssef-nav-contact" href="#hello">Say hello <ArrowUpRight size={15} /></a>
          </nav>
        </header>

        <section className="youssef-hero" id="top" aria-labelledby="youssef-title">
          <div className="youssef-hero-copy">
            <p className="youssef-eyebrow"><span /> A LITTLE INTRODUCTION</p>
            <h1 id="youssef-title">Hello,<br />I’m <span>Youssef.</span></h1>
            <p className="youssef-lead">Curious by nature. Always learning. Happy to meet you.</p>
            <a className="youssef-cta" href="#about">Get to know me <ArrowRight size={17} /></a>
          </div>

          <div className="youssef-hero-art" role="img" aria-label="Deep-Signal interface preview on desktop and mobile">
            <div className="youssef-preview-heading"><span>DEEP-SIGNAL / PRODUCT PREVIEW</span><span>DESKTOP + MOBILE</span></div>
            <div className="youssef-device-pair" aria-hidden="true">
              <div className="youssef-desktop-device">
                <div className="youssef-app-screen">
                  <aside className="youssef-app-sidebar">
                    <div className="youssef-app-brand"><span>DS</span><b>DEEP-SIGNAL</b></div>
                    <p className="youssef-app-menu-label">WORKSPACE</p>
                    <div className="youssef-app-link active">Overview</div>
                    <div className="youssef-app-link">Community</div>
                    <div className="youssef-app-link">Messages</div>
                    <div className="youssef-app-link">Analytics</div>
                    <div className="youssef-app-profile"><span>Y</span><div><b>Youssef</b><small>Member</small></div></div>
                  </aside>
                  <div className="youssef-app-main">
                    <header className="youssef-app-topline"><div><small>MONDAY, OCTOBER 12</small><b>Good evening, Youssef</b></div><span className="youssef-app-avatar">Y</span></header>
                    <div className="youssef-app-stats">
                      <div><small>Connections</small><b>2,480</b><span>+12.8%</span></div>
                      <div><small>Engagement</small><b>8.64%</b><span>+4.2%</span></div>
                      <div><small>Reach</small><b>18.2k</b><span>+9.1%</span></div>
                    </div>
                    <div className="youssef-app-panels">
                      <div className="youssef-app-panel"><div className="youssef-panel-title"><b>Activity overview</b><small>Last 7 days</small></div><div className="youssef-chart"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><div className="youssef-chart-labels"><span>MON</span><span>WED</span><span>FRI</span><span>SUN</span></div></div>
                      <div className="youssef-app-panel"><div className="youssef-panel-title"><b>Recent signals</b><small>View all</small></div><div className="youssef-signal"><span>Y</span><div><b>New connection</b><small>2 minutes ago</small></div></div><div className="youssef-signal"><span className="gold">S</span><div><b>Post engagement</b><small>18 minutes ago</small></div></div></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="youssef-phone-device">
                <div className="youssef-phone-screen">
                  <div className="youssef-phone-time"><span>9:41</span><span>● ● ●</span></div>
                  <div className="youssef-phone-brand"><span>DS</span><b>Deep-Signal</b><i>Y</i></div>
                  <p className="youssef-phone-greeting">Good evening,<br /><b>Youssef</b></p>
                  <div className="youssef-phone-highlight"><small>YOUR COMMUNITY</small><b>2,480</b><span>connections <em>+12.8%</em></span></div>
                  <div className="youssef-phone-section"><b>Recent signals</b><span>See all</span></div>
                  <div className="youssef-phone-activity"><i>Y</i><div><b>New connection</b><small>Just now</small></div><span>+</span></div>
                  <div className="youssef-phone-activity"><i className="gold">S</i><div><b>Post engagement</b><small>18 min ago</small></div><span>↗</span></div>
                  <div className="youssef-phone-nav"><span>⌂</span><span>◉</span><span>＋</span><span>♡</span></div>
                </div>
              </div>
            </div>
            <div className="youssef-stage-caption"><span>ONE EXPERIENCE, EVERY SCREEN</span><span>01 — 02</span></div>
          </div>
          <a className="youssef-scroll" href="#about"><span>SCROLL TO EXPLORE</span><ArrowDown size={14} /></a>
        </section>

        <section className="youssef-about" id="about" aria-labelledby="about-title">
          <div className="youssef-section-label"><span>01</span> / ABOUT</div>
          <div className="youssef-about-copy">
            <h2 id="about-title">A bit about me<span>.</span></h2>
            <p>I’m Youssef, a curious person who enjoys discovering new ideas, learning useful things, and finding creative ways to make them matter.</p>
            <p>I believe every conversation can teach you something, and every new day is a chance to grow.</p>
          </div>
          <div className="youssef-interests" id="interests">
            <p className="youssef-interests-label">THINGS I’M DRAWN TO</p>
            {interests.map((interest, index) => (
              <div className="youssef-interest" key={interest}>
                <span className="youssef-interest-number">0{index + 1}</span>
                <span>{interest}</span>
                <ArrowUpRight size={17} />
              </div>
            ))}
          </div>
        </section>

        <footer className="youssef-footer" id="hello">
          <span>THANKS FOR STOPPING BY</span>
          <span>Youssef555 <span className="youssef-footer-dot">●</span> NICE TO MEET YOU</span>
        </footer>
      </div>
    </main>
  );
}