import React from 'react';
import { Languages, Check, ArrowRight } from 'lucide-react';

export default function LayoutFixerToast({ data, onDismiss }) {
  if (!data) return null;

  return (
    <div
      onClick={onDismiss}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        padding: '0 16px',
        gap: '10px',
        cursor: 'pointer'
      }}
    >
      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: 'rgba(34, 197, 94, 0.2)',
          color: '#4ade80',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Languages size={13} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
        <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontFamily: "'JetBrains Mono', monospace" }}>
          "{data.original}"
        </span>
        <ArrowRight size={12} color="#4ade80" />
        <span style={{ fontWeight: '700', color: '#ffffff', fontFamily: "'JetBrains Mono', monospace" }}>
          "{data.converted}"
        </span>
      </div>

      <div
        style={{
          fontSize: '10px',
          color: '#4ade80',
          background: 'rgba(34, 197, 94, 0.15)',
          padding: '2px 6px',
          borderRadius: '9999px',
          marginLeft: '4px'
        }}
      >
        Автозамена
      </div>
    </div>
  );
}
