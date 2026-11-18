// Service for managing social notifications (Telegram, Discord, VK, etc.)

export const SAMPLE_NOTIFICATIONS = [
  {
    id: 'tg-1',
    app: 'telegram',
    appName: 'Telegram',
    author: 'Александр',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    title: 'Telegram • Разработка',
    message: 'Привет! Залил новый коммит, посмотри пулл-реквест когда будет время 🚀',
    time: 'Только что'
  },
  {
    id: 'dc-1',
    app: 'discord',
    appName: 'Discord',
    author: 'CyberFox',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
    title: 'Discord • #general',
    message: 'Кто в войс пойдет катать? Мы уже в канале, запрыгивай!',
    time: '1 мин назад'
  },
  {
    id: 'tg-2',
    app: 'telegram',
    appName: 'Telegram',
    author: 'Мария',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    title: 'Telegram • Личные',
    message: 'Договорились, встретимся в 19:00 у кофейни ☕',
    time: '2 мин назад'
  }
];

class NotificationManager {
  constructor() {
    this.notifications = [];
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.notifications);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.notifications);
    }
  }

  add(notif) {
    const item = {
      id: notif.id || `notif-${Date.now()}`,
      app: notif.app || 'telegram',
      appName: notif.appName || (notif.app === 'discord' ? 'Discord' : 'Telegram'),
      author: notif.author || 'Контакт',
      avatar: notif.avatar || '',
      title: notif.title || 'Новое уведомление',
      message: notif.message || '',
      time: 'Только что',
      timestamp: Date.now()
    };
    this.notifications = [item, ...this.notifications].slice(0, 20);
    this.notify();
    return item;
  }

  remove(id) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notify();
  }

  clear() {
    this.notifications = [];
    this.notify();
  }

  triggerSample() {
    const random = SAMPLE_NOTIFICATIONS[Math.floor(Math.random() * SAMPLE_NOTIFICATIONS.length)];
    return this.add({
      ...random,
      id: `sample-${Date.now()}`
    });
  }
}

export const notificationManager = new NotificationManager();
