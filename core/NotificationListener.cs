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

        public static async Task StartAsync()
        {
            try
            {
                _listener = UserNotificationListener.Current;
                if (_listener == null) return;

                var access = await _listener.RequestAccessAsync();
                if (access != UserNotificationListenerAccessStatus.Allowed)
                {
                    Console.Error.WriteLine($"[NotificationListener] Access status: {access}");
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
                    }
                }
                catch { }

                // Try subscribing to push notification event if supported in this environment
                try
                {
                    _listener.NotificationChanged += async (sender, args) =>
                    {
                        await CheckNewNotificationsAsync();
                    };
                }
                catch (Exception ex)
                {
                    // 0x80070490 in unpackaged app is expected; fallback to active polling
                    Console.Error.WriteLine($"[NotificationListener]: NotificationChanged event not supported ({ex.Message}), active polling enabled.");
                }

                // Ultra-fast active poller (every 80ms) to instantly capture & suppress bottom-right Windows toasts
                _ = Task.Run(async () =>
                {
                    while (true)
                    {
                        try
                        {
                            await CheckNewNotificationsAsync();
                        }
                        catch { }
                        await Task.Delay(80);
                    }
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[NotificationListener Error]: {ex.Message}");
            }
        }

        private static async Task CheckNewNotificationsAsync()
        {
            if (_listener == null) return;
            try
            {
                var notifs = await _listener.GetNotificationsAsync(NotificationKinds.Toast);
                if (notifs == null || notifs.Count == 0) return;

                foreach (var n in notifs)
                {
                    if (_seenNotificationIds.Contains(n.Id)) continue;
                    _seenNotificationIds.Add(n.Id);

                    // Suppress native Windows bottom-right popup by dismissing it from the system toast queue
                    try
                    {
                        _listener.RemoveNotification(n.Id);
                    }
                    catch { }

                    string appName = n.AppInfo?.DisplayInfo?.DisplayName ?? "Приложение";
                    string appKey = appName.ToLowerInvariant();
                    string appType = "system";
                    if (appKey.Contains("discord")) appType = "discord";
                    else if (appKey.Contains("telegram")) appType = "telegram";
                    else if (appKey.Contains("vk")) appType = "vk";
                    else if (appKey.Contains("whatsapp")) appType = "whatsapp";

                    string title = appName;
                    string body = "";

                    var binding = n.Notification?.Visual?.GetBinding(KnownNotificationBindings.ToastGeneric);
                    if (binding != null)
                    {
                        var texts = binding.GetTextElements();
                        if (texts != null)
                        {
                            if (texts.Count > 0 && !string.IsNullOrWhiteSpace(texts[0].Text))
                                title = texts[0].Text;
                            if (texts.Count > 1 && !string.IsNullOrWhiteSpace(texts[1].Text))
                                body = texts[1].Text;
                        }
                    }

                    if (!string.IsNullOrWhiteSpace(title) || !string.IsNullOrWhiteSpace(body))
                    {
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
                    }
                }

                // Limit seen IDs set
                if (_seenNotificationIds.Count > 200)
                {
                    var toRemove = _seenNotificationIds.Take(100).ToList();
                    foreach (var id in toRemove) _seenNotificationIds.Remove(id);
                }
            }
            catch { }
        }
    }
}
