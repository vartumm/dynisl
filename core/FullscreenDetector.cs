using System;
using System.Diagnostics;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows.Forms;

namespace DynislCore
{
    public class FullscreenDetector
    {
        [StructLayout(LayoutKind.Sequential)]
        public struct RECT
        {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }

        [DllImport("user32.dll")]
        private static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        private static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        private static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

        [DllImport("user32.dll")]
        private static extern IntPtr GetShellWindow();

        [DllImport("user32.dll")]
        private static extern int GetWindowLong(IntPtr hWnd, int nIndex);

        [DllImport("user32.dll")]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        private const int GWL_STYLE = -16;
        private const int WS_CAPTION = 0x00C00000;

        public static bool IsForegroundFullscreen()
        {
            try
            {
                IntPtr fg = GetForegroundWindow();
                if (fg == IntPtr.Zero) return false;
                if (fg == GetShellWindow()) return false;

                // Check process name - never hide for own app or explorer
                GetWindowThreadProcessId(fg, out uint pid);
                if (pid > 0)
                {
                    try
                    {
                        string pName = Process.GetProcessById((int)pid).ProcessName.ToLowerInvariant();
                        if (pName.Contains("electron") || pName.Contains("dynisl") || pName == "explorer")
                            return false;
                    }
                    catch { }
                }

                StringBuilder className = new StringBuilder(256);
                GetClassName(fg, className, 256);
                string cls = className.ToString();
                if (cls == "Progman" || cls == "WorkerW" || cls == "Shell_TrayWnd")
                    return false;

                if (!GetWindowRect(fg, out RECT rect))
                    return false;

                int style = GetWindowLong(fg, GWL_STYLE);

                // If window has standard caption/titlebar (WS_CAPTION), it's a regular desktop app, NOT a fullscreen game!
                if ((style & WS_CAPTION) == WS_CAPTION)
                {
                    return false;
                }

                // Check if window covers any screen completely
                foreach (Screen s in Screen.AllScreens)
                {
                    if (rect.Left <= s.Bounds.Left &&
                        rect.Top <= s.Bounds.Top &&
                        rect.Right >= s.Bounds.Right &&
                        rect.Bottom >= s.Bounds.Bottom)
                    {
                        // True borderless fullscreen game or F11 video!
                        return true;
                    }
                }
            }
            catch { }

            return false;
        }
    }
}
