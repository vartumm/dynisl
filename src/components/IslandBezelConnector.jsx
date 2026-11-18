import React from 'react';

/**
 * Water droplet meniscus linking the island to the top bezel (y: 0).
 * Simulates surface tension adhesion of a water drop hanging from a ceiling.
 */
export default function IslandBezelConnector({
  islandWidth,
  islandHeight,
  theme,
  isExpanded,
  offsetY = 8
}) {
  const neckHeight = offsetY + 4;
  // Meniscus width spreads wider at the ceiling (y: 0)
  const meniscusWidth = Math.min(islandWidth * 0.85, 360);
  const halfMeniscus = meniscusWidth / 2;
  const halfPill = Math.min(islandWidth * 0.45, 170);

  // Organic S-curve path representing liquid adhesion to the top ceiling:
  // Starts at top-left (-halfMeniscus, 0), sweeps downward and inward towards the pill top (-halfPill, neckHeight),
  // lines across the pill top, then symmetrically curves up to the top-right (+halfMeniscus, 0).
  const pathData = `
    M ${-halfMeniscus} 0
    C ${-halfMeniscus * 0.45} 0, ${-halfPill - 12} ${neckHeight * 0.5}, ${-halfPill} ${neckHeight}
    L ${halfPill} ${neckHeight}
    C ${halfPill + 12} ${neckHeight * 0.5}, ${halfMeniscus * 0.45} 0, ${halfMeniscus} 0
    Z
  `;

  const fill = theme?.neckFill || 'rgba(255, 255, 255, 0.1)';

  return (
    <div
      className="island-bezel-neck"
      style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        zIndex: 0
      }}
    >
      <svg
        width={meniscusWidth + 20}
        height={neckHeight + 1}
        viewBox={`${-(meniscusWidth + 20) / 2} 0 ${meniscusWidth + 20} ${neckHeight + 1}`}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="dropletGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.35)" />
            <stop offset="40%" stopColor={fill} />
            <stop offset="100%" stopColor={fill} />
          </linearGradient>
        </defs>
        <path
          d={pathData}
          fill="url(#dropletGradient)"
          style={{
            transition: 'd 0.35s cubic-bezier(0.22, 1.25, 0.36, 1), fill 0.3s ease'
          }}
        />
        {/* Fine specular shine along the ceiling wetting contact */}
        <line
          x1={-halfMeniscus * 0.75}
          y1="0.5"
          x2={halfMeniscus * 0.75}
          y2="0.5"
          stroke="rgba(255, 255, 255, 0.55)"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
