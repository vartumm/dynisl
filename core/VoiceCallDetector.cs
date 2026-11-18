using System;
using Microsoft.Win32;

namespace DynislCore
{
    public class VoiceCallDetector
    {
        private static bool _isDismissedByUser = false;

        public static void DismissCurrentCall()
        {
            _isDismissedByUser = true;
        }

        public static bool IsVoiceAppInCall(out string appName)
        {
            appName = "";

            if (CheckMicInUse("Discord"))
            {
                appName = "discord";
                if (!_isDismissedByUser) return true;
            }
            else if (CheckMicInUse("Telegram"))
            {
                appName = "telegram";
                if (!_isDismissedByUser) return true;
            }
            else if (CheckMicInUse("WhatsApp"))
            {
                appName = "whatsapp";
                if (!_isDismissedByUser) return true;
            }
            else
            {
                // Reset dismissed flag when call actually ends
                _isDismissedByUser = false;
                return false;
            }

            return false;
        }

        private static bool CheckMicInUse(string processNameSubstring)
        {
            // 1. Check NonPackaged apps (Desktop Discord, Telegram Win32, etc.)
            try
            {
                using var nonPackaged = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone\NonPackaged");
                if (nonPackaged != null)
                {
                    foreach (var subName in nonPackaged.GetSubKeyNames())
                    {
                        if (subName.IndexOf(processNameSubstring, StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            using var appKey = nonPackaged.OpenSubKey(subName);
                            if (appKey != null)
                            {
                                var startObj = appKey.GetValue("LastUsedTimeStart");
                                var stopObj = appKey.GetValue("LastUsedTimeStop");
                                if (startObj is long start && stopObj is long stop)
                                {
                                    // When recording is active, Stop is 0 or less than Start
                                    if (start > 0 && (stop == 0 || stop < start))
                                    {
                                        return true;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            catch { }

            // 2. Check Packaged (UWP / Store) apps
            try
            {
                using var packaged = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone");
                if (packaged != null)
                {
                    foreach (var subName in packaged.GetSubKeyNames())
                    {
                        if (subName.Equals("NonPackaged", StringComparison.OrdinalIgnoreCase)) continue;
                        if (subName.IndexOf(processNameSubstring, StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            using var appKey = packaged.OpenSubKey(subName);
                            if (appKey != null)
                            {
                                var startObj = appKey.GetValue("LastUsedTimeStart");
                                var stopObj = appKey.GetValue("LastUsedTimeStop");
                                if (startObj is long start && stopObj is long stop)
                                {
                                    if (start > 0 && (stop == 0 || stop < start))
                                    {
                                        return true;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            catch { }

            return false;
        }
    }
}
