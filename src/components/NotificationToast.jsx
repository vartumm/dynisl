import React from 'react';
import { X, MessageSquare, Send, Reply } from 'lucide-react';

export default function NotificationToast({
  notification,
  onDismiss,
  onOpenCenter,
  theme
}) {
  if (!notification) return null;

  const isDiscord = notification.app === 'discord';
  const appColor = isDiscord ? '#5865F2' : '#2AABEE';

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
        <div style={{ position: 'relative' }}>
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
            <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#ffffff' }}>
              {notification.author}
            </span>
            <span style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.45)' }}>
              • {notification.appName}
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          onClick={() => {
            if (isDiscord) window.dynislAPI?.openExternal('discord://');
            else window.dynislAPI?.openExternal('tg://');
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
          <span>Ответить</span>
        </button>

        <button
          onClick={onDismiss}
          title="Закрыть уведомление"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer'
          }}
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
