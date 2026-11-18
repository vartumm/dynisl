import React, { useState, useEffect } from 'react';
import { Clipboard, FolderOpen, Settings, Mic } from 'lucide-react';
import SoundVisualizer from './SoundVisualizer';

export default function IdleView({
  settings,
  onOpenView,
  theme,
  isMusicPlaying = false,
  musicInfo = null,
  currentLyricLine = ''
}) {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTimeStr(`${hours}:${minutes}`);

      const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'нояб', 'дек'];
      setDateStr(`${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const hasMusic = musicInfo && musicInfo.HasSession && musicInfo.Title;
  const showCompactLyrics = isMusicPlaying && currentLyricLine && !musicInfo?.IsAd;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: '0 12px',
        gap: '10px',
        boxSizing: 'border-box'
      }}
    >
      {/* Left section: Time/Date or Thumbnail */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          flexShrink: 0
        }}
        onClick={(e) => {
          e.stopPropagation();
          onOpenView(hasMusic ? 'music' : 'clipboard');
        }}
      >
        {hasMusic ? (
          musicInfo.ThumbnailBase64 ? (
            <img
              src={musicInfo.ThumbnailBase64}
              alt="Album"
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                objectFit: 'cover',
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
              }}
            />
          ) : (
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px'
              }}
            >
              🎵
            </div>
          )
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
            <span
              style={{
                fontSize: '13px',
                fontWeight: '700',
                letterSpacing: '-0.3px',
                fontFamily: "'JetBrains Mono', monospace"
              }}
            >
              {timeStr}
            </span>
            {settings?.showDate !== false && (
              <span
                style={{
                  fontSize: '10.5px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontWeight: '500'
                }}
              >
                {dateStr}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Middle section: Moving Compact Lyrics with Marquee */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: '0 6px',
          position: 'relative'
        }}
        onClick={(e) => {
          e.stopPropagation();
          onOpenView(hasMusic ? 'music' : 'clipboard');
        }}
      >
        {showCompactLyrics ? (
          <div
            key={currentLyricLine}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              animation: 'compact-lyric-slide 0.35s cubic-bezier(0.2, 0.9, 0.3, 1)',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              maxWidth: '100%'
            }}
          >
            <Mic size={11} color={theme?.accent || '#38bdf8'} style={{ flexShrink: 0 }} />
            <span
              className={currentLyricLine.length > 28 ? 'text-marquee-scroll' : ''}
              style={{
                fontSize: '12px',
                fontWeight: '700',
                color: '#ffffff',
                textShadow: '0 0 10px rgba(56, 189, 248, 0.55)',
                display: 'inline-block'
              }}
            >
              {currentLyricLine}
            </span>
          </div>
        ) : hasMusic ? (
          <div style={{ maxWidth: '180px', overflow: 'hidden', textAlign: 'center' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden'
              }}
            >
              {musicInfo.Title}
            </div>
            <div
              style={{
                fontSize: '10px',
                color: 'rgba(255, 255, 255, 0.5)',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden'
              }}
            >
              {musicInfo.Artist}
            </div>
          </div>
        ) : null}
      </div>

      {/* Right section: Visualizer & Quick Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        {hasMusic && (
          <div
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            onClick={(e) => {
              e.stopPropagation();
              onOpenView('music');
            }}
          >
            <SoundVisualizer
              isPlaying={isMusicPlaying}
              color={theme?.accent || '#38bdf8'}
              barCount={4}
            />
          </div>
        )}

        <button
          title="Буфер обмена (Win+V / Alt+V)"
          onClick={(e) => {
            e.stopPropagation();
            onOpenView('clipboard');
          }}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '9999px',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255, 255, 255, 0.8)',
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
          }}
        >
          <Clipboard size={12} />
        </button>

        <button
          title="Полка файлов (Drag & Drop)"
          onClick={(e) => {
            e.stopPropagation();
            onOpenView('files');
          }}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '9999px',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255, 255, 255, 0.8)',
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
          }}
        >
          <FolderOpen size={12} />
        </button>

        <button
          title="Настройки острова"
          onClick={(e) => {
            e.stopPropagation();
            onOpenView('settings');
          }}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '9999px',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255, 255, 255, 0.8)',
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
          }}
        >
          <Settings size={12} />
        </button>
      </div>
    </div>
  );
}
