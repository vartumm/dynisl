import React from 'react';
import { Bell, BellOff, Trash2, ChevronUp, X, MessageSquare } from 'lucide-react';

export default function NotificationCenterView({
  notifications = [],
  onClearAll,
  onRemoveItem,
  onClose,
  theme
}) {
  const getAppMeta = (app = '') => {
    const a = app.toLowerCase();
    if (a.includes('discord')) return { name: 'Discord', color: '#5865F2' };
    if (a.includes('telegram') || a.includes('tg')) return { name: 'Telegram', color: '#2AABEE' };
    if (a.includes('vk') || a.includes('вконтакте')) return { name: 'ВКонтакте', color: '#0077FF' };
    if (a.includes('whatsapp')) return { name: 'WhatsApp', color: '#25D366' };
    if (a.includes('chrome') || a.includes('brave') || a.includes('edge') || a.includes('яндекс') || a.includes('browser')) {
      return { name: 'Браузер', color: '#F59E0B' };
    }
    return { name: app || 'Система', color: '#38bdf8' };
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
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
            <Bell size={13} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700' }}>Центр уведомлений</div>
            <div style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.5)' }}>
              {notifications.length > 0 ? `${notifications.length} уведомлений` : 'Нет новых уведомлений'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {notifications.length > 0 && (
            <button
              onClick={onClearAll}
              title="Очистить все уведомления"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '8px',
                padding: '5px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
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

      {/* Notifications List */}
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
        {notifications.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.4)',
              gap: '8px'
            }}
          >
            <BellOff size={28} />
            <div style={{ fontSize: '13px', fontWeight: '600' }}>Уведомлений пока нет</div>
            <div style={{ fontSize: '11px', textAlign: 'center', maxWidth: '280px', lineHeight: 1.4 }}>
              Все входящие сообщения из Telegram, Discord и других программ будут появляться в острове и сохраняться здесь
            </div>
          </div>
        ) : (
          notifications.map((item) => {
            const meta = getAppMeta(item.app || item.appName);
            return (
              <div
                key={item.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  transition: 'background 0.2s',
                  position: 'relative'
                }}
              >
                {/* App Icon / Badge */}
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    background: meta.color,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                    boxShadow: `0 2px 8px ${meta.color}44`
                  }}
                >
                  <MessageSquare size={15} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '2px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#ffffff',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {item.author || item.title || item.appName}
                      </span>
                      <span
                        style={{
                          fontSize: '9.5px',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: `${meta.color}22`,
                          color: meta.color,
                          fontWeight: '600'
                        }}
                      >
                        {meta.name}
                      </span>
                    </div>

                    <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)', flexShrink: 0 }}>
                      {formatTime(item.timestamp)}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '11.5px',
                      color: 'rgba(255, 255, 255, 0.75)',
                      lineHeight: 1.35,
                      wordBreak: 'break-word'
                    }}
                  >
                    {item.message || item.body || ''}
                  </div>
                </div>

                {/* Remove single button */}
                <button
                  onClick={() => onRemoveItem(item.id)}
                  title="Удалить"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.3)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.3)';
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
