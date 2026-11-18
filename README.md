# Dynamic Island for Windows (DynIsl)

Системная оверлейная панель для Windows 10/11 x64. Проект объединяет управление мультимедиа, мониторинг аудиоустройств, историю буфера обмена и системные уведомления в компактном плавающем интерфейсе с динамическим сквозным кликом.

---

## Архитектура системы

Приложение разделено на три изолированных слоя:

```
[ Frontend: React 19 / Vite ]
           │  (IPC / Preload)
[ Shell: Electron 45 Runtime ]
           │  (Standard I/O JSON-RPC)
[ Core: C# .NET 8 Win32/WinRT Service ]
```

### 1. Нативное ядро (C# .NET 8 Win32/WinRT)
* **MediaManager:** Взаимодействие с Windows Runtime GSMTC (`GlobalSystemMediaTransportControlsSessionManager`). Получение метаданных активных медиасессий (Spotify, Яндекс Музыка, YouTube, VLC), управление воспроизведением через аппаратный синтез `VK_MEDIA_*` (`keybd_event`).
* **CoreAudioHelper:** Прямая интеграция с Windows CoreAudio API (`IMMDeviceEnumerator`, `IAudioMeterInformation`) для захвата пиковых уровней микрофона в реальном времени.
* **KeyboardLayoutFixer:** Низкоуровневый хук клавиатуры `WH_KEYBOARD_LL` (`SetWindowsHookExW`). Детекция ввода ошибочной раскладки клавиатуры и автоматическая замена через синтез ввода `SendInput`.
* **FullscreenDetector:** Мониторинг активного окна через Win32 API (`GetForegroundWindow`, `GetWindowRect`, `MONITORINFO`) для автоматического сворачивания панели в полноэкранных 3D-приложениях.

### 2. Оболочка рабочего стола (Electron 45)
* **Прозрачное окно:** Безрамочное окно (`frame: false`, `transparent: true`, `alwaysOnTop: 'screen-saver'`).
* **Pass-Through Click:** Динамическое управление `setIgnoreMouseEvents`. Все неактивные и прозрачные области окна на 100% пропускают клики мыши к лежащим ниже окнам Windows.
* **Облачные обновления:** Встроенный модуль `electron-updater` с поддержкой дельта-обновлений и валидацией контрольных сумм SHA-512 через GitHub Releases.

### 3. Пользовательский интерфейс (React 19)
* Аппаратное ускорение анимаций через CSS Transform и пружинные кривые перехода.
* Отображение синхронизированных текстов песен по протоколу LRCLIB.
* Интегрированное управление настройками (без создания сторонних окон).

---

## Системные требования

* **ОС:** Windows 10 (сборка 19041+) / Windows 11 (x64).
* **Зависимости:** Не требуются (все необходимые среды выполнения скомпилированы и упакованы в исполняемый файл).

---

## Горячие клавиши

| Сочетание | Действие |
| :--- | :--- |
| `Ctrl + Shift + H` | Скрыть / отобразить панель Dynamic Island |
| `Alt + V` / `Win + V` | Открыть менеджер буфера обмена |
| `Pause / Break` | Принудительное исправление раскладки последнего слова |

---

## Установка и релизы

Готовые сборки приложения публикуются в разделе **[Releases](https://github.com/vartumm/dynisl/releases)**:
* `Dynamic Island Setup.exe` — инсталлятор с автоматической регистрацией и поддержкой обновлений.
* `Dynamic Island.exe` — автономная портативная версия.

---

## Сборка из исходников

```cmd
# Клонирование репозитория
git clone https://github.com/vartumm/dynisl.git
cd dynisl

# Установка зависимостей
npm install

# Компиляция C# бэкенда (.NET 8 SDK)
npm run build:core

# Сборка интерфейса и упаковка
npm run dist
```
