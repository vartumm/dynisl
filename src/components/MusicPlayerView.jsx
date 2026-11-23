import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Mic, ChevronUp, Disc3 } from 'lucide-react';
import SyncedLyricsView from './SyncedLyricsView';
import SoundVisualizer from './SoundVisualizer';

export default function MusicPlayerView({
  musicInfo,
  lyricsData,
  currentTimeSec: externalTimeSec,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onClose,
  theme,
  isLyricsOpen,
  setIsLyricsOpen
}) {
  const isPlaying = musicInfo?.Status === 'Playing';
  const durationMs = musicInfo?.DurationMs || 0;
  const initialPosMs = (externalTimeSec ? externalTimeSec * 1000 : musicInfo?.PositionMs) || 0;

  const [currentPosMs, setCurrentPosMs] = useState(initialPosMs);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);

  useEffect(() => {
    if (!isDraggingSeek && typeof externalTimeSec === 'number') {
      setCurrentPosMs(externalTimeSec * 1000);
    }
  }, [externalTimeSec, isDraggingSeek]);

  useEffect(() => {
    if (externalTimeSec !== undefined) return;
    setCurrentPosMs(musicInfo?.PositionMs || 0);
  }, [musicInfo?.PositionMs, externalTimeSec]);

  useEffect(() => {
    if (externalTimeSec !== undefined || !isPlaying || isDraggingSeek) return;
    const interval = setInterval(() => {
      setCurrentPosMs((prev) => {
        if (durationMs > 0 && prev >= durationMs) return prev;
        return prev + 500;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, durationMs, isDraggingSeek, externalTimeSec]);

  const formatTime = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = String(totalSec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const currentSec = currentPosMs / 1000;
  const progressPercent = durationMs > 0 ? Math.min(100, (currentPosMs / durationMs) * 100) : 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box'
      }}
    >
      {isLyricsOpen ? (
        <SyncedLyricsView
          lyricsData={lyricsData}
          currentTimeSec={currentSec}
          onSeek={onSeek}
          onClose={() => setIsLyricsOpen(false)}
          trackTitle={musicInfo?.Title || 'Трек'}
          trackArtist={musicInfo?.Artist || 'Исполнитель'}
          theme={theme}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '14px 20px',
            width: '100%',
            height: '100%',
            boxSizing: 'border-box'
          }}
        >
          {/* Top Row: App Header & Collapse */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SoundVisualizer isPlaying={isPlaying} color={theme?.accent || '#38bdf8'} barCount={4} />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: 'rgba(255, 255, 255, 0.65)',
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase'
                }}
              >
                {musicInfo?.AppId ? musicInfo.AppId.replace('.exe', '') : 'Сейчас играет'}
              </span>
            </div>

            <button
              onClick={onClose}
              title="Свернуть"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer'
              }}
            >
              <ChevronUp size={14} />
            </button>
          </div>

          {/* Middle Row: Album Artwork + Track Information */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '4px 0 10px 0' }}>
            {musicInfo?.ThumbnailBase64 ? (
              <img
                src={musicInfo.ThumbnailBase64}
                alt="Album Cover"
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '12px',
                  objectFit: 'cover',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.12)'
                }}
              />
            ) : (
              <div
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0284c7, #6366f1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)'
                }}
              >
                <Disc3 size={30} color="#ffffff" />
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: '700',
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  letterSpacing: '-0.3px'
                }}
              >
                {musicInfo?.Title || 'Неизвестный трек'}
              </div>
              <div
                style={{
                  fontSize: '12.5px',
                  fontWeight: '500',
                  color: 'rgba(255, 255, 255, 0.65)',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  marginTop: '1px'
                }}
              >
                {musicInfo?.Artist || 'Неизвестный исполнитель'}
              </div>
              {musicInfo?.Album && (
                <div
                  style={{
                    fontSize: '10.5px',
                    color: 'rgba(255, 255, 255, 0.4)',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    marginTop: '1px'
                  }}
                >
                  {musicInfo.Album}
                </div>
              )}
            </div>
          </div>

          {/* Seeker Bar */}
          <div style={{ marginBottom: '10px' }}>
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '5px',
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '9999px',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                const targetMs = ratio * durationMs;
                setCurrentPosMs(targetMs);
                onSeek(targetMs);
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${progressPercent}%`,
                  background: theme?.accent || '#38bdf8',
                  borderRadius: '9999px',
                  transition: isDraggingSeek ? 'none' : 'width 0.2s linear'
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: 'rgba(255, 255, 255, 0.5)',
                marginTop: '4px',
                fontFamily: "'JetBrains Mono', monospace"
              }}
            >
              <span>{formatTime(currentPosMs)}</span>
              <span>{formatTime(durationMs)}</span>
            </div>
          </div>

          {/* Controls Row (Positioned higher, prominent & responsive) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '2px'
            }}
          >
            {/* Lyrics Button */}
            <button
              onClick={() => setIsLyricsOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: lyricsData?.synced ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                color: lyricsData?.synced ? '#38bdf8' : 'rgba(255, 255, 255, 0.85)',
                border: lyricsData?.synced ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid transparent',
                borderRadius: '9999px',
                padding: '6px 12px',
                fontSize: '11.5px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Mic size={14} />
              <span>Текст песни</span>
            </button>

            {/* Playback Controls with scale feedback */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPrev();
                }}
                title="Предыдущий трек"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.1s ease, background 0.15s'
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.88)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <SkipBack size={16} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayPause();
                }}
                title={isPlaying ? 'Пауза' : 'Играть'}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(255, 255, 255, 0.4)',
                  transition: 'transform 0.1s ease'
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.9)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {isPlaying ? <Pause size={20} fill="#000000" /> : <Play size={20} fill="#000000" style={{ marginLeft: '2px' }} />}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
                title="Следующий трек"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.1s ease, background 0.15s'
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.88)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <SkipForward size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
