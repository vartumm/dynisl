// Themes configuration for Dynamic Island

export const ISLAND_THEMES = {
  'liquid-glass': {
    id: 'liquid-glass',
    name: 'Liquid Glass (Жидкое стекло)',
    description: 'Органическое преломляющее матовое стекло с зеркальным бликом',
    style: {
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(32px) saturate(210%) brightness(1.12) contrast(1.05)',
      WebkitBackdropFilter: 'blur(32px) saturate(210%) brightness(1.12) contrast(1.05)',
      border: '1px solid rgba(255, 255, 255, 0.22)',
      borderTop: '1.5px solid rgba(255, 255, 255, 0.65)',
      borderLeft: '1px solid rgba(255, 255, 255, 0.4)',
      boxShadow: '0 24px 50px rgba(0, 0, 0, 0.55), inset 0 1.5px 0.5px rgba(255, 255, 255, 0.6), inset 0 -2px 6px rgba(0, 0, 0, 0.35)',
      color: '#ffffff'
    },
    neckFill: 'rgba(255, 255, 255, 0.1)',
    accent: '#38bdf8',
    glassHighlight: true
  },
  black: {
    id: 'black',
    name: 'Глубокий чёрный (OLED)',
    description: 'Классический стиль Dynamic Island как на iPhone',
    style: {
      background: '#050507',
      backdropFilter: 'blur(25px)',
      WebkitBackdropFilter: 'blur(25px)',
      border: '1px solid rgba(255, 255, 255, 0.14)',
      borderTop: '1.2px solid rgba(255, 255, 255, 0.3)',
      boxShadow: '0 20px 48px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
      color: '#f8fafc'
    },
    neckFill: '#050507',
    accent: '#ffffff',
    glassHighlight: true
  },
  gradient: {
    id: 'gradient',
    name: 'Живой градиент (Fluid Aurora)',
    description: 'Плавный переливающийся неоновый космический градиент',
    style: {
      background: 'linear-gradient(135deg, rgba(34, 18, 62, 0.88), rgba(12, 36, 68, 0.88), rgba(42, 22, 58, 0.88))',
      backgroundSize: '200% 200%',
      backdropFilter: 'blur(35px) saturate(180%)',
      WebkitBackdropFilter: 'blur(35px) saturate(180%)',
      border: '1px solid rgba(168, 85, 247, 0.4)',
      borderTop: '1.5px solid rgba(216, 180, 254, 0.7)',
      boxShadow: '0 24px 50px rgba(112, 26, 117, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
      color: '#ffffff'
    },
    neckFill: 'rgba(34, 18, 62, 0.9)',
    accent: '#c084fc',
    glassHighlight: true
  },
  custom: {
    id: 'custom',
    name: 'Кастомный цвет',
    description: 'Индивидуальная палитра с настраиваемым акцентом',
    style: (customColor = '#0f172a', customAccent = '#38bdf8') => ({
      background: `${customColor}e6`,
      backdropFilter: 'blur(30px)',
      WebkitBackdropFilter: 'blur(30px)',
      border: `1px solid ${customAccent}55`,
      borderTop: `1.5px solid ${customAccent}aa`,
      boxShadow: `0 24px 50px ${customAccent}30, inset 0 1px 1px rgba(255,255,255,0.4)`,
      color: '#ffffff'
    }),
    neckFill: '#0f172ae6',
    accent: '#38bdf8',
    glassHighlight: true
  }
};
