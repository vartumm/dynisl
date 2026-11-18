import React, { useState, useEffect } from 'react';
import { PhoneCall } from 'lucide-react';

/**
 * Secondary Mini-Island for Active Calls (Discord / Telegram):
 * - Detaches smoothly next to the main island
 * - Live Discord-style voice activation ring (glows green on speech)
 * - Call elapsed timer
 * - Clean, distraction-free Apple-grade pill
 */
export default function CallMiniIsland({
  isCallActive = false,
  isSpeaking = false,
  theme,
  appType = 'discord' // 'discord' or 'telegram'
}) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isCallActive) {
      setSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isCallActive]);

  if (!isCallActive) return null;

  const formatTimer = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = String(totalSec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div
      className="island-capsule island-interactive"
      style={{
        ...theme?.style,
        height: '36px',
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '9px',
        borderRadius: '20px',
        marginLeft: '10px',
        animation: 'absorb-wobble 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: isSpeaking
          ? '0 0 20px rgba(35, 165, 90, 0.5), 0 8px 24px rgba(0,0,0,0.6)'
          : theme?.style?.boxShadow
      }}
    >
      {/* Specular highlight */}
      {theme?.glassHighlight && <div className="glass-reflection-line" />}

      {/* Voice Activation Indicator Ring */}
      <div
        className={`voice-ring ${isSpeaking ? 'active' : ''}`}
        title={isSpeaking ? 'Ваш голос активен' : 'Голос не активен'}
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: appType === 'discord' ? '#5865F2' : '#2AABEE',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease'
        }}
      >
        <PhoneCall size={12} color="#ffffff" />
      </div>

      {/* Timer */}
      <div
        style={{
          fontSize: '11.5px',
          fontWeight: '700',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '-0.2px',
          color: isSpeaking ? '#23a55a' : '#ffffff'
        }}
      >
        {formatTimer(seconds)}
      </div>
    </div>
  );
}
