import React, { useState, useRef, useEffect } from 'react';
import IslandBezelConnector from './IslandBezelConnector';
import IdleView from './IdleView';
import MusicPlayerView from './MusicPlayerView';
import ClipboardView from './ClipboardView';
import FileShelfView from './FileShelfView';
import SettingsView from './SettingsView';
import NotificationToast from './NotificationToast';
import LayoutFixerToast from './LayoutFixerToast';

export default function MainIsland({
  activeView,
  setActiveView,
  settings,
  onUpdateSettings,
  theme,
  musicInfo,
  lyricsData,
  currentLyricLine,
  clipboardItems,
  absorbedFiles,
  currentNotification,
  layoutFixData,
  onDismissNotification,
  onDismissLayoutFix,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onSelectItem,
  onPinItem,
  onRemoveItem,
  onClearClipboard,
  onRemoveFile,
  onClearFiles,
  onDropFiles,
  isMusicPlaying,
  isLyricsOpen,
  setIsLyricsOpen
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [magneticPull, setMagneticPull] = useState({ x: 0, y: 0 });
  const islandRef = useRef(null);

  // Dynamic dimensions based on active view and state
  let width = 270;
  let height = 38;
  let borderRadius = '20px'; // Smooth pill base: starts from natural half-height (19-20px) to eliminate corner jerking!

  if (currentNotification) {
    width = 420;
    height = 60;
    borderRadius = '28px';
  } else if (layoutFixData) {
    width = 350;
    height = 40;
    borderRadius = '20px';
  } else if (activeView === 'idle') {
    if (musicInfo?.HasSession && currentLyricLine && !musicInfo?.IsAd) {
      width = 410; // Extra room for moving lyrics
      height = 38;
    } else if (musicInfo?.HasSession && musicInfo?.Title) {
      width = 310;
      height = 38;
    } else {
      width = 250;
      height = 38;
    }
    borderRadius = '20px';
  } else if (activeView === 'music') {
    if (isLyricsOpen) {
      width = 460;
      height = 360;
      borderRadius = '28px';
    } else {
      width = 440;
      height = 220;
      borderRadius = '28px';
    }
  } else if (activeView === 'clipboard') {
    width = 480;
    height = 360;
    borderRadius = '28px';
  } else if (activeView === 'files') {
    width = 490;
    height = 330;
    borderRadius = '28px';
  } else if (activeView === 'settings' || activeView === 'updates') {
    width = 470;
    height = 380;
    borderRadius = '28px';
  }

  // Update bounds to main process for native click-through tracking
  useEffect(() => {
    window.dynislAPI?.updateIslandBounds({ width, height });
  }, [width, height]);

  // Jitter-free magnetic proximity listener using static screen coordinates
  useEffect(() => {
    const handleWindowDragOver = (e) => {
      e.preventDefault();
      const screenCenterX = window.innerWidth / 2;
      const dx = e.clientX - screenCenterX;
      const dy = Math.max(0, e.clientY - 8);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 260 && e.clientY < 300) {
        if (!isDragOver) setIsDragOver(true);
        // Smooth clamped pull values based on static screen center
        const pullX = Math.max(-20, Math.min(20, dx * 0.1));
        const pullY = Math.min(24, dy * 0.16);
        setMagneticPull({ x: pullX, y: pullY });
      } else {
        if (isDragOver) {
          setIsDragOver(false);
          setMagneticPull({ x: 0, y: 0 });
        }
      }
    };

    const handleWindowDragLeave = (e) => {
      if (e.clientY <= 0 || e.clientY >= window.innerHeight || e.clientX <= 0 || e.clientX >= window.innerWidth) {
        setIsDragOver(false);
        setMagneticPull({ x: 0, y: 0 });
      }
    };

    const handleWindowDrop = () => {
      setIsDragOver(false);
      setMagneticPull({ x: 0, y: 0 });
    };

    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [isDragOver]);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setMagneticPull({ x: 0, y: 0 });

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = Array.from(e.dataTransfer.files).map((f) => ({
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: f.name,
        size: f.size,
        path: f.path || f.name,
        type: f.type,
        timestamp: Date.now()
      }));
      onDropFiles(dropped);
    }
  };

  const isExpanded = height > 55;
  const offsetY = isExpanded ? 12 : 7;

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      {/* Water droplet meniscus adhering to ceiling (y: 0) */}
      <IslandBezelConnector
        islandWidth={width}
        islandHeight={height}
        theme={theme}
        isExpanded={isExpanded}
        offsetY={offsetY + (isDragOver ? magneticPull.y * 0.4 : 0)}
      />

      {/* Main Capsule Body */}
      <div
        ref={islandRef}
        className={`island-capsule island-interactive ${isDragOver ? 'file-drop-absorbing' : ''}`}
        onDrop={handleDrop}
        onClick={(e) => {
          if (activeView === 'idle') {
            if (musicInfo?.HasSession && musicInfo?.Title) {
              setActiveView('music');
            } else {
              setActiveView('clipboard');
            }
          }
        }}
        style={{
          ...theme?.style,
          width: `${width}px`,
          height: `${height}px`,
          borderRadius,
          marginTop: `${offsetY}px`,
          cursor: activeView === 'idle' ? 'pointer' : 'default',
          transform: isDragOver
            ? `translate(${magneticPull.x}px, ${magneticPull.y}px)`
            : 'translate(0, 0)',
          boxShadow: isDragOver
            ? '0 0 35px rgba(56, 189, 248, 0.8), 0 24px 50px rgba(0, 0, 0, 0.7)'
            : theme?.style?.boxShadow
        }}
      >
        {/* Specular glass reflection line highlight on top border */}
        {theme?.glassHighlight && <div className="glass-reflection-line" />}

        {/* View Contents */}
        {currentNotification ? (
          <NotificationToast
            notification={currentNotification}
            onDismiss={onDismissNotification}
            theme={theme}
          />
        ) : layoutFixData ? (
          <LayoutFixerToast
            data={layoutFixData}
            onDismiss={onDismissLayoutFix}
          />
        ) : activeView === 'idle' ? (
          <IdleView
            settings={settings}
            onOpenView={(view) => setActiveView(view)}
            theme={theme}
            isMusicPlaying={isMusicPlaying}
            musicInfo={musicInfo}
            currentLyricLine={currentLyricLine}
          />
        ) : activeView === 'music' ? (
          <MusicPlayerView
            musicInfo={musicInfo}
            lyricsData={lyricsData}
            onPlayPause={onPlayPause}
            onNext={onNext}
            onPrev={onPrev}
            onSeek={onSeek}
            onClose={() => {
              setIsLyricsOpen(false);
              setActiveView('idle');
            }}
            theme={theme}
            isLyricsOpen={isLyricsOpen}
            setIsLyricsOpen={setIsLyricsOpen}
          />
        ) : activeView === 'clipboard' ? (
          <ClipboardView
            items={clipboardItems}
            onSelectItem={onSelectItem}
            onPinItem={onPinItem}
            onRemoveItem={onRemoveItem}
            onClear={onClearClipboard}
            onClose={() => setActiveView('idle')}
            theme={theme}
          />
        ) : activeView === 'files' ? (
          <FileShelfView
            files={absorbedFiles}
            onRemoveFile={onRemoveFile}
            onClearFiles={onClearFiles}
            onClose={() => setActiveView('idle')}
            theme={theme}
          />
        ) : activeView === 'settings' || activeView === 'updates' ? (
          <SettingsView
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            onClose={() => setActiveView('idle')}
            theme={theme}
            initialTab={activeView === 'updates' ? 'updates' : 'appearance'}
          />
        ) : null}
      </div>
    </div>
  );
}
