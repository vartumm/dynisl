import React, { useState } from 'react';
import { Search, Pin, Trash2, Check, Copy, ChevronUp, Image as ImageIcon, FileText } from 'lucide-react';

export default function ClipboardView({
  items = [],
  onSelectItem,
  onPinItem,
  onRemoveItem,
  onClear,
  onClose,
  theme
}) {
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const filtered = items.filter((item) => {
    if (!search) return true;
    return (item.Text || '').toLowerCase().includes(search.toLowerCase());
  });

  const handleCopy = (item) => {
    if (item.Type === 'text') {
      onSelectItem(item.Text);
    }
    setCopiedId(item.Id);
    setTimeout(() => setCopiedId(null), 1200);
  };

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
          marginBottom: '12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'rgba(56, 189, 248, 0.15)',
              color: theme?.accent || '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Copy size={13} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700' }}>Буфер обмена</div>
            <div style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.5)' }}>
              История Win+V • {items.length} записей
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {items.length > 0 && (
            <button
              onClick={onClear}
              title="Очистить незакрепленные"
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#f87171',
                border: 'none',
                borderRadius: '8px',
                padding: '4px 8px',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Trash2 size={12} />
              <span>Очистить</span>
            </button>
          )}

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
      </div>

      {/* Search Input */}
      <div
        style={{
          position: 'relative',
          marginBottom: '10px'
        }}
      >
        <Search
          size={14}
          color="rgba(255, 255, 255, 0.4)"
          style={{ position: 'absolute', left: '10px', top: '9px' }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по скопированному тексту..."
          style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.07)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '10px',
            padding: '7px 12px 7px 32px',
            color: '#ffffff',
            fontSize: '12px',
            outline: 'none',
            fontFamily: 'inherit'
          }}
        />
      </div>

      {/* Clipboard Items List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingRight: '4px'
        }}
      >
        {filtered.length > 0 ? (
          filtered.map((item) => {
            const isCopied = copiedId === item.Id;
            return (
              <div
                key={item.Id}
                onClick={() => handleCopy(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: isCopied
                    ? 'rgba(34, 197, 94, 0.15)'
                    : item.IsPinned
                    ? 'rgba(56, 189, 248, 0.1)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: isCopied
                    ? '1px solid rgba(34, 197, 94, 0.4)'
                    : item.IsPinned
                    ? '1px solid rgba(56, 189, 248, 0.25)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  {item.Type === 'image' ? (
                    <img
                      src={item.ImageBase64}
                      alt="Thumbnail"
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '6px',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255, 255, 255, 0.6)'
                      }}
                    >
                      <FileText size={15} />
                    </div>
                  )}

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: '12.5px',
                        fontWeight: '500',
                        color: isCopied ? '#86efac' : '#ffffff',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        fontFamily: item.Type === 'text' && item.Text.includes('\n') ? "'JetBrains Mono', monospace" : 'inherit'
                      }}
                    >
                      {item.Text || '[Изображение]'}
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)', marginTop: '2px' }}>
                      {item.Type === 'text' ? `${item.Text.length} симв.` : 'Изображение'}
                    </div>
                  </div>
                </div>

                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => onPinItem(item.Id)}
                    title={item.IsPinned ? 'Открепить' : 'Закрепить'}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: item.IsPinned ? (theme?.accent || '#38bdf8') : 'rgba(255, 255, 255, 0.4)',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    <Pin size={13} fill={item.IsPinned ? 'currentColor' : 'none'} />
                  </button>

                  <button
                    onClick={() => onRemoveItem(item.Id)}
                    title="Удалить"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255, 255, 255, 0.35)',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
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
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: '12px',
              gap: '6px'
            }}
          >
            <Copy size={24} opacity={0.5} />
            <span>Буфер обмена пуст</span>
          </div>
        )}
      </div>
    </div>
  );
}
