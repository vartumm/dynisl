import React from 'react';
import { X, MessageSquare, Reply, ExternalLink, Camera, Bell } from 'lucide-react';

export const getAppMeta = (app = '', appName = '') => {
  const a = (app + ' ' + appName).toLowerCase();
  if (a.includes('screenshot') || a.includes('screensketch') || a.includes('снимок') || a.includes('ножниц') || a.includes('фрагмент')) {
    return { name: 'Снимок экрана', color: '#10b981', scheme: 'ms-screensketch:', isScreenshot: true };
  }
  if (a.includes('telegram') || a.includes('tg') || a.includes('ayu') || a.includes('telegraph')) {
    return { name: a.includes('ayu') ? 'Telegram (AyuGram)' : 'Telegram', color: '#2AABEE', scheme: 'tg://' };
  }
  if (a.includes('discord')) {
    return { name: 'Discord', color: '#5865F2', scheme: 'discord://' };
  }
  if (a.includes('vk') || a.includes('вконтакте')) {
    return { name: 'ВКонтакте', color: '#0077FF', scheme: 'https://vk.com' };
  }
  if (a.includes('whatsapp')) {
    return { name: 'WhatsApp', color: '#25D366', scheme: 'whatsapp://' };
  }
  if (a.includes('chrome') || a.includes('brave') || a.includes('edge') || a.includes('яндекс') || a.includes('browser') || a.includes('opera') || a.includes('firefox')) {
    return { name: appName || 'Браузер', color: '#F59E0B', scheme: null };
  }
  return { name: appName || 'Уведомление', color: '#38BDF8', scheme: null };
};

export default function NotificationToast({
  notification,
  onDismiss,
  onOpenCenter,
  onActivate,
  theme
}) {
  if (!notification) return null;

  const meta = getAppMeta(notification.app, notification.appName);
  const appColor = meta.color;
  const isScreenshot = meta.isScreenshot || notification.app === 'screenshot';

  const handleActivate = (e) => {
    e?.stopPropagation?.();
    if (onActivate) {
      onActivate(notification);
    } else {
      window.dynislAPI?.activateApp?.({
        app: notification.app,
        scheme: meta.scheme,
        aumid: notification.aumid
      });
      if (meta.scheme) {
        window.dynislAPI?.openExternal(meta.scheme);
      }
      onDismiss?.();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: '0 14px',
        boxSizing: 'border-box',
        gap: '10px'
      }}
    >
      {/* Clickable Card Body: Clicking navigates to the app/screenshot */}
      <div
        onClick={handleActivate}
        title={isScreenshot ? 'Нажмите, чтобы открыть снимок в Ножницах' : `Нажмите, чтобы открыть ${meta.name}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          minWidth: 0,
          flex: 1,
          cursor: 'pointer',
          padding: '4px 6px',
          borderRadius: '14px',
          transition: 'background 0.15s ease'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        {/* Avatar or App / Screenshot Icon */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {notification.avatar ? (
            <img
              src={notification.avatar}
              alt="Preview"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: isScreenshot ? '7px' : '50%',
                objectFit: 'cover',
                border: `1px solid ${appColor}50`
              }}
            />
          ) : (
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: isScreenshot ? '8px' : '50%',
                background: appColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: `0 2px 8px ${appColor}55`
              }}
            >
              {isScreenshot ? <Camera size={16} /> : <MessageSquare size={16} />}
            </div>
          )}
          {/* Mini app indicator badge */}
          <div
            style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '11px',
              height: '11px',
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
        <div style={{ minWidth: 0, flex: 1, lineHeight: 1.2 }}>
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
              {notification.author || notification.appName || (isScreenshot ? 'Снимок экрана' : 'Уведомление')}
            </span>
            <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', flexShrink: 0 }}>
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
              marginTop: '2px'
            }}
          >
            {notification.message}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        {/* Open Button */}
        <button
          onClick={handleActivate}
          title={isScreenshot ? 'Открыть в Ножницах' : 'Открыть приложение'}
          style={{
            background: `${appColor}25`,
            color: '#ffffff',
            border: `1px solid ${appColor}60`,
            borderRadius: '9999px',
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'background 0.15s, transform 0.1s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${appColor}45`;
            e.currentTarget.style.transform = 'scale(1.03)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = `${appColor}25`;
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {isScreenshot ? <Camera size={12} /> : <ExternalLink size={12} />}
          <span>Открыть</span>
        </button>

        {/* Center Button */}
        {onOpenCenter && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenCenter();
            }}
            title="Центр уведомлений"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
          >
            <Bell size={12} />
          </button>
        )}

        {/* Dismiss Button */}
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
