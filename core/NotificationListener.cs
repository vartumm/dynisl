using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Windows.UI.Notifications;
using Windows.UI.Notifications.Management;

namespace DynislCore
{
    public class NotificationListener
    {
        private static UserNotificationListener? _listener;
        private static readonly HashSet<uint> _seenNotificationIds = new();
        private static DateTime _lastScreenshotNotificationTime = DateTime.MinValue;
        public static Action<object>? OnNotificationReceived;
        public static bool SuppressSystemToasts { get; set; } = true;

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern IntPtr SetWinEventHook(
            uint eventMin, uint eventMax, IntPtr hmodWinEventProc,
            WinEventDelegate lpfnWinEventProc, uint idProcess, uint idThread, uint dwFlags);

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern bool UnhookWinEvent(IntPtr hWinEventHook);

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        [return: System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.Bool)]
        private static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [System.Runtime.InteropServices.DllImport("user32.dll", CharSet = System.Runtime.InteropServices.CharSet.Auto)]
        private static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);

        [System.Runtime.InteropServices.StructLayout(System.Runtime.InteropServices.LayoutKind.Sequential)]
        public struct RECT
        {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }

        private delegate void WinEventDelegate(
            IntPtr hWinEventHook, uint eventType, IntPtr hWnd, int idObject, int idChild,
            uint dwEventThread, uint dwmsEventTime);

        private const uint EVENT_OBJECT_SHOW = 0x8002;
        private const uint WINEVENT_OUTOFCONTEXT = 0;
        private const int SW_HIDE = 0;

        private static IntPtr _tgHookId = IntPtr.Zero;
        private static WinEventDelegate? _tgWinEventDelegate;
        private static DateTime _lastTelegramNotificationTime = DateTime.MinValue;

        public static void EmitScreenshotNotification(string? base64Thumb = null, string? filePath = null)
        {
            var now = DateTime.UtcNow;
            if ((now - _lastScreenshotNotificationTime).TotalMilliseconds < 1200)
            {
                return;
            }
            _lastScreenshotNotificationTime = now;

            OnNotificationReceived?.Invoke(new
            {
                id = $"ss-{now.Ticks}",
                app = "screenshot",
                appName = "Снимок экрана",
                author = "Снимок экрана",
                title = "Снимок экрана",
                message = "Снимок сохранен в буфер • Нажмите, чтобы открыть",
                timestamp = now.ToString("o"),
                avatar = base64Thumb ?? "",
                aumid = "Microsoft.ScreenSketch_8wekyb3d8bbwe!App",
                scheme = "ms-screensketch:",
                filePath = filePath ?? ""
            });
        }

        private static void OnTelegramWinEvent(
            IntPtr hWinEventHook, uint eventType, IntPtr hWnd, int idObject, int idChild,
            uint dwEventThread, uint dwmsEventTime)
        {
            try
            {
                if (idObject != 0 || hWnd == IntPtr.Zero) return;

                GetWindowThreadProcessId(hWnd, out uint pid);
                if (pid == 0) return;

                string procName = "";
                try
                {
                    using var proc = System.Diagnostics.Process.GetProcessById((int)pid);
                    procName = proc.ProcessName.ToLowerInvariant();
                }
                catch { }

                if (!procName.Contains("ayu") && !procName.Contains("telegram")) return;

                if (!GetWindowRect(hWnd, out RECT rc)) return;
                int w = rc.Right - rc.Left;
                int h = rc.Bottom - rc.Top;

                // Telegram / AyuGram notification popups have width between 240 and 460, and height between 40 and 160
                if (w >= 240 && w <= 460 && h >= 40 && h <= 160)
                {
                    // Suppress Telegram's native popup immediately from screen ("отбираем" уведомление у Телеграма)
                    ShowWindow(hWnd, SW_HIDE);

                    var now = DateTime.UtcNow;
                    if ((now - _lastTelegramNotificationTime).TotalMilliseconds < 1500)
                    {
                        return;
                    }
                    _lastTelegramNotificationTime = now;

                    var sbTitle = new System.Text.StringBuilder(256);
                    GetWindowText(hWnd, sbTitle, 256);
                    string text = sbTitle.ToString().Trim();

                    string author = "Telegram";
                    string body = "Новое сообщение";

                    if (!string.IsNullOrWhiteSpace(text) && text.Contains(": "))
                    {
                        var parts = text.Split(new[] { ": " }, 2, StringSplitOptions.None);
                        author = parts[0];
                        body = parts[1];
                    }
                    else if (!string.IsNullOrWhiteSpace(text))
                    {
                        body = text;
                    }

                    Console.Error.WriteLine($"[TelegramPopupInterceptor] Suppressed popup and redirected to Dynamic Island: {author} - {body}");

                    OnNotificationReceived?.Invoke(new
                    {
                        id = $"tg-popup-{now.Ticks}",
                        app = "telegram",
                        appName = procName.Contains("ayu") ? "Telegram (AyuGram)" : "Telegram",
                        author = author,
                        title = "Telegram",
                        message = body,
                        timestamp = now.ToString("o"),
                        scheme = "tg://"
                    });
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[OnTelegramWinEvent Error]: {ex.Message}");
            }
        }

        public static async Task StartAsync()
        {
            // Start Telegram popup window interceptor on a dedicated STA thread with message loop
            var hookThread = new System.Threading.Thread(() =>
            {
                try
                {
                    _tgWinEventDelegate = new WinEventDelegate(OnTelegramWinEvent);
                    _tgHookId = SetWinEventHook(EVENT_OBJECT_SHOW, EVENT_OBJECT_SHOW, IntPtr.Zero, _tgWinEventDelegate, 0, 0, WINEVENT_OUTOFCONTEXT);
                    Console.Error.WriteLine("[NotificationListener] Telegram popup window hook installed.");
                    System.Windows.Forms.Application.Run();
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"[NotificationListener Hook Error]: {ex.Message}");
                }
            })
            { IsBackground = true };
            hookThread.SetApartmentState(System.Threading.ApartmentState.STA);
            hookThread.Start();

            try
            {
                _listener = UserNotificationListener.Current;
                if (_listener == null)
                {
                    Console.Error.WriteLine("[NotificationListener] UserNotificationListener.Current is null");
                    return;
                }

                var access = await _listener.RequestAccessAsync();
                Console.Error.WriteLine($"[NotificationListener] Access status: {access}");
                if (access != UserNotificationListenerAccessStatus.Allowed)
                {
                    return;
                }

                // Initial snapshot to mark existing notifications as seen
                try
                {
                    var initial = await _listener.GetNotificationsAsync(NotificationKinds.Toast);
                    if (initial != null)
                    {
                        foreach (var n in initial)
                        {
                            _seenNotificationIds.Add(n.Id);
                        }
                        Console.Error.WriteLine($"[NotificationListener] Marked {initial.Count} existing notifications as seen.");
                    }
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"[NotificationListener] Initial get error: {ex.Message}");
                }

                // Active poller (every 60ms) to instantly capture & handle Windows toasts
                _ = Task.Run(async () =>
                {
                    while (true)
                    {
                        try
                        {
                            await CheckNewNotificationsAsync();
                        }
                        catch (Exception ex)
                        {
                            Console.Error.WriteLine($"[NotificationListener Poller Error]: {ex.Message}");
                        }
                        await Task.Delay(60);
                    }
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[NotificationListener Start Error]: {ex.Message}");
            }
        }

        public static void SimulateTestNotification(string app, string title, string message)
        {
            try
            {
                string resolvedApp = string.IsNullOrWhiteSpace(app) ? "telegram" : app.ToLowerInvariant();
                string appName = resolvedApp switch
                {
                    "discord" => "Discord",
                    "telegram" => "Telegram",
                    "vk" => "VK",
                    "whatsapp" => "WhatsApp",
                    _ => "Уведомление"
                };

                OnNotificationReceived?.Invoke(new
                {
                    id = $"sim-{DateTime.UtcNow.Ticks}",
                    app = resolvedApp,
                    appName = appName,
                    author = title,
                    title = appName,
                    message = message,
                    timestamp = DateTime.UtcNow.ToString("o")
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[NotificationListener Simulate Error]: {ex.Message}");
            }
        }

        private static async Task CheckNewNotificationsAsync()
        {
            if (_listener == null) return;

            IReadOnlyList<UserNotification>? notifs = null;
            try
            {
                notifs = await _listener.GetNotificationsAsync(NotificationKinds.Toast);
            }
            catch
            {
                return;
            }

            if (notifs == null || notifs.Count == 0) return;

            foreach (var n in notifs)
            {
                if (n == null) continue;
                if (_seenNotificationIds.Contains(n.Id)) continue;
                _seenNotificationIds.Add(n.Id);

                try
                {
                    string appName = "Приложение";
                    string aumid = "";
                    try
                    {
                        if (n.AppInfo?.DisplayInfo?.DisplayName != null)
                        {
                            appName = n.AppInfo.DisplayInfo.DisplayName;
                        }
                        aumid = n.AppInfo?.Id ?? "";
                    }
                    catch { }

                    string combinedKey = $"{appName} {aumid}".ToLowerInvariant();
                    string appType = "system";
                    string? scheme = null;

                    if (combinedKey.Contains("screensketch") || combinedKey.Contains("screenclip") || combinedKey.Contains("snipping") || combinedKey.Contains("ножниц") || combinedKey.Contains("снимок") || combinedKey.Contains("фрагмент"))
                    {
                        appType = "screenshot";
                        appName = "Снимок экрана";
                        scheme = "ms-screensketch:";
                        _lastScreenshotNotificationTime = DateTime.UtcNow;
                    }
                    else if (combinedKey.Contains("ayu") || combinedKey.Contains("telegram") || combinedKey.Contains("tg") || combinedKey.Contains("telegraph"))
                    {
                        appType = "telegram";
                        appName = combinedKey.Contains("ayu") ? "Telegram (AyuGram)" : "Telegram";
                        scheme = "tg://";
                    }
                    else if (combinedKey.Contains("discord"))
                    {
                        appType = "discord";
                        appName = "Discord";
                        scheme = "discord://";
                    }
                    else if (combinedKey.Contains("vk") || combinedKey.Contains("вконтакте"))
                    {
                        appType = "vk";
                        appName = "ВКонтакте";
                        scheme = "https://vk.com";
                    }
                    else if (combinedKey.Contains("whatsapp"))
                    {
                        appType = "whatsapp";
                        appName = "WhatsApp";
                        scheme = "whatsapp://";
                    }
                    else if (combinedKey.Contains("chrome") || combinedKey.Contains("brave") || combinedKey.Contains("edge") || combinedKey.Contains("browser") || combinedKey.Contains("яндекс") || combinedKey.Contains("opera") || combinedKey.Contains("firefox"))
                    {
                        appType = "browser";
                        if (appName == "Приложение") appName = "Браузер";
                    }

                    string title = appName;
                    string body = "";

                    try
                    {
                        var visual = n.Notification?.Visual;
                        if (visual != null)
                        {
                            var textValues = new List<string>();
                            NotificationBinding? binding = null;
                            try
                            {
                                binding = visual.GetBinding(KnownNotificationBindings.ToastGeneric);
                            }
                            catch { }

                            if (binding != null)
                            {
                                var texts = binding.GetTextElements();
                                if (texts != null)
                                {
                                    textValues.AddRange(texts.Select(t => t?.Text?.Trim()).Where(t => !string.IsNullOrEmpty(t))!);
                                }
                            }

                            if (textValues.Count == 0 && visual.Bindings != null)
                            {
                                foreach (var b in visual.Bindings)
                                {
                                    var texts = b.GetTextElements();
                                    if (texts != null)
                                    {
                                        textValues.AddRange(texts.Select(t => t?.Text?.Trim()).Where(t => !string.IsNullOrEmpty(t))!);
                                    }
                                    if (textValues.Count > 0) break;
                                }
                            }

                            if (textValues.Count == 1)
                            {
                                string t0 = textValues[0];
                                if (t0.Contains(": "))
                                {
                                    var split = t0.Split(new[] { ": " }, 2, StringSplitOptions.None);
                                    title = split[0];
                                    body = split[1];
                                }
                                else
                                {
                                    title = appName;
                                    body = t0;
                                }
                            }
                            else if (textValues.Count >= 2)
                            {
                                title = textValues[0];
                                body = string.Join("\n", textValues.Skip(1));
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.Error.WriteLine($"[NotificationListener Visual Error]: {ex.Message}");
                    }

                    if (string.IsNullOrWhiteSpace(body) && !string.IsNullOrWhiteSpace(title) && title != appName)
                    {
                        body = title;
                        title = appName;
                    }

                    if (string.IsNullOrWhiteSpace(body))
                    {
                        body = "Новое уведомление";
                    }

                    Console.Error.WriteLine($"[NotificationListener Intercepted]: App={appName}, Title={title}, Body={body}");

                    // Dispatch to Dynamic Island UI
                    OnNotificationReceived?.Invoke(new
                    {
                        id = n.Id.ToString(),
                        app = appType,
                        appName = appName,
                        author = title,
                        title = appName,
                        message = body,
                        timestamp = DateTime.UtcNow.ToString("o"),
                        aumid = aumid,
                        scheme = scheme
                    });

                    // Suppress native Windows bottom-right popup by dismissing it AFTER extracting payload
                    if (SuppressSystemToasts)
                    {
                        try
                        {
                            _listener.RemoveNotification(n.Id);
                        }
                        catch (Exception ex)
                        {
                            Console.Error.WriteLine($"[NotificationListener Remove Error]: {ex.Message}");
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"[NotificationListener Processing Error]: {ex.Message}");
                }
            }

            // Keep seen IDs bounded
            if (_seenNotificationIds.Count > 300)
            {
                var toRemove = _seenNotificationIds.Take(150).ToList();
                foreach (var id in toRemove) _seenNotificationIds.Remove(id);
            }
        }
    }
}
