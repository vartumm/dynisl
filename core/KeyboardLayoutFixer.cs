using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

namespace DynislCore
{
    public class KeyboardLayoutFixer
    {
        private static IntPtr _hookId = IntPtr.Zero;
        private static LowLevelKeyboardProc _proc = HookCallback;
        private static readonly StringBuilder _recentWord = new();
        private static bool _isEnabled = true;
        private static bool _autoReplace = true;
        private static Thread? _hookThread;

        public static Action<string, string>? OnLayoutCorrected;
        public static Action? OnWinVTriggered;

        // QWERTY to Russian layout map
        private static readonly Dictionary<char, char> EnToRu = new()
        {
            {'q', 'й'}, {'w', 'ц'}, {'e', 'у'}, {'r', 'к'}, {'t', 'е'}, {'y', 'н'}, {'u', 'г'}, {'i', 'ш'}, {'o', 'щ'}, {'p', 'з'}, {'[', 'х'}, {']', 'ъ'},
            {'a', 'ф'}, {'s', 'ы'}, {'d', 'в'}, {'f', 'а'}, {'g', 'п'}, {'h', 'р'}, {'j', 'о'}, {'k', 'л'}, {'l', 'д'}, {';', 'ж'}, {'\'', 'э'},
            {'z', 'я'}, {'x', 'ч'}, {'c', 'с'}, {'v', 'м'}, {'b', 'и'}, {'n', 'т'}, {'m', 'ь'}, {',', 'б'}, {'.', 'ю'}, {'`', 'ё'},
            {'Q', 'Й'}, {'W', 'Ц'}, {'E', 'У'}, {'R', 'К'}, {'T', 'Е'}, {'Y', 'Н'}, {'U', 'Г'}, {'I', 'Ш'}, {'O', 'Щ'}, {'P', 'З'}, {'{', 'Х'}, {'}', 'Ъ'},
            {'A', 'Ф'}, {'S', 'Ы'}, {'D', 'В'}, {'F', 'А'}, {'G', 'П'}, {'H', 'Р'}, {'J', 'О'}, {'K', 'Л'}, {'L', 'Д'}, {':', 'Ж'}, {'"', 'Э'},
            {'Z', 'Я'}, {'X', 'Ч'}, {'C', 'С'}, {'V', 'М'}, {'B', 'И'}, {'N', 'Т'}, {'M', 'Ь'}, {'<', 'Б'}, {'>', 'Ю'}, {'~', 'Ё'},
            {'?', ','}, {'&', '?'}, {'^', ':'}, {'$', ';'}, {'@', '"'}
        };

        private static readonly HashSet<string> CommonRuWordsOnEn = new(StringComparer.OrdinalIgnoreCase)
        {
            "ghjtrn", "ghbdtn", "rfr", "xnj", "xtuj", "dctv", "ytn", "lf", "cgtw", "rjhjxt", "gjrf", "vtym", "nt,z",
            "cgfcb,j", "gjikb", "kb,j", "xnj,s", "ghbrjk", "ctqxfc", "cjyb", "crjkmrj", "njkmrj", "rhenj", "pyftn",
            "gjyznyj", "ctujlyz", "pfdnkf", "pyf.", "cvjnhb", "crfpfnm", "ghbvth", "ghjcnj", "jnyjitybz", "xup",
            "njulf", "rjulf", "pyfxbn", "vtcnf", "vjue", "gjxtve", "pfxtv", "njxtyj", "ghfdlf", "ghjcne", "gjvjub",
            "pyfrjv", "vj;yj", "ytkmpz", "ybxtuj", "ybrnj", "dctulf", "ybrjulf", "gjpdjy", "pfgbcb", "djj,ot",
            "crjhj", "crfxbnm", "ljrevtyn", "vscy", "pfghjc", "jndtn", "ghbdtc", "cnfk", "cflbnmcz", "njxyj"
        };

        public static void SetEnabled(bool enabled, bool autoReplace)
        {
            _isEnabled = enabled;
            _autoReplace = autoReplace;
        }

        public static void Start()
        {
            if (_hookThread != null) return;

            _hookThread = new Thread(() =>
            {
                IntPtr user32 = LoadLibrary("user32.dll");
                _hookId = SetWindowsHookEx(WH_KEYBOARD_LL, _proc, user32, 0);

                if (_hookId == IntPtr.Zero)
                {
                    int err = Marshal.GetLastWin32Error();
                    Console.Error.WriteLine($"[KeyboardHook] Failed to set hook, err: {err}");
                    return;
                }

                while (GetMessage(out MSG msg, IntPtr.Zero, 0, 0))
                {
                    TranslateMessage(ref msg);
                    DispatchMessage(ref msg);
                }
            })
            {
                IsBackground = true,
                Priority = ThreadPriority.Highest
            };
            _hookThread.SetApartmentState(ApartmentState.STA);
            _hookThread.Start();
        }

        public static void Stop()
        {
            if (_hookId != IntPtr.Zero)
            {
                UnhookWindowsHookEx(_hookId);
                _hookId = IntPtr.Zero;
            }
        }

        public static string ConvertEnToRu(string input)
        {
            var sb = new StringBuilder();
            foreach (char c in input)
            {
                if (EnToRu.TryGetValue(c, out char ruChar))
                    sb.Append(ruChar);
                else
                    sb.Append(c);
            }
            return sb.ToString();
        }

        private static IntPtr GetForegroundKeyboardLayout()
        {
            try
            {
                IntPtr fg = GetForegroundWindow();
                if (fg == IntPtr.Zero) return GetKeyboardLayout(0);
                uint threadId = GetWindowThreadProcessId(fg, out _);
                return GetKeyboardLayout(threadId);
            }
            catch
            {
                return GetKeyboardLayout(0);
            }
        }

        private static bool IsRuTypoOnEn(string word, IntPtr hkl)
        {
            if (string.IsNullOrEmpty(word) || word.Length < 2) return false;

            // If the word contains ANY Cyrillic character, user is already typing Russian! NEVER auto-correct!
            foreach (char c in word)
            {
                if ((c >= 'а' && c <= 'я') || (c >= 'А' && c <= 'Я') || c == 'ё' || c == 'Ё')
                {
                    return false;
                }
            }

            // Check language ID of foreground window
            ushort langId = (ushort)((ulong)hkl & 0xFFFF);
            // 0x0419 is Russian (ru-RU). If active layout is Russian, return false!
            if (langId == 0x0419) return false;

            if (CommonRuWordsOnEn.Contains(word)) return true;

            if (word.Length >= 4)
            {
                string lower = word.ToLowerInvariant();
                if (lower.StartsWith("ghj") || lower.StartsWith("ghb") || lower.StartsWith("gjl") ||
                    lower.StartsWith("hfp") || lower.StartsWith("gth") || lower.StartsWith("dct") ||
                    lower.StartsWith("xnj") || lower.StartsWith("cgt") || lower.StartsWith("crj") ||
                    lower.StartsWith("njk") || lower.StartsWith("ybr") || lower.StartsWith("vj;"))
                {
                    return true;
                }
            }

            return false;
        }

        private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

        private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
        {
            if (nCode >= 0 && wParam == (IntPtr)WM_KEYDOWN)
            {
                int vkCode = Marshal.ReadInt32(lParam);
                bool winDown = (GetKeyState(VK_LWIN) & 0x8000) != 0 || (GetKeyState(VK_RWIN) & 0x8000) != 0;
                bool ctrlDown = (GetKeyState(VK_CONTROL) & 0x8000) != 0;
                bool shiftDown = (GetKeyState(VK_SHIFT) & 0x8000) != 0;
                bool altDown = (GetKeyState(VK_MENU) & 0x8000) != 0;

                // Win + V -> open clipboard
                if (winDown && (vkCode == 'V' || vkCode == 'v'))
                {
                    OnWinVTriggered?.Invoke();
                    return (IntPtr)1;
                }

                // Hotkeys for manual word layout conversion:
                // 1) Ctrl + Shift + R
                // 2) Ctrl + Shift + X
                // 3) Ctrl + Alt + R
                // 4) Pause / Break (fallback)
                bool isManualTrigger =
                    (ctrlDown && shiftDown && (vkCode == 'R' || vkCode == 'r' || vkCode == 'X' || vkCode == 'x')) ||
                    (ctrlDown && altDown && (vkCode == 'R' || vkCode == 'r')) ||
                    vkCode == 0x13 /* VK_PAUSE */;

                if (isManualTrigger)
                {
                    ManualConvertRecentWord();
                    return (IntPtr)1;
                }

                if (_isEnabled)
                {
                    IntPtr hkl = GetForegroundKeyboardLayout();
                    char c = ConvertVkToChar(vkCode, hkl);
                    if (c != '\0')
                    {
                        if (char.IsLetterOrDigit(c) || c == '\'' || c == ';' || c == '[' || c == ']' || c == ',' || c == '.')
                        {
                            _recentWord.Append(c);
                            if (_recentWord.Length > 35)
                                _recentWord.Remove(0, _recentWord.Length - 35);
                        }
                        else
                        {
                            CheckAndConvertWord(false, hkl);
                        }
                    }
                    else if (vkCode == 0x08) // Backspace
                    {
                        if (_recentWord.Length > 0)
                            _recentWord.Remove(_recentWord.Length - 1, 1);
                    }
                    else if (vkCode == 0x20) // Space
                    {
                        CheckAndConvertWord(true, hkl);
                    }
                    else if (vkCode == 0x0D) // Enter
                    {
                        CheckAndConvertWord(false, hkl);
                    }
                }
            }

            return CallNextHookEx(_hookId, nCode, wParam, lParam);
        }

        private static void ManualConvertRecentWord()
        {
            if (_recentWord.Length == 0) return;
            string word = _recentWord.ToString();
            _recentWord.Clear();
            string converted = ConvertEnToRu(word);
            ExecuteReplacement(word, converted, false);
        }

        private static void CheckAndConvertWord(bool triggeredBySpace, IntPtr hkl)
        {
            if (_recentWord.Length == 0) return;
            string word = _recentWord.ToString();
            _recentWord.Clear();

            if (IsRuTypoOnEn(word, hkl))
            {
                string converted = ConvertEnToRu(word);
                ExecuteReplacement(word, converted, triggeredBySpace);
            }
        }

        private static void ExecuteReplacement(string word, string converted, bool triggeredBySpace)
        {
            OnLayoutCorrected?.Invoke(word, converted);

            if (_autoReplace)
            {
                ThreadPool.QueueUserWorkItem(_ =>
                {
                    Thread.Sleep(20);

                    // 1. Erase typo using Backspace events
                    int backspaces = word.Length + (triggeredBySpace ? 1 : 0);
                    for (int i = 0; i < backspaces; i++)
                    {
                        keybd_event(0x08, 0, 0, UIntPtr.Zero);
                        keybd_event(0x08, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
                        Thread.Sleep(2);
                    }

                    // 2. Insert converted text via Clipboard paste (Ctrl+V)
                    // Perfectly preserves Unicode Cyrillic without UIPI blocking
                    string textToInsert = converted + (triggeredBySpace ? " " : "");
                    PasteViaClipboard(textToInsert);

                    // 3. Switch active window layout to Russian
                    SwitchForegroundLayoutToRussian();
                });
            }
        }

        private static void PasteViaClipboard(string text)
        {
            var sta = new Thread(() =>
            {
                try
                {
                    string oldText = "";
                    bool hasOld = false;
                    try
                    {
                        if (System.Windows.Forms.Clipboard.ContainsText())
                        {
                            oldText = System.Windows.Forms.Clipboard.GetText();
                            hasOld = true;
                        }
                    }
                    catch { }

                    System.Windows.Forms.Clipboard.SetText(text);

                    // Send Ctrl + V
                    keybd_event(0x11 /* VK_CONTROL */, 0, 0, UIntPtr.Zero);
                    keybd_event(0x56 /* VK_V */, 0, 0, UIntPtr.Zero);
                    keybd_event(0x56 /* VK_V */, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
                    keybd_event(0x11 /* VK_CONTROL */, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);

                    // Restore previous clipboard after short delay
                    if (hasOld && !string.IsNullOrEmpty(oldText))
                    {
                        Thread.Sleep(100);
                        try
                        {
                            System.Windows.Forms.Clipboard.SetText(oldText);
                        }
                        catch { }
                    }
                }
                catch { }
            });
            sta.SetApartmentState(ApartmentState.STA);
            sta.Start();
            sta.Join(600);
        }

        private static void SwitchForegroundLayoutToRussian()
        {
            try
            {
                IntPtr fg = GetForegroundWindow();
                if (fg != IntPtr.Zero)
                {
                    // 0x0050 = WM_INPUTLANGCHANGEREQUEST, 0x04190419 = Russian
                    PostMessage(fg, 0x0050, IntPtr.Zero, (IntPtr)0x04190419);
                }
            }
            catch { }
        }

        private static char ConvertVkToChar(int vkCode, IntPtr hkl)
        {
            byte[] keyboardState = new byte[256];
            GetKeyboardState(keyboardState);
            StringBuilder sb = new StringBuilder(4);
            uint scanCode = MapVirtualKey((uint)vkCode, 0);
            int ret = ToUnicodeEx((uint)vkCode, scanCode, keyboardState, sb, sb.Capacity, 0, hkl);
            return ret > 0 ? sb[0] : '\0';
        }

        private const int WH_KEYBOARD_LL = 13;
        private const int WM_KEYDOWN = 0x0100;
        private const int VK_LWIN = 0x5B;
        private const int VK_RWIN = 0x5C;
        private const int VK_CONTROL = 0x11;
        private const int VK_SHIFT = 0x10;
        private const int VK_MENU = 0x12;
        private const uint KEYEVENTF_KEYUP = 0x0002;

        [StructLayout(LayoutKind.Sequential)]
        private struct MSG
        {
            public IntPtr hwnd;
            public uint message;
            public IntPtr wParam;
            public IntPtr lParam;
            public uint time;
            public POINT pt;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct POINT
        {
            public int x;
            public int y;
        }

        [DllImport("user32.dll", SetLastError = true)]
        private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

        [DllImport("user32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool UnhookWindowsHookEx(IntPtr hhk);

        [DllImport("user32.dll")]
        private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

        [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        private static extern IntPtr LoadLibrary(string lpFileName);

        [DllImport("user32.dll")]
        private static extern short GetKeyState(int nVirtKey);

        [DllImport("user32.dll")]
        private static extern bool GetKeyboardState(byte[] lpKeyState);

        [DllImport("user32.dll")]
        private static extern uint MapVirtualKey(uint uCode, uint uMapType);

        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        private static extern int ToUnicodeEx(uint wVirtKey, uint wScanCode, byte[] lpKeyState, [Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pwszBuff, int cchBuff, uint wFlags, IntPtr dwhkl);

        [DllImport("user32.dll")]
        public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

        [DllImport("user32.dll")]
        private static extern bool GetMessage(out MSG lpMsg, IntPtr hWnd, uint wMsgFilterMin, uint wMsgFilterMax);

        [DllImport("user32.dll")]
        private static extern bool TranslateMessage([In] ref MSG lpMsg);

        [DllImport("user32.dll")]
        private static extern IntPtr DispatchMessage([In] ref MSG lpMsg);

        [DllImport("user32.dll")]
        private static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("user32.dll")]
        private static extern IntPtr GetKeyboardLayout(uint idThread);

        [DllImport("user32.dll")]
        private static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
    }
}
