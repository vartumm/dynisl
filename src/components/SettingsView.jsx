import React, { useState, useEffect } from 'react';
import { ISLAND_THEMES } from '../styles/islandThemes';
import IosToggle from './IosToggle';
import {
  Sliders,
  ChevronUp,
  Keyboard,
  Clipboard,
  EyeOff,
  Power,
  Calendar,
  Sparkles,
  Rocket,
  RefreshCw,
  Download,
  CheckCircle2,
  ArrowDownToLine,
  Bell
} from 'lucide-react';

export default function SettingsView({
  settings,
  onUpdateSettings,
  onClose,
  theme,
  initialTab
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'appearance');
  const [autoStart, setAutoStart] = useState(false);

  // Cloud Updater State
  const [versionInfo, setVersionInfo] = useState({ version: '1.0.0', isPackaged: false });
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle, checking, available, not-available, downloading, downloaded, error
  const [newVersionInfo, setNewVersionInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState({ percent: 0, transferred: 0, total: 0 });
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [lastCheckedTime, setLastCheckedTime] = useState('');

  useEffect(() => {
    window.dynislAPI?.getAutoStart?.().then((enabled) => {
      setAutoStart(Boolean(enabled));
    }).catch(() => {});

    window.dynislAPI?.getAppVersion?.().then((res) => {
      if (res) setVersionInfo(res);
    }).catch(() => {});

    window.dynislAPI?.getAutoUpdateSetting?.().then((enabled) => {
      setAutoUpdate(Boolean(enabled));
    }).catch(() => {});

    const unsub = window.dynislAPI?.onUpdaterEvent?.((payload) => {
      if (!payload) return;
      const { type } = payload;
      if (type === 'checking') {
        setUpdateStatus('checking');
        setStatusMessage('Связываемся с сервером обновлений...');
      } else if (type === 'available') {
        setUpdateStatus('available');
        setNewVersionInfo({
          version: payload.version,
          releaseNotes: payload.releaseNotes,
          releaseDate: payload.releaseDate
        });
        setStatusMessage(`Доступна новая версия v${payload.version}!`);
      } else if (type === 'not-available') {
        setUpdateStatus('not-available');
        setStatusMessage(payload.message || 'У вас установлена самая последняя версия.');
        setLastCheckedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else if (type === 'progress') {
        setUpdateStatus('downloading');
        setDownloadProgress({
          percent: payload.percent || 0,
          transferred: payload.transferred || 0,
          total: payload.total || 0
        });
      } else if (type === 'downloaded') {
        setUpdateStatus('downloaded');
        setStatusMessage(`Версия v${payload.version || ''} успешно загружена.`);
      } else if (type === 'error') {
        setUpdateStatus('error');
        setStatusMessage(payload.message || 'Ошибка проверки обновлений.');
      }
    });

    return () => unsub?.();
  }, []);

  const handleToggleAutoStart = async (val) => {
    setAutoStart(val);
    try {
      await window.dynislAPI?.setAutoStart?.(val);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCheckUpdates = async () => {
    setUpdateStatus('checking');
    setStatusMessage('Проверка наличия обновлений...');
    try {
      await window.dynislAPI?.checkForUpdates?.();
    } catch (err) {
      setUpdateStatus('error');
      setStatusMessage(err.message || 'Ошибка соединения с сервером обновлений.');
    }
  };

  const handleDownloadUpdate = async () => {
    setUpdateStatus('downloading');
    setDownloadProgress({ percent: 0, transferred: 0, total: 0 });
    try {
      await window.dynislAPI?.downloadUpdate?.();
    } catch (err) {
      setUpdateStatus('error');
      setStatusMessage(err.message || 'Ошибка загрузки обновления.');
    }
  };

  const handleInstallUpdate = () => {
    window.dynislAPI?.installUpdate?.();
  };

  const handleToggleAutoUpdate = async (val) => {
    setAutoUpdate(val);
    try {
      await window.dynislAPI?.setAutoUpdateSetting?.(val);
    } catch (e) {
      console.error(e);
    }
  };

  const currentThemeId = settings.themeId || 'liquid-glass';

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
          marginBottom: '10px',
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
            <Sliders size={13} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700' }}>Настройки Dynamic Island</div>
            <div style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.5)' }}>
              Встроенный центр управления
            </div>
          </div>
        </div>

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

      {/* Navigation tabs */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '14px',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '3px',
          borderRadius: '10px'
        }}
      >
        <button
          onClick={() => setActiveTab('appearance')}
          style={{
            flex: 1,
            padding: '6px 8px',
            fontSize: '11.5px',
            fontWeight: '600',
            background: activeTab === 'appearance' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
            color: activeTab === 'appearance' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
            border: 'none',
            borderRadius: '7px',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          🎨 Оформление
        </button>
        <button
          onClick={() => setActiveTab('features')}
          style={{
            flex: 1,
            padding: '6px 8px',
            fontSize: '11.5px',
            fontWeight: '600',
            background: activeTab === 'features' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
            color: activeTab === 'features' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
            border: 'none',
            borderRadius: '7px',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          ⚡ Утилиты
        </button>
        <button
          onClick={() => setActiveTab('updates')}
          style={{
            flex: 1,
            padding: '6px 8px',
            fontSize: '11.5px',
            fontWeight: '600',
            background: activeTab === 'updates' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
            color: activeTab === 'updates' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
            border: 'none',
            borderRadius: '7px',
            cursor: 'pointer',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px'
          }}
        >
          <span>🔄 Обновление</span>
          {(updateStatus === 'available' || updateStatus === 'downloaded') && (
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: updateStatus === 'downloaded' ? '#4ade80' : '#38bdf8',
                boxShadow: `0 0 6px ${updateStatus === 'downloaded' ? '#4ade80' : '#38bdf8'}`
              }}
            />
          )}
        </button>
      </div>

      {/* Tab Contents */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        {activeTab === 'appearance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255, 255, 255, 0.7)' }}>
              МАТЕРИАЛ И СТИЛЬ:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {Object.values(ISLAND_THEMES).map((th) => {
                const isSelected = currentThemeId === th.id;
                return (
                  <div
                    key={th.id}
                    onClick={() => onUpdateSettings({ themeId: th.id })}
                    style={{
                      background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      padding: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#ffffff' }}>
                        {th.name}
                      </span>
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: isSelected ? '#38bdf8' : 'transparent',
                          border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.4)',
                          boxShadow: isSelected ? '0 0 8px #38bdf8' : 'none'
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', lineHeight: 1.3 }}>
                      {th.description}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Custom Theme Colors Picker */}
            {currentThemeId === 'custom' && (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '10px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center'
                }}
              >
                <div>
                  <label style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', display: 'block' }}>
                    Цвет фона:
                  </label>
                  <input
                    type="color"
                    value={settings.customColor || '#0f172a'}
                    onChange={(e) => onUpdateSettings({ customColor: e.target.value })}
                    style={{ marginTop: '4px', cursor: 'pointer', border: 'none', background: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', display: 'block' }}>
                    Цвет акцента:
                  </label>
                  <input
                    type="color"
                    value={settings.customAccent || '#38bdf8'}
                    onChange={(e) => onUpdateSettings({ customAccent: e.target.value })}
                    style={{ marginTop: '4px', cursor: 'pointer', border: 'none', background: 'none' }}
                  />
                </div>
              </div>
            )}

            {/* Idle view options with iOS Toggle */}
            <div style={{ marginTop: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px' }}>
                РЕЖИМ ПОКОЯ:
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '10px 12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={15} color="#38bdf8" />
                  <span style={{ fontSize: '12px', color: '#ffffff', fontWeight: '500' }}>
                    Показывать дату рядом со временем
                  </span>
                </div>
                <IosToggle
                  checked={settings.showDate !== false}
                  onChange={(val) => onUpdateSettings({ showDate: val })}
                  activeColor="#38bdf8"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'features' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Layout Auto Fixer (Punto) with iOS Toggle */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, paddingRight: '8px' }}>
                <Keyboard size={16} color="#4ade80" />
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700' }}>
                    Автоисправление раскладки (Punto)
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    Исправляет "ghjtrn" на "проект" (или нажмите Pause/Break)
                  </div>
                </div>
              </div>
              <IosToggle
                checked={settings.layoutFixerEnabled !== false}
                onChange={(val) => {
                  onUpdateSettings({ layoutFixerEnabled: val });
                  window.dynislAPI?.sendCommand('layout_settings', {
                    enabled: val,
                    autoReplace: settings.layoutAutoReplace !== false
                  });
                }}
                activeColor="#34c759"
              />
            </div>

            {/* Clipboard Win+V replacement with iOS Toggle */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, paddingRight: '8px' }}>
                <Clipboard size={16} color="#38bdf8" />
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700' }}>
                    Буфер обмена (Win+V / Alt+V)
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    Заменять стандартное окно буфера на Dynamic Island
                  </div>
                </div>
              </div>
              <IosToggle
                checked={settings.clipboardHookEnabled !== false}
                onChange={(val) => onUpdateSettings({ clipboardHookEnabled: val })}
                activeColor="#38bdf8"
              />
            </div>

            {/* Game / Fullscreen Auto Hide with iOS Toggle */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, paddingRight: '8px' }}>
                <EyeOff size={16} color="#f59e0b" />
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700' }}>
                    Автоскрытие в играх
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    Сворачивать в аккуратную полоску в полноэкранных приложениях
                  </div>
                </div>
              </div>
              <IosToggle
                checked={settings.autoHideFullscreen !== false}
                onChange={(val) => onUpdateSettings({ autoHideFullscreen: val })}
                activeColor="#f59e0b"
              />
            </div>

            {/* Windows Autostart with iOS Toggle */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, paddingRight: '8px' }}>
                <Rocket size={16} color="#a855f7" />
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700' }}>
                    Автозапуск с Windows
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    Запускать Dynamic Island автоматически при включении ПК
                  </div>
                </div>
              </div>
              <IosToggle
                checked={autoStart}
                onChange={handleToggleAutoStart}
                activeColor="#a855f7"
              />
            </div>

            {/* Suppress Windows system toasts with iOS Toggle */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, paddingRight: '8px' }}>
                <Bell size={16} color="#38bdf8" />
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700' }}>
                    Перехват уведомлений Windows
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    Показывать в островке и глушить системные баннеры справа снизу
                  </div>
                </div>
              </div>
              <IosToggle
                checked={settings.suppressSystemToasts !== false}
                onChange={(val) => {
                  onUpdateSettings({ suppressSystemToasts: val });
                  window.dynislAPI?.sendCommand('set_suppress_toasts', { enabled: val });
                }}
                activeColor="#38bdf8"
              />
            </div>

            {/* Shortcuts help */}
            <div
              style={{
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.5)',
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '8px 10px',
                borderRadius: '8px',
                marginTop: '4px'
              }}
            >
              💡 <b>Горячие клавиши:</b>
              <br />• <b>Ctrl + Shift + H</b> — скрыть / показать остров
              <br />• <b>Pause / Break</b> — мгновенно исправить раскладку слова
              <br />• <b>Alt + V</b> или Win+V — буфер обмена
            </div>
          </div>
        )}

        {activeTab === 'updates' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Version & Status Card */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background:
                    updateStatus === 'downloaded'
                      ? 'rgba(34, 197, 94, 0.2)'
                      : updateStatus === 'available' || updateStatus === 'downloading'
                      ? 'rgba(56, 189, 248, 0.2)'
                      : 'rgba(168, 85, 247, 0.15)',
                  color:
                    updateStatus === 'downloaded'
                      ? '#22c55e'
                      : updateStatus === 'available' || updateStatus === 'downloading'
                      ? '#38bdf8'
                      : '#c084fc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {updateStatus === 'checking' ? (
                  <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                ) : updateStatus === 'downloaded' ? (
                  <CheckCircle2 size={20} />
                ) : updateStatus === 'available' || updateStatus === 'downloading' ? (
                  <ArrowDownToLine size={20} />
                ) : (
                  <Sparkles size={18} />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>
                    Dynamic Island
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 7px',
                      borderRadius: '9999px',
                      fontWeight: '600',
                      background:
                        updateStatus === 'not-available'
                          ? 'rgba(34, 197, 94, 0.15)'
                          : updateStatus === 'available'
                          ? 'rgba(56, 189, 248, 0.2)'
                          : updateStatus === 'downloaded'
                          ? 'rgba(34, 197, 94, 0.2)'
                          : 'rgba(255, 255, 255, 0.1)',
                      color:
                        updateStatus === 'not-available' || updateStatus === 'downloaded'
                          ? '#4ade80'
                          : updateStatus === 'available'
                          ? '#38bdf8'
                          : 'rgba(255, 255, 255, 0.7)'
                    }}
                  >
                    {updateStatus === 'not-available'
                      ? '✓ Актуально'
                      : updateStatus === 'available'
                      ? 'Доступно обновление'
                      : updateStatus === 'downloading'
                      ? 'Загрузка...'
                      : updateStatus === 'downloaded'
                      ? 'Готово к запуску'
                      : updateStatus === 'checking'
                      ? 'Проверка...'
                      : 'v' + (versionInfo.version || '1.0.0')}
                  </span>
                </div>

                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '2px' }}>
                  Текущая версия: <b style={{ color: '#ffffff' }}>v{versionInfo.version || '1.0.0'}</b>
                </div>

                {statusMessage && (
                  <div
                    style={{
                      fontSize: '10px',
                      color: updateStatus === 'error' ? '#f87171' : 'rgba(255, 255, 255, 0.5)',
                      marginTop: '3px',
                      lineHeight: 1.3
                    }}
                  >
                    {statusMessage}
                  </div>
                )}
              </div>
            </div>

            {/* Downloading progress bar */}
            {updateStatus === 'downloading' && (
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: '#38bdf8', fontWeight: '600' }}>Загрузка обновления в фоне...</span>
                  <span style={{ color: '#ffffff', fontWeight: '700' }}>{downloadProgress.percent}%</span>
                </div>

                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '9999px',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      width: `${downloadProgress.percent}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
                      borderRadius: '9999px',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>

                {downloadProgress.total > 0 && (
                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', textAlign: 'right' }}>
                    {(downloadProgress.transferred / (1024 * 1024)).toFixed(1)} МБ из{' '}
                    {(downloadProgress.total / (1024 * 1024)).toFixed(1)} МБ
                  </div>
                )}
              </div>
            )}

            {/* Action button: Install if downloaded */}
            {updateStatus === 'downloaded' && (
              <button
                onClick={handleInstallUpdate}
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(34, 197, 94, 0.3)'
                }}
              >
                <Rocket size={15} />
                <span>Установить обновление и перезапустить</span>
              </button>
            )}

            {/* Action button: Download if available */}
            {updateStatus === 'available' && (
              <button
                onClick={handleDownloadUpdate}
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(14, 165, 233, 0.3)'
                }}
              >
                <Download size={15} />
                <span>Скачать обновление v{newVersionInfo?.version || ''}</span>
              </button>
            )}

            {/* Check for updates button */}
            <button
              onClick={handleCheckUpdates}
              disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: '600',
                cursor:
                  updateStatus === 'checking' || updateStatus === 'downloading'
                    ? 'default'
                    : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                opacity: updateStatus === 'checking' || updateStatus === 'downloading' ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
            >
              <RefreshCw
                size={13}
                style={{
                  animation: updateStatus === 'checking' ? 'spin 1s linear infinite' : 'none'
                }}
              />
              <span>{updateStatus === 'checking' ? 'Проверка...' : 'Проверить обновления'}</span>
            </button>

            {/* Auto-update Toggle Card */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, paddingRight: '8px' }}>
                <RefreshCw size={16} color="#38bdf8" />
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700' }}>
                    Автоматическое обновление
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    Фоновая проверка и загрузка обновлений по воздуху
                  </div>
                </div>
              </div>
              <IosToggle
                checked={autoUpdate}
                onChange={handleToggleAutoUpdate}
                activeColor="#38bdf8"
              />
            </div>

            {/* Note about OTA / Cloud */}
            <div
              style={{
                fontSize: '10.5px',
                color: 'rgba(255, 255, 255, 0.45)',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed rgba(255, 255, 255, 0.08)',
                padding: '8px 10px',
                borderRadius: '8px',
                lineHeight: 1.4
              }}
            >
              ☁️ <b>Облачные OTA-обновления:</b> приложение автоматически загружает только изменённые файлы (blockmap дельты). Больше не нужно повторно скачивать файл установщика (.exe).
              {lastCheckedTime && (
                <div style={{ marginTop: '4px', color: 'rgba(255, 255, 255, 0.35)' }}>
                  Последняя проверка: {lastCheckedTime}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Exit Button */}
      <button
        onClick={() => window.dynislAPI?.closeApp()}
        style={{
          marginTop: '10px',
          background: 'rgba(239, 68, 68, 0.12)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '8px',
          padding: '7px',
          fontSize: '11.5px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}
      >
        <Power size={13} />
        <span>Выйти из Dynamic Island</span>
      </button>
    </div>
  );
}
