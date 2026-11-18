import React from 'react';

/**
 * Authentic Apple iOS-style animated toggle switch.
 */
export default function IosToggle({ checked, onChange, activeColor = '#34c759' }) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      style={{
        width: '38px',
        height: '22px',
        borderRadius: '9999px',
        background: checked ? activeColor : 'rgba(255, 255, 255, 0.22)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background-color 0.25s ease, box-shadow 0.25s ease',
        boxShadow: checked ? `0 0 10px ${activeColor}55` : 'none',
        flexShrink: 0
      }}
    >
      <div
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: '#ffffff',
          position: 'absolute',
          top: '2px',
          left: '2px',
          transform: checked ? 'translateX(16px)' : 'translateX(0)',
          transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.35)'
        }}
      />
    </div>
  );
}
