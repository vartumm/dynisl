import React, { useRef, useEffect, useState } from 'react';
import { Mic, Music2, Sparkles, Pause } from 'lucide-react';

export default function CompactKaraokeView({
  karaokeState,
  musicInfo,
  theme,
  onOpenLyrics,
  onOpenMusic
}) {
  const textContainerRef = useRef(null);
  const textMeasureRef = useRef(null);
  const [scrollX, setScrollX] = useState(0);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const {
    hasLyrics,
    isSynced,
    isPaused: statePaused,
    mode,
    currentLine,
    nextLine,
    countdown,
    progress
  } = karaokeState || {
    hasLyrics: false,
    isSynced: false,
    isPaused: false,
    mode: 'none',
    currentLine: '',
    nextLine: '',
    countdown: 0,
    progress: 0
  };

  const isPaused = statePaused ?? (musicInfo?.Status !== 'Playing');
  const accentColor = theme?.accent || '#38bdf8';
  const fillPercent = Math.min(100, Math.max(0, Math.round(progress * 100)));

  // Scaled dynamic font size to ensure high readability with zero awkward clipping
  let fontSize = '12.8px';
  if (currentLine && currentLine.length > 46) {
    fontSize = '10.5px';
  } else if (currentLine && currentLine.length > 34) {
    fontSize = '11.4px';
  } else if (currentLine && currentLine.length > 24) {
    fontSize = '12.2px';
  }

  // Measure text and handle gentle pan without EVER cutting off the start of the line!
  useEffect(() => {
    // When currentLine changes, immediately reset scroll to 0 so start of new line is instantly visible
    setScrollX(0);

    if (textMeasureRef.current && textContainerRef.current && mode === 'singing') {
      const textWidth = textMeasureRef.current.scrollWidth;
      const viewportWidth = textContainerRef.current.clientWidth;
      const diff = textWidth - viewportWidth;

      if (diff > 6) {
        setIsOverflowing(true);
        // Keep character 0 firmly visible for first 30% of the line!
        // Then smoothly pan to reveal end from 30% to 85%
        if (progress > 0.3) {
          const factor = Math.min(1, Math.max(0, (progress - 0.3) / 0.55));
          setScrollX(Math.round(diff * factor));
        } else {
          setScrollX(0);
        }
      } else {
        setIsOverflowing(false);
        setScrollX(0);
      }
    } else {
      setIsOverflowing(false);
      setScrollX(0);
    }
  }, [currentLine, progress, mode]);

  // Ad banner handling
  if (musicInfo?.IsAd) {
    return (
      <div
        className="compact-karaoke-root"
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          color: 'rgba(255, 255, 255, 0.75)',
          fontSize: '12px',
          fontWeight: '600'
        }}
      >
        <span>📢 Реклама</span>
      </div>
    );
  }

  return (
    <div
      className="compact-karaoke-root"
      style={{
        flex: 1,
        height: '100%',
        minWidth: 0,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: '0 6px',
        position: 'relative',
        userSelect: 'none'
      }}
      onClick={(e) => {
        e.stopPropagation();
        onOpenLyrics();
      }}
      title={
        isPaused
          ? (nextLine ? `Караоке (Пауза) • Далее: "${nextLine}" (Клик — открыть полный текст)` : 'Караоке (Пауза) • Клик — открыть полный текст')
          : (nextLine ? `Караоке • Далее: "${nextLine}" (Клик — открыть полный текст)` : 'Караоке (Клик — открыть полный текст)')
      }
    >
      {/* 1. ACTIVE SINGING: DUAL-LAYER HIGHLIGHT WITH ZERO CLIPPING */}
      {mode === 'singing' && currentLine ? (
        <div
          key={`singing-${currentLine}`}
          className="compact-karaoke-line-anim"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            position: 'relative',
            lineHeight: 1
          }}
        >
          {/* Glowing Microphone or Paused Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: isPaused ? 'rgba(255, 255, 255, 0.12)' : 'rgba(56, 189, 248, 0.15)',
              flexShrink: 0,
              boxShadow: isPaused ? 'none' : `0 0 10px ${accentColor}44`,
              transform: 'translateY(-0.5px)',
              transition: 'background 0.2s ease, box-shadow 0.2s ease'
            }}
          >
            {isPaused ? (
              <Pause size={10} color="rgba(255, 255, 255, 0.75)" />
            ) : (
              <Mic size={11} color={accentColor} />
            )}
          </div>

          {/* Text Viewport: aligned to flex-start when overflowing so START of line is NEVER clipped! */}
          <div
            ref={textContainerRef}
            style={{
              flex: 1,
              height: '100%',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isOverflowing ? 'flex-start' : 'center',
              lineHeight: 1
            }}
          >
            {/* Moving wrapper: pans to the right smoothly when text genuinely overflows */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                height: '100%',
                transform: `translateX(-${scrollX}px)`,
                transition: (isPaused || scrollX === 0) ? 'none' : 'transform 0.12s linear',
                position: 'relative',
                lineHeight: 1,
                whiteSpace: 'nowrap'
              }}
            >
              {/* Reference wrapper containing both layers */}
              <div
                ref={textMeasureRef}
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: '100%',
                  whiteSpace: 'nowrap',
                  lineHeight: 1
                }}
              >
                {/* LAYER 1 (Underneath): Crisp semi-transparent inactive text */}
                <span
                  style={{
                    fontSize,
                    fontWeight: '700',
                    letterSpacing: '-0.2px',
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    color: isPaused ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.45)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    lineHeight: 1,
                    transform: 'translateY(-1.5px)'
                  }}
                >
                  {currentLine}
                </span>

                {/* LAYER 2 (Overlay): Pure luminous white text revealed progressively by width */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: `${fillPercent}%`,
                    height: '100%',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    transition: isPaused ? 'none' : 'width 0.08s linear',
                    display: 'flex',
                    alignItems: 'center',
                    lineHeight: 1
                  }}
                >
                  <span
                    style={{
                      fontSize,
                      fontWeight: '700',
                      letterSpacing: '-0.2px',
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      color: '#ffffff',
                      textShadow: `0 0 10px ${accentColor}, 0 0 18px rgba(255, 255, 255, 0.6)`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      lineHeight: 1,
                      transform: 'translateY(-1.5px)'
                    }}
                  >
                    {currentLine}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : mode === 'intro' ? (
        /* 2. INTRO MODE: Countdown until vocals start */
        <div
          key="intro-mode"
          className="compact-karaoke-line-anim"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px',
            width: '100%',
            height: '100%',
            whiteSpace: 'nowrap',
            lineHeight: 1
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: 'rgba(56, 189, 248, 0.15)',
              flexShrink: 0,
              transform: 'translateY(-0.5px)'
            }}
          >
            <Music2 size={11} color={accentColor} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', lineHeight: 1 }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: '600', transform: 'translateY(-1px)', display: 'inline-flex' }}>
              {isPaused ? 'Вступление (Пауза)' : 'Вступление'}
            </span>

            {/* Pulsing rhythmic dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', transform: 'translateY(-0.5px)' }}>
              <span className="karaoke-pulsing-dot dot-1" style={{ animationPlayState: isPaused ? 'paused' : 'running' }} />
              <span className="karaoke-pulsing-dot dot-2" style={{ animationPlayState: isPaused ? 'paused' : 'running' }} />
              <span className="karaoke-pulsing-dot dot-3" style={{ animationPlayState: isPaused ? 'paused' : 'running' }} />
            </div>

            {countdown > 0 && (
              <span
                style={{
                  background: 'rgba(56, 189, 248, 0.22)',
                  color: accentColor,
                  padding: '1px 6px',
                  borderRadius: '6px',
                  fontSize: '10.5px',
                  fontWeight: '700',
                  fontFamily: 'monospace',
                  lineHeight: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  transform: 'translateY(-1px)'
                }}
              >
                {countdown}с
              </span>
            )}
          </div>
        </div>
      ) : mode === 'interlude' ? (
        /* 3. INSTRUMENTAL PAUSE / GUITAR SOLO */
        <div
          key="interlude-mode"
          className="compact-karaoke-line-anim"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            width: '100%',
            height: '100%',
            whiteSpace: 'nowrap',
            lineHeight: 1
          }}
        >
          {isPaused ? (
            <Pause size={10} color="rgba(255, 255, 255, 0.75)" style={{ transform: 'translateY(-0.5px)' }} />
          ) : (
            <Sparkles size={11} color={accentColor} style={{ transform: 'translateY(-0.5px)' }} />
          )}
          <span style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '600', transform: 'translateY(-1px)', display: 'inline-flex' }}>
            {isPaused ? '♪ Проигрыш (Пауза) ♪' : '♪ Проигрыш ♪'}
          </span>

          {countdown > 0 && (
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: 'rgba(255, 255, 255, 0.8)',
                padding: '1px 5px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: '600',
                fontFamily: 'monospace',
                lineHeight: 1,
                display: 'inline-flex',
                alignItems: 'center',
                transform: 'translateY(-1px)'
              }}
            >
              {countdown}с
            </span>
          )}

          {nextLine && (
            <span
              style={{
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.45)',
                maxWidth: '120px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                transform: 'translateY(-1px)',
                display: 'inline-flex'
              }}
            >
              ({nextLine})
            </span>
          )}
        </div>
      ) : (
        /* 4. CLEAN TRACK TITLE AND ARTIST FALLBACK */
        <div
          key="fallback-title"
          style={{
            maxWidth: '280px',
            overflow: 'hidden',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            height: '100%',
            lineHeight: 1.2
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              color: '#ffffff'
            }}
          >
            {musicInfo?.Title || 'Музыка'}
          </div>
          {musicInfo?.Artist && (
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
          )}
        </div>
      )}
    </div>
  );
}
