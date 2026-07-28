// PlantLoadingOverlay — 全屏植物收藏主题 loading 动画
// 用于 /login /register 等异步提交等待时展示，缓解等待焦虑
'use client';
import { useEffect, useState } from 'react';

const MESSAGES_ZH = [
  '🌱 正在唤醒花园里的每一株植物…',
  '🌸 芍药们在整理花瓣，请稍等…',
  '🍃 玫瑰园的风带来消息，正在传递…',
  '🌷 玛凯娜杜鹃在向系统问好…',
  '🌿 满天星正串起你的收藏清单…',
  '🌺 温室的暖光已开启，准备就绪…',
  '🍂 系统在向 Peony 联盟核对你的身份…',
  '💐 快好了，最后一朵花正在到位…',
];
const MESSAGES_EN = [
  '🌱 Waking up every plant in the garden…',
  '🌸 Peonies are tidying their petals, please wait…',
  '🍃 The rose garden breeze is delivering your message…',
  '🌷 Makena rhododendrons say hello to the system…',
  '🌿 Gypsophila threads your collection list…',
  '🌺 The greenhouse lights are on, almost ready…',
  '🍂 Verifying you with the Peony Alliance…',
  '💐 Almost done, one last bloom clicking into place…',
];

export default function PlantLoadingOverlay({ show, lang = 'zh' }: { show: boolean; lang?: string }) {
  const [idx, setIdx] = useState(0);
  const msgs = (lang === 'en' || lang === 'ar') ? MESSAGES_EN : MESSAGES_ZH;

  useEffect(() => {
    if (!show) { setIdx(0); return; }
    const t = setInterval(() => setIdx(i => (i + 1) % msgs.length), 1500);
    return () => clearInterval(t);
  }, [show, msgs.length]);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'radial-gradient(circle at 50% 40%, rgba(220,252,231,0.96), rgba(240,253,244,0.98) 60%, rgba(255,247,237,0.99))',
      backdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      animation: 'plantFadeIn 0.4s ease',
    }}>
      <style>{`
        @keyframes plantFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes plantSpin { 0%,100% { transform: rotate(-8deg) scale(1) } 50% { transform: rotate(8deg) scale(1.08) } }
        @keyframes petalFloat { 0% { transform: translateY(0) rotate(0) } 100% { transform: translateY(-160px) rotate(360deg) } }
        @keyframes barSlide { 0% { left: -30% } 100% { left: 100% } }
        @keyframes textFade { 0%,100% { opacity: 0; transform: translateY(4px) } 15%,85% { opacity: 1; transform: translateY(0) } }
        .plant-petal { position: absolute; font-size: 20px; opacity: 0; animation: petalFloat 4s linear infinite; }
      `}</style>

      {/* floating petals */}
      {[...Array(6)].map((_, i) => (
        <span key={i} className="plant-petal" style={{
          left: `${10 + i * 15}%`, bottom: '20%',
          animationDelay: `${i * 0.6}s`, animationDuration: `${3.5 + (i % 3) * 0.8}s`,
          opacity: 0.7,
        }}>{['🌸', '🌺', '🌷', '🌿', '🍃', '💮'][i]}</span>
      ))}

      {/* central bloom */}
      <div style={{
        fontSize: 80, animation: 'plantSpin 2.2s ease-in-out infinite',
        filter: 'drop-shadow(0 8px 24px rgba(4,120,87,0.25))',
        marginBottom: 24,
      }}>🌸</div>

      {/* rotating message */}
      <div key={idx} style={{
        fontSize: 16, fontWeight: 500, color: '#047857',
        marginBottom: 20, minHeight: 24, textAlign: 'center', padding: '0 24px',
        animation: 'textFade 1.5s ease infinite',
        letterSpacing: '0.3px',
      }}>{msgs[idx]}</div>

      {/* indeterminate progress bar */}
      <div style={{
        width: 240, height: 6, background: 'rgba(4,120,87,0.12)',
        borderRadius: 6, overflow: 'hidden', position: 'relative',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
      }}>
        <div style={{
          position: 'absolute', top: 0, bottom: 0, width: '30%',
          background: 'linear-gradient(90deg, transparent, #10b981, #047857, transparent)',
          borderRadius: 6, animation: 'barSlide 1.4s ease-in-out infinite',
        }} />
      </div>

      <div style={{
        fontSize: 12, color: '#6b7280', marginTop: 16,
        fontFamily: '-apple-system, "PingFang SC", sans-serif',
      }}>
        {lang === 'en' ? 'Plant Collector · loading…' : '植物收藏家 · 加载中…'}
      </div>
    </div>
  );
}
