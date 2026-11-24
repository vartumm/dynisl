import React, { useState, useEffect } from 'react';
import { Clipboard, FolderOpen, Settings, Mic, Bell } from 'lucide-react';
import SoundVisualizer from './SoundVisualizer';
import CompactKaraokeView from './CompactKaraokeView';

export default function IdleView({
  settings,
  onOpenView,
  theme,
  isMusicPlaying = false,
  musicInfo = null,
  currentLyricLine = '',
  karaokeState = null,
  notificationsCount = 0
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

  const hasMusic = Boolean(musicInfo && musicInfo.HasSession && musicInfo.Title);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: '0 10px',
        gap: '8px',
        boxSizing: 'border-box'
      }}
    >
      {/* Left section: Time/Date or Album Art */}
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
        title={hasMusic ? 'Открыть плеер' : 'Буфер обмена'}
      >
        {hasMusic ? (
          musicInfo.ThumbnailBase64 ? (
            <img
              src={musicInfo.ThumbnailBase64}
              alt="Album"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '7px',
                objectFit: 'cover',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                transition: 'transform 0.2s ease'
              }}
              className={isMusicPlaying ? 'album-art-playing' : ''}
            />
          ) : (
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '7px',
                background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
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

      {/* Middle section: Precision Compact Karaoke View */}
      {hasMusic ? (
        <CompactKaraokeView
          karaokeState={karaokeState}
          musicInfo={musicInfo}
          theme={theme}
          onOpenLyrics={() => onOpenView('lyrics')}
          onOpenMusic={() => onOpenView('music')}
        />
      ) : (
        <div style={{ flex: 1 }} />
      )}

      {/* Right section: Visualizer & Quick Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        {hasMusic && (
          <>
            <div
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              onClick={(e) => {
                e.stopPropagation();
                onOpenView('music');
              }}
              title="Открыть плеер"
            >
              <SoundVisualizer
                isPlaying={isMusicPlaying}
                color={theme?.accent || '#38bdf8'}
                barCount={4}
              />
            </div>

            <button
              title="Открыть караоке на весь экран"
              onClick={(e) => {
                e.stopPropagation();
                onOpenView('lyrics');
              }}
              style={{
                background: karaokeState?.isSynced ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '9999px',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: karaokeState?.isSynced ? (theme?.accent || '#38bdf8') : 'rgba(255, 255, 255, 0.8)',
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(56, 189, 248, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = karaokeState?.isSynced ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.08)';
              }}
            >
              <Mic size={12} />
            </button>
          </>
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
          title={notificationsCount > 0 ? `Уведомления (${notificationsCount})` : 'Центр уведомлений'}
          onClick={(e) => {
            e.stopPropagation();
            onOpenView('notifications');
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
            position: 'relative',
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
          <Bell size={12} />
          {notificationsCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#f59e0b',
                boxShadow: '0 0 6px #f59e0b'
              }}
            />
          )}
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
