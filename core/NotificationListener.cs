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
        public static Action<object>? OnNotificationReceived;
        public static bool SuppressSystemToasts { get; set; } = true;

        public static async Task StartAsync()
        {
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
                    try
                    {
                        if (n.AppInfo?.DisplayInfo?.DisplayName != null)
                        {
                            appName = n.AppInfo.DisplayInfo.DisplayName;
                        }
                    }
                    catch { }

                    string appKey = appName.ToLowerInvariant();
                    string appType = "system";
                    if (appKey.Contains("discord")) appType = "discord";
                    else if (appKey.Contains("telegram") || appKey.Contains("tg")) appType = "telegram";
                    else if (appKey.Contains("vk") || appKey.Contains("вконтакте")) appType = "vk";
                    else if (appKey.Contains("whatsapp")) appType = "whatsapp";
                    else if (appKey.Contains("chrome") || appKey.Contains("brave") || appKey.Contains("edge") || appKey.Contains("browser") || appKey.Contains("яндекс")) appType = "browser";

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
                        timestamp = DateTime.UtcNow.ToString("o")
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
