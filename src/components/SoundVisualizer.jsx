import React, { useEffect, useState } from 'react';

/**
 * Animated sound visualizer diagram:
 * When playing: dancing organic audio equalizer bars.
 * When stopped/paused: peaceful resting dots/line.
 */
export default function SoundVisualizer({ isPlaying = false, color = '#38bdf8', barCount = 4 }) {
  const [heights, setHeights] = useState(() => Array(barCount).fill(3));

  useEffect(() => {
    if (!isPlaying) {
      // Transition to peaceful resting state
      setHeights(Array(barCount).fill(3));
      return;
    }

    // Dynamic animation loop for playing state
    const interval = setInterval(() => {
      setHeights(
        Array.from({ length: barCount }, () => Math.floor(Math.random() * 12) + 4)
      );
    }, 140);

    return () => clearInterval(interval);
  }, [isPlaying, barCount]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2.5px',
        height: '18px',
        padding: '0 2px'
      }}
    >
      {heights.map((h, i) => (
        <div
          key={i}
          className="sound-bar"
          style={{
            height: `${isPlaying ? h : 3}px`,
            backgroundColor: isPlaying ? color : 'rgba(255, 255, 255, 0.35)',
            opacity: isPlaying ? 1 : 0.6,
            transition: 'height 0.14s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease'
          }}
        />
      ))}
    </div>
  );
}
