import React, { useEffect, useRef } from 'react';
import { getActiveLineIndex } from '../services/lyricsService';
import { Mic, Search, ChevronUp, Music } from 'lucide-react';

export default function SyncedLyricsView({
  lyricsData,
  currentTimeSec,
  onSeek,
  onClose,
  trackTitle,
  trackArtist,
  theme
}) {
  const scrollContainerRef = useRef(null);
  const activeLineRef = useRef(null);

  const lines = lyricsData?.lines || [];
  const isSynced = lyricsData?.synced;
  const activeIndex = isSynced ? getActiveLineIndex(lines, currentTimeSec) : -1;

  // Auto-scroll active lyric line to center of container
  useEffect(() => {
    if (activeLineRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const element = activeLineRef.current;

      const elementTop = element.offsetTop;
      const elementHeight = element.offsetHeight;
      const containerHeight = container.offsetHeight;

      container.scrollTo({
        top: elementTop - containerHeight / 2 + elementHeight / 2,
        behavior: 'smooth'
      });
    }
  }, [activeIndex]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        padding: '16px 20px',
        boxSizing: 'border-box'
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'rgba(56, 189, 248, 0.15)',
              color: theme?.accent || '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Mic size={14} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '-0.2px' }}>
              Текст песни (Караоке)
            </div>
            <div style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.5)' }}>
              {trackArtist} — {trackTitle}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          title="Скрыть караоке"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '9999px',
            padding: '4px 10px',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <ChevronUp size={13} />
          <span>Свернуть</span>
        </button>
      </div>

      {/* Lyrics Scroll Container */}
      <div
        ref={scrollContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          paddingTop: '20px',
          paddingBottom: '60px'
        }}
      >
        {lines.length > 0 ? (
          lines.map((line, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={idx}
                ref={isActive ? activeLineRef : null}
                className={`lyrics-line ${isActive ? 'active' : 'inactive'}`}
                onClick={() => isSynced && onSeek(line.time * 1000)}
                title={isSynced ? `Перемотать на ${Math.floor(line.time / 60)}:${String(Math.floor(line.time % 60)).padStart(2, '0')}` : ''}
              >
                {line.text || '♪'}
              </div>
            );
          })
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '12px',
              textAlign: 'center'
            }}
          >
            <Music size={28} opacity={0.4} />
            <span>Синхронизированный текст для этой песни ищется или не найден</span>
          </div>
        )}
      </div>
    </div>
  );
}
