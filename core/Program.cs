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

            if (args.Length > 0 && (args[0] == "--diag" || args[0] == "--test-notif"))
            {
                Console.WriteLine("=== DynislCore Notification Diagnostic ===");
                try
                {
                    var listener = Windows.UI.Notifications.Management.UserNotificationListener.Current;
                    if (listener == null)
                    {
                        Console.WriteLine("FAIL: UserNotificationListener.Current is null");
                        return;
                    }
                    var access = await listener.RequestAccessAsync();
                    Console.WriteLine($"Access Status: {access}");
                    var notifs = await listener.GetNotificationsAsync(Windows.UI.Notifications.NotificationKinds.Toast);
                    Console.WriteLine($"Current active toasts in Windows: {notifs?.Count ?? 0}");
                    if (notifs != null)
                    {
                        foreach (var n in notifs)
                        {
                            Console.WriteLine($"  ID={n.Id}, App={n.AppInfo?.DisplayInfo?.DisplayName}");
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Exception during test: {ex}");
                }
                return;
            }

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
                        case "set_suppress_toasts":
                            if (root.TryGetProperty("enabled", out var stProp))
                            {
                                NotificationListener.SuppressSystemToasts = stProp.GetBoolean();
                            }
                            break;
                        case "test_notification":
                            string tApp = root.TryGetProperty("app", out var appP) ? appP.GetString() ?? "telegram" : "telegram";
                            string tTitle = root.TryGetProperty("title", out var titleP) ? titleP.GetString() ?? "Telegram" : "Telegram";
                            string tMsg = root.TryGetProperty("message", out var msgP) ? msgP.GetString() ?? "Тестовое уведомление в Dynamic Island" : "Тестовое уведомление в Dynamic Island";
                            NotificationListener.SimulateTestNotification(tApp, tTitle, tMsg);
                            break;
                        case "activate_app":
                            string actApp = root.TryGetProperty("app", out var ap) ? ap.GetString() ?? "" : "";
                            string actAumid = root.TryGetProperty("aumid", out var au) ? au.GetString() ?? "" : "";
                            string actFile = root.TryGetProperty("filePath", out var fp) ? fp.GetString() ?? "" : "";
                            ActivateTargetApp(actApp, actAumid, actFile);
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

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern bool AllowSetForegroundWindow(int dwProcessId);

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);

        private const int ASFW_ANY = -1;
        private const byte VK_MENU = 0x12;
        private const uint KEYEVENTF_KEYUP = 0x0002;
        private const int SW_RESTORE = 9;
        private const int SW_SHOW = 5;

        private static void ActivateTargetApp(string app, string aumid, string filePath)
        {
            try
            {
                string norm = $"{app} {aumid}".ToLowerInvariant();

                // 1. Screenshot: Open the actual image file!
                if (norm.Contains("screenshot") || norm.Contains("screensketch") || norm.Contains("snipping") || norm.Contains("снимок") || !string.IsNullOrEmpty(filePath))
                {
                    if (!string.IsNullOrEmpty(filePath) && System.IO.File.Exists(filePath))
                    {
                        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(filePath) { UseShellExecute = true });
                        return;
                    }

                    string newest = FindNewestScreenshot();
                    if (!string.IsNullOrEmpty(newest) && System.IO.File.Exists(newest))
                    {
                        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(newest) { UseShellExecute = true });
                        return;
                    }

                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("ms-screensketch:") { UseShellExecute = true });
                    return;
                }

                // 2. Telegram / AyuGram
                if (norm.Contains("ayu") || norm.Contains("telegram") || norm.Contains("tg"))
                {
                    try
                    {
                        keybd_event(VK_MENU, 0, 0, 0);
                        keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, 0);
                        AllowSetForegroundWindow(ASFW_ANY);
                    }
                    catch { }

                    bool restored = FocusWindowByProcessNames(new[] { "AyuGram", "Telegram", "TelegramDesktop" });

                    string exePath = @"D:\ayu\AyuGram.exe";
                    if (System.IO.File.Exists(exePath))
                    {
                        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(exePath) { UseShellExecute = true });
                    }
                    else
                    {
                        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("tg://") { UseShellExecute = true });
                    }
                    return;
                }

                if (norm.Contains("discord"))
                {
                    FocusWindowByProcessNames(new[] { "Discord" });
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("discord://") { UseShellExecute = true });
                    return;
                }

                if (norm.Contains("whatsapp"))
                {
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("whatsapp://") { UseShellExecute = true });
                    return;
                }

                if (norm.Contains("vk"))
                {
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("https://vk.com") { UseShellExecute = true });
                    return;
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[ActivateTargetApp Error]: {ex.Message}");
            }
        }

        private static string FindNewestScreenshot()
        {
            try
            {
                string dir = ClipboardManager.GetScreenshotsDirectory();
                if (System.IO.Directory.Exists(dir))
                {
                    var di = new System.IO.DirectoryInfo(dir);
                    var files = di.GetFiles("*.png").OrderByDescending(f => f.LastWriteTime).ToList();
                    if (files.Count > 0)
                    {
                        return files[0].FullName;
                    }
                }
            }
            catch { }
            return "";
        }

        private static bool FocusWindowByProcessNames(string[] names)
        {
            foreach (var name in names)
            {
                try
                {
                    var procs = System.Diagnostics.Process.GetProcessesByName(name);
                    foreach (var p in procs)
                    {
                        if (p.MainWindowHandle != IntPtr.Zero)
                        {
                            ShowWindow(p.MainWindowHandle, SW_RESTORE);
                            ShowWindow(p.MainWindowHandle, SW_SHOW);
                            SetForegroundWindow(p.MainWindowHandle);
                            return true;
                        }
                    }
                }
                catch { }
            }
            return false;
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
