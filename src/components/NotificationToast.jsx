import React from 'react';
import { X, MessageSquare, Send, Reply, Bell } from 'lucide-react';

export default function NotificationToast({
  notification,
  onDismiss,
  onOpenCenter,
  theme
}) {
  if (!notification) return null;

  const getAppMeta = (app = '', appName = '') => {
    const a = (app + ' ' + appName).toLowerCase();
    if (a.includes('discord')) return { name: 'Discord', color: '#5865F2', scheme: 'discord://' };
    if (a.includes('telegram') || a.includes('tg')) return { name: 'Telegram', color: '#2AABEE', scheme: 'tg://' };
    if (a.includes('vk') || a.includes('вконтакте')) return { name: 'ВКонтакте', color: '#0077FF', scheme: 'https://vk.com' };
    if (a.includes('whatsapp')) return { name: 'WhatsApp', color: '#25D366', scheme: 'whatsapp://' };
    if (a.includes('chrome') || a.includes('brave') || a.includes('edge') || a.includes('яндекс') || a.includes('browser')) {
      return { name: appName || 'Браузер', color: '#F59E0B', scheme: null };
    }
    return { name: appName || 'Уведомление', color: '#38BDF8', scheme: null };
  };

  const meta = getAppMeta(notification.app, notification.appName);
  const appColor = meta.color;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: '0 16px',
        boxSizing: 'border-box',
        gap: '12px'
      }}
    >
      <div
        onClick={onOpenCenter}
        title="Нажмите, чтобы открыть центр уведомлений"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          minWidth: 0,
          flex: 1,
          cursor: 'pointer'
        }}
      >
        {/* Avatar or App Icon */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {notification.avatar ? (
            <img
              src={notification.avatar}
              alt="Avatar"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: appColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}
            >
              <MessageSquare size={16} />
            </div>
          )}
          {/* Mini app indicator badge */}
          <div
            style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: appColor,
              border: '2px solid #000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          />
        </div>

        {/* Text Details */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '12.5px',
                fontWeight: '700',
                color: '#ffffff',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {notification.author || notification.appName || 'Уведомление'}
            </span>
            <span style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.45)', flexShrink: 0 }}>
              • {notification.appName || meta.name}
            </span>
          </div>
          <div
            style={{
              fontSize: '11.5px',
              color: 'rgba(255, 255, 255, 0.85)',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              marginTop: '1px'
            }}
          >
            {notification.message}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {meta.scheme && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.dynislAPI?.openExternal(meta.scheme);
              onDismiss();
            }}
            title="Открыть приложение"
            style={{
              background: `${appColor}25`,
              color: appColor,
              border: `1px solid ${appColor}50`,
              borderRadius: '9999px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Reply size={12} />
            <span>Открыть</span>
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          title="Скрыть"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            transition: 'background 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
