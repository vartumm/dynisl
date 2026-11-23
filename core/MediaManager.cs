using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Windows.Media.Control;
using Windows.Storage.Streams;

namespace DynislCore
{
    public class MediaInfo
    {
        public bool HasSession { get; set; } = false;
        public string Title { get; set; } = "";
        public string Artist { get; set; } = "";
        public string Album { get; set; } = "";
        public string ThumbnailBase64 { get; set; } = "";
        public string Status { get; set; } = "Stopped"; // "Playing", "Paused", "Stopped"
        public double PositionMs { get; set; } = 0;
        public double DurationMs { get; set; } = 0;
        public string AppId { get; set; } = "";
        public bool IsAd { get; set; } = false;
        public long Timestamp { get; set; } = 0;
    }

    public class MediaManager
    {
        private static GlobalSystemMediaTransportControlsSessionManager? _manager;
        private static GlobalSystemMediaTransportControlsSession? _currentSession;
        public static Action<MediaInfo>? OnMediaChanged;
        public static MediaInfo CurrentMedia { get; private set; } = new();

        public static async Task StartAsync()
        {
            try
            {
                _manager = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();
                if (_manager != null)
                {
                    _manager.CurrentSessionChanged += async (s, e) => await UpdateSessionAsync();
                    _manager.SessionsChanged += async (s, e) => await UpdateSessionAsync();
                    await UpdateSessionAsync();

                    // Periodic background refresh (400ms) to ensure state stays 100% in sync
                    _ = Task.Run(async () =>
                    {
                        while (true)
                        {
                            await Task.Delay(400);
                            try
                            {
                                await RefreshMediaStateAsync();
                            }
                            catch { }
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[MediaManager Start Error]: {ex.Message}");
            }
        }

        private static GlobalSystemMediaTransportControlsSession? GetBestSession()
        {
            if (_manager == null) return null;
            try
            {
                var cur = _manager.GetCurrentSession();
                if (cur != null) return cur;

                var sessions = _manager.GetSessions();
                if (sessions != null && sessions.Count > 0)
                {
                    foreach (var s in sessions)
                    {
                        var info = s.GetPlaybackInfo();
                        if (info?.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing)
                            return s;
                    }
                    return sessions.FirstOrDefault();
                }
            }
            catch { }
            return null;
        }

        private static async Task UpdateSessionAsync()
        {
            if (_manager == null) return;
            try
            {
                var session = GetBestSession();
                if (_currentSession != session)
                {
                    if (_currentSession != null)
                    {
                        try
                        {
                            _currentSession.MediaPropertiesChanged -= OnMediaPropertiesChanged;
                            _currentSession.PlaybackInfoChanged -= OnPlaybackInfoChanged;
                            _currentSession.TimelinePropertiesChanged -= OnTimelinePropertiesChanged;
                        }
                        catch { }
                    }

                    _currentSession = session;

                    if (_currentSession != null)
                    {
                        _currentSession.MediaPropertiesChanged += OnMediaPropertiesChanged;
                        _currentSession.PlaybackInfoChanged += OnPlaybackInfoChanged;
                        _currentSession.TimelinePropertiesChanged += OnTimelinePropertiesChanged;
                    }
                }

                await RefreshMediaStateAsync();
            }
            catch { }
        }

        private static async void OnMediaPropertiesChanged(GlobalSystemMediaTransportControlsSession sender, MediaPropertiesChangedEventArgs args)
        {
            await RefreshMediaStateAsync();
        }

        private static async void OnPlaybackInfoChanged(GlobalSystemMediaTransportControlsSession sender, PlaybackInfoChangedEventArgs args)
        {
            await RefreshMediaStateAsync();
        }

        private static async void OnTimelinePropertiesChanged(GlobalSystemMediaTransportControlsSession sender, TimelinePropertiesChangedEventArgs args)
        {
            await RefreshMediaStateAsync();
        }

        public static async Task RefreshMediaStateAsync()
        {
            if (_currentSession == null)
            {
                _currentSession = GetBestSession();
            }

            if (_currentSession == null)
            {
                CurrentMedia = new MediaInfo { HasSession = false, Status = "Stopped" };
                OnMediaChanged?.Invoke(CurrentMedia);
                return;
            }

            try
            {
                var mediaProps = await _currentSession.TryGetMediaPropertiesAsync();
                var playbackInfo = _currentSession.GetPlaybackInfo();
                var timeline = _currentSession.GetTimelineProperties();

                string status = "Stopped";
                if (playbackInfo != null)
                {
                    status = playbackInfo.PlaybackStatus switch
                    {
                        GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing => "Playing",
                        GlobalSystemMediaTransportControlsSessionPlaybackStatus.Paused => "Paused",
                        _ => "Stopped"
                    };
                }

                string title = mediaProps?.Title ?? "";
                string artist = mediaProps?.Artist ?? "";
                bool isAd = title.Equals("Advertisement", StringComparison.OrdinalIgnoreCase) ||
                            (title.Equals("Spotify", StringComparison.OrdinalIgnoreCase) && string.IsNullOrEmpty(artist));

                string thumb = "";
                if (mediaProps?.Thumbnail != null && !isAd)
                {
                    try
                    {
                        using var stream = await mediaProps.Thumbnail.OpenReadAsync();
                        using var netStream = stream.AsStreamForRead();
                        using var ms = new MemoryStream();
                        await netStream.CopyToAsync(ms);
                        thumb = "data:image/jpeg;base64," + Convert.ToBase64String(ms.ToArray());
                    }
                    catch { }
                }

                double posMs = 0;
                double durationMs = 0;
                if (timeline != null)
                {
                    durationMs = timeline.EndTime.TotalMilliseconds;
                    var basePos = timeline.Position;
                    if (status == "Playing" && timeline.LastUpdatedTime != default)
                    {
                        var elapsed = DateTimeOffset.UtcNow - timeline.LastUpdatedTime;
                        if (elapsed > TimeSpan.Zero && elapsed < TimeSpan.FromHours(2))
                        {
                            basePos += elapsed;
                        }
                    }

                    if (durationMs > 0 && basePos.TotalMilliseconds > durationMs)
                    {
                        posMs = durationMs;
                    }
                    else
                    {
                        posMs = Math.Max(0, basePos.TotalMilliseconds);
                    }
                }

                CurrentMedia = new MediaInfo
                {
                    HasSession = true,
                    Title = isAd ? "Реклама" : title,
                    Artist = isAd ? "" : artist,
                    Album = mediaProps?.AlbumTitle ?? "",
                    ThumbnailBase64 = thumb,
                    Status = status,
                    PositionMs = posMs,
                    DurationMs = durationMs,
                    AppId = _currentSession.SourceAppUserModelId ?? "",
                    IsAd = isAd,
                    Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                };

                OnMediaChanged?.Invoke(CurrentMedia);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[RefreshMediaStateAsync error]: {ex.Message}");
            }
        }

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

        private const byte VK_MEDIA_NEXT_TRACK = 0xB0;
        private const byte VK_MEDIA_PREV_TRACK = 0xB1;
        private const byte VK_MEDIA_PLAY_PAUSE = 0xB3;
        private const uint KEYEVENTF_KEYUP = 0x0002;

        public static void SendMediaKey(byte vk)
        {
            try
            {
                keybd_event(vk, 0, 0, UIntPtr.Zero);
                keybd_event(vk, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
            }
            catch { }
        }

        public static async Task PlayPauseAsync()
        {
            bool ok = false;
            try
            {
                var session = _currentSession ?? GetBestSession();
                if (session != null)
                {
                    ok = await session.TryTogglePlayPauseAsync();
                    if (!ok)
                    {
                        var info = session.GetPlaybackInfo();
                        if (info?.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing)
                            ok = await session.TryPauseAsync();
                        else
                            ok = await session.TryPlayAsync();
                    }
                }
            }
            catch { }

            // Hardware media key fallback (guaranteed to toggle playback in Spotify, Yandex Music, Chrome YouTube)
            if (!ok)
            {
                SendMediaKey(VK_MEDIA_PLAY_PAUSE);
            }

            await Task.Delay(60);
            await RefreshMediaStateAsync();
        }

        public static async Task NextAsync()
        {
            bool ok = false;
            try
            {
                var session = _currentSession ?? GetBestSession();
                if (session != null)
                {
                    ok = await session.TrySkipNextAsync();
                }
            }
            catch { }

            if (!ok)
            {
                SendMediaKey(VK_MEDIA_NEXT_TRACK);
            }

            await Task.Delay(60);
            await RefreshMediaStateAsync();
        }

        public static async Task PreviousAsync()
        {
            bool ok = false;
            try
            {
                var session = _currentSession ?? GetBestSession();
                if (session != null)
                {
                    ok = await session.TrySkipPreviousAsync();
                }
            }
            catch { }

            if (!ok)
            {
                SendMediaKey(VK_MEDIA_PREV_TRACK);
            }

            await Task.Delay(60);
            await RefreshMediaStateAsync();
        }

        public static async Task SeekAsync(long positionMs)
        {
            try
            {
                var session = _currentSession ?? GetBestSession();
                if (session != null)
                {
                    long ticks = positionMs * TimeSpan.TicksPerMillisecond;
                    await session.TryChangePlaybackPositionAsync(ticks);
                }
                await RefreshMediaStateAsync();
            }
            catch { }
        }
    }
}
