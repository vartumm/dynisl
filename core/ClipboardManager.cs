using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace DynislCore
{
    public class ClipboardItem
    {
        public string Id { get; set; } = Guid.NewGuid().ToString("N");
        public string Type { get; set; } = "text"; // "text" or "image"
        public string Text { get; set; } = "";
        public string ImageBase64 { get; set; } = "";
        public string Timestamp { get; set; } = DateTime.UtcNow.ToString("o");
        public bool IsPinned { get; set; } = false;
    }

    public class ClipboardManager
    {
        private static readonly List<ClipboardItem> _history = new();
        private static readonly object _lock = new();
        private static ClipboardMessageWindow? _window;
        private static Thread? _thread;

        public static Action<List<ClipboardItem>>? OnClipboardChanged;

        public static void Start()
        {
            _thread = new Thread(() =>
            {
                _window = new ClipboardMessageWindow();
                Application.Run(); // Run message loop without Form
            })
            {
                IsBackground = true
            };
            _thread.SetApartmentState(ApartmentState.STA);
            _thread.Start();
        }

        public static List<ClipboardItem> GetHistory()
        {
            lock (_lock)
            {
                return new List<ClipboardItem>(_history);
            }
        }

        public static void SetText(string text)
        {
            var t = new Thread(() =>
            {
                try
                {
                    Clipboard.SetText(text);
                }
                catch { }
            });
            t.SetApartmentState(ApartmentState.STA);
            t.Start();
        }

        public static void Clear()
        {
            lock (_lock)
            {
                _history.RemoveAll(i => !i.IsPinned);
            }
            OnClipboardChanged?.Invoke(GetHistory());
        }

        public static void TogglePin(string id)
        {
            lock (_lock)
            {
                var item = _history.Find(i => i.Id == id);
                if (item != null)
                {
                    item.IsPinned = !item.IsPinned;
                }
            }
            OnClipboardChanged?.Invoke(GetHistory());
        }

        public static void Remove(string id)
        {
            lock (_lock)
            {
                _history.RemoveAll(i => i.Id == id);
            }
            OnClipboardChanged?.Invoke(GetHistory());
        }

        internal static void HandleClipboardUpdate()
        {
            try
            {
                if (Clipboard.ContainsText())
                {
                    string text = Clipboard.GetText();
                    if (string.IsNullOrWhiteSpace(text)) return;

                    lock (_lock)
                    {
                        if (_history.Count > 0 && _history[0].Type == "text" && _history[0].Text == text)
                            return;

                        var newItem = new ClipboardItem
                        {
                            Type = "text",
                            Text = text
                        };
                        _history.Insert(0, newItem);
                        if (_history.Count > 60) _history.RemoveAt(_history.Count - 1);
                    }
                    OnClipboardChanged?.Invoke(GetHistory());
                }
                else if (Clipboard.ContainsImage())
                {
                    var img = Clipboard.GetImage();
                    if (img != null)
                    {
                        using var ms = new MemoryStream();
                        int w = img.Width;
                        int h = img.Height;
                        if (w > 400)
                        {
                            h = (int)((float)h * 400 / w);
                            w = 400;
                        }
                        using var bmp = new Bitmap(img, new Size(w, h));
                        bmp.Save(ms, ImageFormat.Jpeg);
                        string base64 = "data:image/jpeg;base64," + Convert.ToBase64String(ms.ToArray());

                        lock (_lock)
                        {
                            var newItem = new ClipboardItem
                            {
                                Type = "image",
                                ImageBase64 = base64,
                                Text = $"[Image {img.Width}x{img.Height}]"
                            };
                            _history.Insert(0, newItem);
                            if (_history.Count > 60) _history.RemoveAt(_history.Count - 1);
                        }
                        OnClipboardChanged?.Invoke(GetHistory());
                    }
                }
            }
            catch
            {
            }
        }

        // Native message-only window with Parent = HWND_MESSAGE (-3)
        // Never has screen bounds, never draws, completely invisible to the desktop!
        private class ClipboardMessageWindow : NativeWindow
        {
            private const int WM_CLIPBOARDUPDATE = 0x031D;
            private const int HWND_MESSAGE = -3;

            [DllImport("user32.dll", SetLastError = true)]
            [return: MarshalAs(UnmanagedType.Bool)]
            private static extern bool AddClipboardFormatListener(IntPtr hwnd);

            [DllImport("user32.dll", SetLastError = true)]
            [return: MarshalAs(UnmanagedType.Bool)]
            private static extern bool RemoveClipboardFormatListener(IntPtr hwnd);

            public ClipboardMessageWindow()
            {
                var cp = new CreateParams
                {
                    Parent = (IntPtr)HWND_MESSAGE
                };
                CreateHandle(cp);
                AddClipboardFormatListener(Handle);
            }

            protected override void WndProc(ref Message m)
            {
                if (m.Msg == WM_CLIPBOARDUPDATE)
                {
                    HandleClipboardUpdate();
                }
                base.WndProc(ref m);
            }
        }
    }
}
