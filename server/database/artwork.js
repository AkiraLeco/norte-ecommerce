// Gera ilustrações SVG autorais (peças de roupa em silhueta) usadas pelos dados demonstrativos.
// Tudo é gerado localmente: nenhuma imagem externa é necessária.

const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = ([r, g, b]) => `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`;
const mix = (hex, target, t) => toHex(toRgb(hex).map((v, i) => v + (target[i] - v) * t));
const shade = (hex, t) => mix(hex, [0, 0, 0], t);
const tint = (hex, t) => mix(hex, [255, 255, 255], t);
const luma = (hex) => { const [r, g, b] = toRgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

const SHAPES = {
  tshirt: (c, d) => `
    <path d="M200 150 L118 205 L152 292 L205 268 L205 604 L395 604 L395 268 L448 292 L482 205 L400 150 Q300 214 200 150 Z" fill="${c}"/>
    <path d="M200 150 Q300 214 400 150 L388 146 Q300 196 212 146 Z" fill="${d}"/>`,
  shirt: (c, d) => `
    <path d="M198 148 L108 330 L148 348 L205 246 L205 612 L395 612 L395 246 L452 348 L492 330 L402 148 Q300 205 198 148 Z" fill="${c}"/>
    <path d="M198 148 L300 205 L402 148 L378 132 L300 170 L222 132 Z" fill="${d}"/>
    <line x1="300" y1="205" x2="300" y2="612" stroke="${d}" stroke-width="3"/>
    ${[250, 320, 390, 460, 530].map((y) => `<circle cx="312" cy="${y}" r="4" fill="${d}"/>`).join('')}
    <rect x="320" y="285" width="52" height="58" fill="none" stroke="${d}" stroke-width="2.5"/>`,
  hoodie: (c, d) => `
    <path d="M188 172 L98 266 L126 528 L188 516 L192 626 L408 626 L412 516 L474 528 L502 266 L412 172 Q300 238 188 172 Z" fill="${c}"/>
    <path d="M212 166 Q300 70 388 166 Q300 252 212 166 Z" fill="${d}"/>
    <path d="M250 196 Q300 236 350 196 L350 190 Q300 226 250 190 Z" fill="${c}" opacity=".55"/>
    <path d="M232 470 L368 470 L384 556 L216 556 Z" fill="${d}" opacity=".5"/>
    <line x1="278" y1="226" x2="274" y2="300" stroke="${d}" stroke-width="4"/><line x1="322" y1="226" x2="326" y2="300" stroke="${d}" stroke-width="4"/>`,
  jacket: (c, d) => `
    <path d="M190 150 L96 268 L126 540 L190 528 L194 640 L406 640 L410 528 L474 540 L504 268 L410 150 L340 130 L300 190 L260 130 Z" fill="${c}"/>
    <path d="M260 130 L300 190 L340 130 L360 150 L300 230 L240 150 Z" fill="${d}"/>
    <line x1="300" y1="190" x2="300" y2="640" stroke="${d}" stroke-width="4"/>
    <rect x="220" y="440" width="62" height="10" rx="4" fill="${d}"/><rect x="318" y="440" width="62" height="10" rx="4" fill="${d}"/>`,
  pants: (c, d) => `
    <path d="M208 120 L392 120 L424 650 L332 650 L300 310 L268 650 L176 650 Z" fill="${c}"/>
    <rect x="208" y="120" width="184" height="30" fill="${d}"/>
    <line x1="300" y1="150" x2="300" y2="310" stroke="${d}" stroke-width="3"/>
    <path d="M226 150 Q236 215 280 232" stroke="${d}" stroke-width="3" fill="none"/><path d="M374 150 Q364 215 320 232" stroke="${d}" stroke-width="3" fill="none"/>`,
  dress: (c, d) => `
    <path d="M238 122 L262 122 L274 230 L326 230 L338 122 L362 122 L384 250 L452 640 L148 640 L216 250 Z" fill="${c}"/>
    <path d="M216 250 L384 250 L376 292 Q300 316 224 292 Z" fill="${d}" opacity=".75"/>
    <path d="M190 560 Q300 600 410 560" stroke="${d}" stroke-width="3" fill="none" opacity=".6"/>`,
  cap: (c, d) => `
    <path d="M172 430 Q166 262 300 256 Q434 262 428 430 Z" fill="${c}"/>
    <path d="M148 430 Q300 396 486 440 Q474 484 300 470 Q170 464 148 430 Z" fill="${d}"/>
    <circle cx="300" cy="256" r="9" fill="${d}"/>
    <path d="M300 262 L300 424" stroke="${d}" stroke-width="2.5" opacity=".6"/>`,
  bag: (c, d) => `
    <path d="M214 310 Q214 150 300 150 Q386 150 386 310" stroke="${d}" stroke-width="14" fill="none" stroke-linecap="round"/>
    <path d="M170 300 L430 300 L456 610 L144 610 Z" fill="${c}"/>
    <rect x="170" y="300" width="260" height="34" fill="${d}" opacity=".6"/>
    <rect x="280" y="352" width="40" height="14" rx="4" fill="${d}"/>`,
  sneaker: (c, d) => `
    <path d="M100 480 L104 392 Q196 394 246 322 L300 356 Q356 404 474 412 Q528 424 530 494 L530 520 L100 520 Z" fill="${c}"/>
    <path d="M100 500 L530 500 L530 548 Q300 562 100 548 Z" fill="${tint(d, 0.65)}"/>
    <path d="M256 340 L288 366 M282 326 L314 352 M308 346 L336 372" stroke="${d}" stroke-width="5" stroke-linecap="round"/>
    <path d="M104 440 Q200 446 270 400" stroke="${d}" stroke-width="3.5" fill="none"/>`,
};

// Retorna os elementos da peça (coordenadas 600x750).
export function garment(type, color) {
  const dark = shade(color, 0.28);
  const body = (SHAPES[type] || SHAPES.tshirt)(color, dark);
  return `
    <ellipse cx="300" cy="676" rx="190" ry="14" fill="#000" opacity=".12"/>
    <g>${body}</g>
    <g style="mix-blend-mode:soft-light" opacity=".9"><rect x="80" y="60" width="440" height="620" fill="url(#shine)"/></g>`;
}

const DEFS = `
  <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/>
  </linearGradient>`;

const backdrop = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;

// variant: 'main' | 'detail' | 'alt'
export function productImage({ type, color, variant = 'main', label = 'NORTE' }) {
  const dark = luma(color) < 0.32;
  let bgA = '#F1EFEA', bgB = '#DEDBD3';
  if (variant === 'alt') [bgA, bgB] = dark ? ['#D9CDBB', '#B9AA92'] : ['#2A2A2A', '#111111'];
  if (variant === 'detail') [bgA, bgB] = dark ? ['#E9E6E0', '#CFCAC0'] : ['#E4DED2', '#C9BFAE'];
  const transform =
    variant === 'detail' ? 'translate(-150 -150) scale(1.5)' : variant === 'alt' ? 'translate(300 380) rotate(-5) scale(.92) translate(-300 -380)' : '';
  const textColor = variant === 'alt' && !dark ? '#B89B72' : '#00000040';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750" role="img" aria-label="${label}">
  <defs>${DEFS}${backdrop('bg', bgA, bgB)}</defs>
  <rect width="600" height="750" fill="url(#bg)"/>
  ${variant === 'alt' ? `<circle cx="300" cy="380" r="250" fill="${dark ? '#ffffff' : '#B89B72'}" opacity=".10"/>` : ''}
  <g transform="${transform}">${garment(type, color)}</g>
  <text x="300" y="724" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="13" letter-spacing="8" fill="${textColor}">${label}</text>
</svg>`;
}

export function categoryImage({ type, color, bg }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750">
  <defs>${DEFS}${backdrop('bg', bg[0], bg[1])}</defs>
  <rect width="600" height="750" fill="url(#bg)"/>
  <circle cx="300" cy="360" r="230" fill="#fff" opacity=".08"/>
  <g transform="translate(300 390) scale(1.12) translate(-300 -390)">${garment(type, color)}</g>
</svg>`;
}

// Composição editorial larga para o hero e banners.
export function bannerImage({ width = 1600, height = 900, bg, pieces, accent = '#B89B72', caption = '' }) {
  const items = pieces.map((p) => `
    <g transform="translate(${p.x} ${p.y}) rotate(${p.rotate || 0}) scale(${p.scale}) translate(-300 -375)">${garment(p.type, p.color)}</g>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">
  <defs>${DEFS}
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient>
    <radialGradient id="glow" cx=".72" cy=".45" r=".6"><stop offset="0" stop-color="${accent}" stop-opacity=".35"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#glow)"/>
  <circle cx="${width * 0.7}" cy="${height * 0.5}" r="${height * 0.42}" fill="none" stroke="${accent}" stroke-opacity=".35" stroke-width="2"/>
  ${items}
  ${caption ? `<text x="${width - 60}" y="${height - 40}" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="14" letter-spacing="10" fill="#ffffff" opacity=".35">${caption}</text>` : ''}
</svg>`;
}
