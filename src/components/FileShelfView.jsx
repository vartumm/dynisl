import React, { useState } from 'react';
import { Send, File, Share2, Folder, Copy, Trash2, ChevronUp, Pin, Check } from 'lucide-react';

export default function FileShelfView({
  files = [],
  onRemoveFile,
  onClearFiles,
  onClose,
  theme
}) {
  const [copiedId, setCopiedId] = useState(null);

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleShareTelegram = (file) => {
    // Copy path and trigger telegram URL scheme or open telegram
    window.dynislAPI?.copyFileToClipboard(file.path);
    window.dynislAPI?.openExternal('tg://');
  };

  const handleShareDiscord = (file) => {
    window.dynislAPI?.copyFileToClipboard(file.path);
    window.dynislAPI?.openExternal('discord://');
  };

  const handleCopyFile = (file) => {
    window.dynislAPI?.copyFileToClipboard(file.path);
    setCopiedId(file.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleOpenFile = (file) => {
    window.dynislAPI?.openPath(file.path);
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
            <Folder size={13} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700' }}>Полка файлов (Drag & Drop)</div>
            <div style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.5)' }}>
              Поглощение и быстрая отправка в соцсети
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {files.length > 0 && (
            <button
              onClick={onClearFiles}
              title="Очистить полку"
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

      {/* Files List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          paddingRight: '4px'
        }}
      >
        {files.length > 0 ? (
          files.map((file) => {
            const isCopied = copiedId === file.id;
            return (
              <div
                key={file.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <File size={18} />
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#ffffff',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden'
                      }}
                    >
                      {file.name}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.45)', marginTop: '2px' }}>
                      {formatSize(file.size)} • {file.name.split('.').pop()?.toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Quick Share Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => handleShareTelegram(file)}
                    title="Отправить в Telegram"
                    style={{
                      background: 'rgba(42, 171, 238, 0.15)',
                      color: '#2AABEE',
                      border: '1px solid rgba(42, 171, 238, 0.3)',
                      borderRadius: '8px',
                      padding: '5px 9px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Send size={12} />
                    <span>Telegram</span>
                  </button>

                  <button
                    onClick={() => handleShareDiscord(file)}
                    title="Отправить в Discord"
                    style={{
                      background: 'rgba(88, 101, 242, 0.15)',
                      color: '#5865F2',
                      border: '1px solid rgba(88, 101, 242, 0.3)',
                      borderRadius: '8px',
                      padding: '5px 9px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Share2 size={12} />
                    <span>Discord</span>
                  </button>

                  <button
                    onClick={() => handleCopyFile(file)}
                    title="Копировать файл в буфер"
                    style={{
                      background: isCopied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                      color: isCopied ? '#86efac' : 'rgba(255, 255, 255, 0.8)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '5px 8px',
                      cursor: 'pointer'
                    }}
                  >
                    {isCopied ? <Check size={13} /> : <Copy size={13} />}
                  </button>

                  <button
                    onClick={() => handleOpenFile(file)}
                    title="Показать в проводнике"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: 'rgba(255, 255, 255, 0.8)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '5px 8px',
                      cursor: 'pointer'
                    }}
                  >
                    <Folder size={13} />
                  </button>

                  <button
                    onClick={() => onRemoveFile(file.id)}
                    title="Убрать с полки"
                    style={{
                      background: 'none',
                      color: 'rgba(255, 255, 255, 0.35)',
                      border: 'none',
                      padding: '4px',
                      cursor: 'pointer'
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
              textAlign: 'center',
              gap: '8px'
            }}
          >
            <Folder size={28} opacity={0.4} />
            <span>Перетащите любой файл на Dynamic Island, чтобы поглотить его</span>
            <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.28)' }}>
              Файл останется здесь для быстрой отправки в Telegram или Discord
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
