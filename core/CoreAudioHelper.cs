using System;
using System.Runtime.InteropServices;

namespace DynislCore
{
    [ComImport]
    [Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
    internal class MMDeviceEnumeratorComObject { }

    [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IMMDeviceEnumerator
    {
        int EnumAudioEndpoints(int dataFlow, int stateMask, out IntPtr devices);
        int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
    }

    [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IMMDevice
    {
        int Activate(ref Guid id, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object interfacePointer);
    }

    [Guid("C02216F6-8C67-4B5B-9D00-D008E73E0064"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IAudioMeterInformation
    {
        int GetPeakValue(out float pfPeak);
        int GetMeteringChannelCount(out int pnChannelCount);
        int GetChannelsPeakValues(int u32ChannelCount, [In] IntPtr afPeakValues);
        int QueryHardwareSupport(out int pdwHardwareSupportMask);
    }

    [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IAudioEndpointVolume
    {
        int RegisterControlChangeNotify(IntPtr pNotify);
        int UnregisterControlChangeNotify(IntPtr pNotify);
        int GetChannelCount(out int pnChannelCount);
        int SetMasterVolumeLevel(float fLevelDB, ref Guid pguidEventContext);
        int SetMasterVolumeLevelScalar(float fLevel, ref Guid pguidEventContext);
        int GetMasterVolumeLevel(out float pfLevelDB);
        int GetMasterVolumeLevelScalar(out float pfLevel);
        int SetChannelVolumeLevel(int nChannel, float fLevelDB, ref Guid pguidEventContext);
        int SetChannelVolumeLevelScalar(int nChannel, float fLevel, ref Guid pguidEventContext);
        int GetChannelVolumeLevel(int nChannel, out float pfLevelDB);
        int GetChannelVolumeLevelScalar(int nChannel, out float pfLevel);
        int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, ref Guid pguidEventContext);
        int GetMute([MarshalAs(UnmanagedType.Bool)] out bool pbMute);
    }

    public class CoreAudioHelper
    {
        public static float GetMicPeak()
        {
            try
            {
                var enumerator = (IMMDeviceEnumerator)new MMDeviceEnumeratorComObject();
                // Check communications role first (role 2), fallback to role 0
                int[] roles = { 2, 0, 1 };
                Guid meterGuid = new Guid("C02216F6-8C67-4B5B-9D00-D008E73E0064");

                foreach (int role in roles)
                {
                    if (enumerator.GetDefaultAudioEndpoint(1 /* eCapture */, role, out IMMDevice dev) == 0 && dev != null)
                    {
                        if (dev.Activate(ref meterGuid, 1, IntPtr.Zero, out object obj) == 0 && obj != null)
                        {
                            var meter = (IAudioMeterInformation)obj;
                            if (meter.GetPeakValue(out float peak) == 0 && peak > 0.001f)
                            {
                                return peak;
                            }
                        }
                    }
                }
            }
            catch { }
            return 0f;
        }

        public static bool SetMicMute(bool mute)
        {
            bool success = false;
            try
            {
                var enumerator = (IMMDeviceEnumerator)new MMDeviceEnumeratorComObject();
                int[] roles = { 2, 0, 1 };
                Guid volGuid = new Guid("5CDF2C82-841E-4546-9722-0CF74078229A");

                foreach (int role in roles)
                {
                    if (enumerator.GetDefaultAudioEndpoint(1 /* eCapture */, role, out IMMDevice dev) == 0 && dev != null)
                    {
                        if (dev.Activate(ref volGuid, 1, IntPtr.Zero, out object obj) == 0 && obj != null)
                        {
                            var endpointVol = (IAudioEndpointVolume)obj;
                            Guid ctx = Guid.Empty;
                            endpointVol.SetMute(mute, ref ctx);
                            success = true;
                        }
                    }
                }
            }
            catch { }
            return success;
        }

        public static bool GetMicMute()
        {
            try
            {
                var enumerator = (IMMDeviceEnumerator)new MMDeviceEnumeratorComObject();
                int[] roles = { 2, 0, 1 };
                Guid volGuid = new Guid("5CDF2C82-841E-4546-9722-0CF74078229A");

                foreach (int role in roles)
                {
                    if (enumerator.GetDefaultAudioEndpoint(1, role, out IMMDevice dev) == 0 && dev != null)
                    {
                        if (dev.Activate(ref volGuid, 1, IntPtr.Zero, out object obj) == 0 && obj != null)
                        {
                            var endpointVol = (IAudioEndpointVolume)obj;
                            if (endpointVol.GetMute(out bool isMute) == 0)
                            {
                                return isMute;
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
