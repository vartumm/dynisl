using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace DynislCore
{
    public class VoiceCallDetector
    {
        [DllImport("iphlpapi.dll", SetLastError = true)]
        private static extern uint GetExtendedUdpTable(IntPtr pUdpTable, ref int pdwSize, bool bOrder, uint ulAf, int TableClass, uint Reserved);

        private const int AF_INET = 2;
        private const int UDP_TABLE_OWNER_PID = 1;

        private static bool _isDismissedByUser = false;

        public static void DismissCurrentCall()
        {
            _isDismissedByUser = true;
        }

        public static bool IsVoiceAppInCall(out string appName)
        {
            appName = "";
            int size = 0;
            GetExtendedUdpTable(IntPtr.Zero, ref size, false, AF_INET, UDP_TABLE_OWNER_PID, 0);
            if (size <= 0)
            {
                _isDismissedByUser = false;
                return false;
            }

            IntPtr pTable = Marshal.AllocHGlobal(size);
            bool foundVoice = false;
            try
            {
                if (GetExtendedUdpTable(pTable, ref size, false, AF_INET, UDP_TABLE_OWNER_PID, 0) == 0)
                {
                    int numEntries = Marshal.ReadInt32(pTable);
                    IntPtr rowPtr = IntPtr.Add(pTable, 4);

                    for (int i = 0; i < numEntries; i++)
                    {
                        // MIB_UDPROW_OWNER_PID: dwLocalAddr (4), dwLocalPort (4), dwOwningPid (4)
                        int pid = Marshal.ReadInt32(rowPtr, 8);
                        rowPtr = IntPtr.Add(rowPtr, 12);

                        if (pid > 0)
                        {
                            try
                            {
                                string pName = Process.GetProcessById(pid).ProcessName;
                                if (pName.Equals("Discord", StringComparison.OrdinalIgnoreCase))
                                {
                                    appName = "discord";
                                    foundVoice = true;
                                    break;
                                }
                                if (pName.Equals("Telegram", StringComparison.OrdinalIgnoreCase))
                                {
                                    appName = "telegram";
                                    foundVoice = true;
                                    break;
                                }
                            }
                            catch { }
                        }
                    }
                }
            }
            catch { }
            finally
            {
                Marshal.FreeHGlobal(pTable);
            }

            if (!foundVoice)
            {
                // Reset dismissed flag when voice socket actually disappears
                _isDismissedByUser = false;
                return false;
            }

            if (_isDismissedByUser)
            {
                return false;
            }

            return true;
        }
    }
}
