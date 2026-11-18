using System;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace DynislCore
{
    class Program
    {
        private static bool _lastFullscreen = false;
        private static float _lastPeak = -1f;
        private static bool _lastMute = false;
        private static bool _lastInCall = false;

        static async Task Main(string[] args)
        {
            Console.InputEncoding = Encoding.UTF8;
            Console.OutputEncoding = Encoding.UTF8;

            Emit("ready", new { version = "1.2.0", platform = "win32" });

            // Callbacks
            MediaManager.OnMediaChanged = (info) =>
            {
                Emit("media", info);
            };

            KeyboardLayoutFixer.OnLayoutCorrected = (orig, conv) =>
            {
                Emit("layout_corrected", new { original = orig, converted = conv });
            };

            KeyboardLayoutFixer.OnWinVTriggered = () =>
            {
                Emit("win_v", new { });
            };

            ClipboardManager.OnClipboardChanged = (items) =>
            {
                Emit("clipboard", items);
            };

            NotificationListener.OnNotificationReceived = (notif) =>
            {
                Emit("notification", notif);
            };

            // Start background services
            await MediaManager.StartAsync();
            await NotificationListener.StartAsync();
            KeyboardLayoutFixer.Start();
            ClipboardManager.Start();

            // Background Poller for:
            // 1) Mic peak audio volume
            // 2) Discord / Telegram voice call detection (via UDP socket detection)
            // 3) Fullscreen / Game detection
            var poller = new Thread(() =>
            {
                int fullScreenCheckCounter = 0;
                int callCheckCounter = 0;

                while (true)
                {
                    try
                    {
                        // 1. Mic level check (every ~60ms)
                        float peak = CoreAudioHelper.GetMicPeak();
                        bool isMute = CoreAudioHelper.GetMicMute();
                        bool speaking = peak > 0.035f;

                        if (Math.Abs(peak - _lastPeak) > 0.03f || speaking || isMute != _lastMute)
                        {
                            _lastPeak = peak;
                            _lastMute = isMute;
                            Emit("mic_peak", new
                            {
                                peak = Math.Round(peak, 3),
                                isSpeaking = speaking,
                                isMuted = isMute
                            });
                        }

                        // 2. Discord / Telegram call detection (every ~350ms = 6 loops)
                        callCheckCounter++;
                        if (callCheckCounter >= 6)
                        {
                            callCheckCounter = 0;
                            bool inCall = VoiceCallDetector.IsVoiceAppInCall(out string appName);
                            if (inCall != _lastInCall)
                            {
                                _lastInCall = inCall;
                                Emit("call_status", new
                                {
                                    active = inCall,
                                    app = appName
                                });
                            }
                        }

                        // 3. Fullscreen check (every ~600ms = 10 loops)
                        fullScreenCheckCounter++;
                        if (fullScreenCheckCounter >= 10)
                        {
                            fullScreenCheckCounter = 0;
                            bool fs = FullscreenDetector.IsForegroundFullscreen();
                            if (fs != _lastFullscreen)
                            {
                                _lastFullscreen = fs;
                                Emit("fullscreen", new { isFullscreen = fs });
                            }
                        }
                    }
                    catch { }

                    Thread.Sleep(60);
                }
            })
            { IsBackground = true, Priority = ThreadPriority.AboveNormal };
            poller.Start();

            // Stdin command loop
            string? line;
            while ((line = Console.ReadLine()) != null)
            {
                if (string.IsNullOrWhiteSpace(line)) continue;
                try
                {
                    using var doc = JsonDocument.Parse(line);
                    var root = doc.RootElement;
                    if (!root.TryGetProperty("cmd", out var cmdProp)) continue;
                    string cmd = cmdProp.GetString() ?? "";

                    switch (cmd)
                    {
                        case "media_play_pause":
                            await MediaManager.PlayPauseAsync();
                            break;
                        case "media_next":
                            await MediaManager.NextAsync();
                            break;
                        case "media_prev":
                            await MediaManager.PreviousAsync();
                            break;
                        case "media_seek":
                            if (root.TryGetProperty("positionMs", out var posProp))
                            {
                                await MediaManager.SeekAsync(posProp.GetInt64());
                            }
                            break;
                        case "mic_set_mute":
                            if (root.TryGetProperty("mute", out var muteProp))
                            {
                                bool m = muteProp.GetBoolean();
                                CoreAudioHelper.SetMicMute(m);
                                _lastMute = m;
                                Emit("mic_peak", new
                                {
                                    peak = _lastPeak,
                                    isSpeaking = false,
                                    isMuted = m
                                });
                            }
                            break;
                        case "call_disconnect":
                            VoiceCallDetector.DismissCurrentCall();
                            _lastInCall = false;
                            Emit("call_status", new
                            {
                                active = false,
                                app = ""
                            });
                            break;
                        case "clipboard_set":
                            if (root.TryGetProperty("text", out var textProp))
                            {
                                ClipboardManager.SetText(textProp.GetString() ?? "");
                            }
                            break;
                        case "clipboard_clear":
                            ClipboardManager.Clear();
                            break;
                        case "clipboard_remove":
                            if (root.TryGetProperty("id", out var idProp))
                            {
                                ClipboardManager.Remove(idProp.GetString() ?? "");
                            }
                            break;
                        case "clipboard_pin":
                            if (root.TryGetProperty("id", out var pinIdProp))
                            {
                                ClipboardManager.TogglePin(pinIdProp.GetString() ?? "");
                            }
                            break;
                        case "layout_settings":
                            bool en = root.TryGetProperty("enabled", out var enProp) ? enProp.GetBoolean() : true;
                            bool ar = root.TryGetProperty("autoReplace", out var arProp) ? arProp.GetBoolean() : true;
                            KeyboardLayoutFixer.SetEnabled(en, ar);
                            break;
                        case "get_state":
                            Emit("media", MediaManager.CurrentMedia);
                            Emit("clipboard", ClipboardManager.GetHistory());
                            Emit("fullscreen", new { isFullscreen = _lastFullscreen });
                            Emit("call_status", new { active = _lastInCall, app = "discord" });
                            Emit("mic_peak", new { peak = _lastPeak, isSpeaking = false, isMuted = CoreAudioHelper.GetMicMute() });
                            break;
                    }
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"[Command error]: {ex.Message}");
                }
            }
        }

        private static void Emit(string type, object data)
        {
            try
            {
                var payload = new { type, data };
                string json = JsonSerializer.Serialize(payload);
                Console.WriteLine(json);
            }
            catch { }
        }
    }
}
