import React, { useState, useEffect, useRef } from 'react';
import MainIsland from './components/MainIsland';
import CallMiniIsland from './components/CallMiniIsland';
import { ISLAND_THEMES } from './styles/islandThemes';
import { fetchLyrics, getActiveLineIndex, getKaraokeState } from './services/lyricsService';
import { notificationManager } from './services/notificationService';
import { getAppMeta } from './components/NotificationToast';

export default function App() {
  // Settings
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('dynisl_settings');
      return saved ? JSON.parse(saved) : {
        themeId: 'liquid-glass',
        autoHideFullscreen: true,
        layoutFixerEnabled: true,
        layoutAutoReplace: true,
        clipboardHookEnabled: true,
        showDate: true,
        customColor: '#0f172a',
        customAccent: '#38bdf8'
      };
    } catch {
      return {
        themeId: 'liquid-glass',
        autoHideFullscreen: true,
        layoutFixerEnabled: true,
        layoutAutoReplace: true,
        clipboardHookEnabled: true,
        showDate: true
      };
    }
  });

  const updateSettings = (partial) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      try {
        localStorage.setItem('dynisl_settings', JSON.stringify(updated));
      } catch { }
      return updated;
    });
  };

  // Views & States
  const [activeView, setActiveView] = useState('idle');
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  // Music state
  const [musicInfo, setMusicInfo] = useState({
    HasSession: false,
    Title: '',
    Artist: '',
    Album: '',
    ThumbnailBase64: '',
    Status: 'Stopped',
    PositionMs: 0,
    DurationMs: 0,
    AppId: '',
    IsAd: false
  });
  const [lyricsData, setLyricsData] = useState(null);
  const [currentPosMs, setCurrentPosMs] = useState(0);

  // Call / Secondary Island state
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallDismissed, setIsCallDismissed] = useState(false);
  const [callApp, setCallApp] = useState('discord');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [micPeak, setMicPeak] = useState(0);

  // Clipboard state
  const [clipboardItems, setClipboardItems] = useState([]);

  // File shelf state
  const [absorbedFiles, setAbsorbedFiles] = useState([]);

  // Notifications
  const [currentNotification, setCurrentNotification] = useState(null);
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('dynisl_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleClearAllNotifications = () => {
    setNotifications([]);
    try {
      localStorage.removeItem('dynisl_notifications');
    } catch {}
  };

  const handleActivateNotification = (notif) => {
    if (!notif) return;
    const meta = getAppMeta(notif.app, notif.appName);
    const scheme = notif.scheme || meta.scheme;

    if (notif.filePath) {
      window.dynislAPI?.openPath?.(notif.filePath);
    }

    window.dynislAPI?.activateApp?.({
      app: notif.app,
      scheme,
      aumid: notif.aumid,
      filePath: notif.filePath
    });

    if (scheme && !notif.filePath) {
      window.dynislAPI?.openExternal?.(scheme);
    }

    setCurrentNotification(null);
    if (activeView === 'notifications') {
      setActiveView('idle');
    }
  };

  const handleRemoveNotification = (id) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      try {
        localStorage.setItem('dynisl_notifications', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Layout Fixer toast
  const [layoutFixData, setLayoutFixData] = useState(null);

  // Track lyrics fetching
  const lastTrackKeyRef = useRef('');

  useEffect(() => {
    if (!musicInfo?.Title || musicInfo?.IsAd) {
      setLyricsData(null);
      return;
    }

    const key = `${musicInfo.Artist}-${musicInfo.Title}`;
    if (key !== lastTrackKeyRef.current) {
      lastTrackKeyRef.current = key;
      fetchLyrics(musicInfo.Title, musicInfo.Artist, musicInfo.DurationMs / 1000).then((res) => {
        setLyricsData(res);
      });
    }
  }, [musicInfo?.Title, musicInfo?.Artist, musicInfo?.DurationMs, musicInfo?.IsAd]);

  // High-precision sub-second timekeeping engine
  const anchorRef = useRef({
    posMs: 0,
    perfTime: performance.now(),
    status: 'Stopped',
    durationMs: 0
  });

  useEffect(() => {
    if (!musicInfo) return;
    const newPos = musicInfo.PositionMs || 0;
    const now = performance.now();

    const prevEstimated = anchorRef.current.status === 'Playing'
      ? anchorRef.current.posMs + (now - anchorRef.current.perfTime)
      : anchorRef.current.posMs;

    const diff = Math.abs(newPos - prevEstimated);

    // Resync anchor when deviation exceeds 400ms or status changes
    if (diff > 400 || musicInfo.Status !== anchorRef.current.status) {
      anchorRef.current = {
        posMs: newPos,
        perfTime: now,
        status: musicInfo.Status,
        durationMs: musicInfo.DurationMs || 0
      };
      setCurrentPosMs(newPos);
    }
  }, [musicInfo?.PositionMs, musicInfo?.Status, musicInfo?.DurationMs]);

  // High-frequency continuous tick (35ms ~ 28fps) for butter-smooth position tracking
  useEffect(() => {
    if (musicInfo?.Status !== 'Playing' || musicInfo?.IsAd) {
      return;
    }

    const interval = setInterval(() => {
      const { posMs, perfTime, durationMs } = anchorRef.current;
      const elapsed = performance.now() - perfTime;
      let calculated = posMs + elapsed;
      if (durationMs > 0 && calculated > durationMs) {
        calculated = durationMs;
      }
      setCurrentPosMs(calculated);
    }, 35);

    return () => clearInterval(interval);
  }, [musicInfo?.Status, musicInfo?.IsAd]);

  // Compute comprehensive karaoke state (with +0.15s vocal calibration)
  const currentTimeSec = (currentPosMs / 1000) + 0.15;
  const karaokeState = getKaraokeState(lyricsData, currentTimeSec);
  const currentLyricLine = karaokeState.currentLine;

  // IPC Event listener from DynislCore
  useEffect(() => {
    if (!window.dynislAPI) return;

    window.dynislAPI.sendCommand('get_state');
    window.dynislAPI.sendCommand('set_suppress_toasts', { enabled: settings.suppressSystemToasts !== false });

    const unsubscribe = window.dynislAPI.onCoreEvent((payload) => {
      if (!payload) return;
      const { type, data } = payload;

      switch (type) {
        case 'media':
          setMusicInfo(data);
          break;

        case 'mic_peak':
          setMicPeak(data.peak);
          setIsSpeaking(data.isSpeaking);
          setIsMuted(data.isMuted);
          break;

        case 'call_status':
          if (data && typeof data.active === 'boolean') {
            setIsCallActive(data.active);
            if (!data.active) {
              setIsCallDismissed(false); // Reset dismissed state when call actually ends
            }
            if (data.app) setCallApp(data.app);
          }
          break;

        case 'notification':
          if (data) {
            setCurrentNotification(data);
            setNotifications((prev) => {
              const item = {
                ...data,
                id: data.id || `notif-${Date.now()}`,
                timestamp: data.timestamp || new Date().toISOString()
              };
              const updated = [item, ...prev.filter((n) => n.id !== item.id)].slice(0, 50);
              try {
                localStorage.setItem('dynisl_notifications', JSON.stringify(updated));
              } catch {}
              return updated;
            });
            setIsHidden(false);
            setTimeout(() => {
              setCurrentNotification((cur) => (cur?.id === data.id ? null : cur));
            }, 6000);
          }
          break;

        case 'fullscreen':
          if (settings.autoHideFullscreen) {
            setIsHidden(Boolean(data?.isFullscreen));
          }
          break;

        case 'manual_hide_toggle':
          setIsHidden(Boolean(data?.isHidden));
          break;

        case 'layout_corrected':
          setLayoutFixData(data);
          setTimeout(() => setLayoutFixData(null), 3500);
          break;

        case 'win_v':
        case 'open_clipboard':
          setActiveView('clipboard');
          setIsHidden(false);
          break;

        case 'clipboard':
          if (Array.isArray(data)) {
            setClipboardItems(data);
          }
          break;

        default:
          break;
      }
    });

    const unsubNotifs = notificationManager.subscribe((list) => {
      if (list.length > 0) {
        setCurrentNotification(list[0]);
      }
    });

    return () => {
      unsubscribe?.();
      unsubNotifs?.();
    };
  }, [settings.autoHideFullscreen]);

  // Compute Active Theme
  const themeObj = ISLAND_THEMES[settings.themeId] || ISLAND_THEMES['liquid-glass'];
  const theme = {
    ...themeObj,
    style: typeof themeObj.style === 'function'
      ? themeObj.style(settings.customColor, settings.customAccent)
      : themeObj.style
  };

  const isMusicPlaying = musicInfo?.Status === 'Playing';

  // Commands to Core
  const handlePlayPause = () => window.dynislAPI?.sendCommand('media_play_pause');
  const handleNext = () => window.dynislAPI?.sendCommand('media_next');
  const handlePrev = () => window.dynislAPI?.sendCommand('media_prev');
  const handleSeek = (posMs) => window.dynislAPI?.sendCommand('media_seek', { positionMs: Math.round(posMs) });
  const handleToggleMute = () => window.dynislAPI?.sendCommand('mic_set_mute', { mute: !isMuted });
  const handleSelectItem = (text) => {
    window.dynislAPI?.sendCommand('clipboard_set', { text });
    window.dynislAPI?.copyToClipboard(text);
  };
  const handlePinItem = (id) => window.dynislAPI?.sendCommand('clipboard_pin', { id });
  const handleRemoveItem = (id) => window.dynislAPI?.sendCommand('clipboard_remove', { id });
  const handleClearClipboard = () => window.dynislAPI?.sendCommand('clipboard_clear');

  const handleDropFiles = (files) => {
    setAbsorbedFiles((prev) => [...files, ...prev]);
    setActiveView('files');
    setIsHidden(false);
  };

  const handleRemoveFile = (id) => {
    setAbsorbedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleClearFiles = () => {
    setAbsorbedFiles([]);
  };

  const handleEndCall = () => {
    setIsCallDismissed(true);
    window.dynislAPI?.sendCommand('call_disconnect', { app: callApp });
  };

  const showCallMini = isCallActive && !isCallDismissed;

  // Sync callActive & isHidden state to main process for mouse bounds
  useEffect(() => {
    window.dynislAPI?.updateIslandBounds({
      callActive: showCallMini,
      isHidden
    });
  }, [showCallMini, isHidden]);

  // Seamless hover tracking: when cursor is over any interactive element, disable mouse passthrough
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isHidden) {
        window.dynislAPI?.setIgnoreMouseEvents(true);
        return;
      }
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const isInteractive = Boolean(
        el && (
          el.closest('.island-interactive') ||
          el.closest('.island-capsule')
        )
      );
      window.dynislAPI?.setIgnoreMouseEvents(!isInteractive);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isHidden]);

  return (
    <div className="island-stage">
      {/* Main Island Container */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          position: 'relative',
          transform: isHidden ? 'translateY(-140%)' : 'translateY(0)',
          transition: 'transform 0.44s cubic-bezier(0.22, 1.25, 0.36, 1)',
          pointerEvents: isHidden ? 'none' : 'auto'
        }}
      >
        {/* Main Island Capsule */}
        <MainIsland
          activeView={activeView}
          setActiveView={setActiveView}
          settings={settings}
          onUpdateSettings={updateSettings}
          theme={theme}
          musicInfo={musicInfo}
          lyricsData={lyricsData}
          karaokeState={karaokeState}
          currentLyricLine={currentLyricLine}
          currentTimeSec={currentTimeSec}
          clipboardItems={clipboardItems}
          absorbedFiles={absorbedFiles}
          currentNotification={currentNotification}
          notifications={notifications}
          onClearNotifications={handleClearAllNotifications}
          onRemoveNotification={handleRemoveNotification}
          onActivateNotification={handleActivateNotification}
          layoutFixData={layoutFixData}
          onDismissNotification={() => setCurrentNotification(null)}
          onDismissLayoutFix={() => setLayoutFixData(null)}
          onPlayPause={handlePlayPause}
          onNext={handleNext}
          onPrev={handlePrev}
          onSeek={handleSeek}
          onSelectItem={handleSelectItem}
          onPinItem={handlePinItem}
          onRemoveItem={handleRemoveItem}
          onClearClipboard={handleClearClipboard}
          onRemoveFile={handleRemoveFile}
          onClearFiles={handleClearFiles}
          onDropFiles={handleDropFiles}
          isMusicPlaying={isMusicPlaying}
          isLyricsOpen={isLyricsOpen}
          setIsLyricsOpen={setIsLyricsOpen}
        />

        {/* Secondary Call Mini-Island (Discord / Telegram) */}
        {showCallMini && (
          <div style={{ marginTop: '7px' }}>
            <CallMiniIsland
              isCallActive={showCallMini}
              isSpeaking={isSpeaking}
              theme={theme}
              appType={callApp}
            />
          </div>
        )}
      </div>
    </div>
  );
}
