/**
 * Standard Code 128 (Subset B) SVG Barcode Generator
 * Generates valid, optical-scanner-compliant SVG barcodes without any external dependencies.
 */

// Code 128 width patterns: [b1, s1, b2, s2, b3, s3]
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 100-106 (106 is STOP)
];

const START_CODE_B = 104;
const STOP_CODE = 106;

/**
 * Encodes text into a Code 128B barcode SVG.
 * @param text The string to encode (ASCII characters)
 * @param height Height of the barcode in pixels (default: 40)
 * @param moduleWidth Width of a single module in pixels (default: 1.5)
 */
export function generateBarcodeSvg(
  text: string,
  height = 36,
  moduleWidth = 1.35,
): string {
  const safeText = String(text || '').replace(/[^\x20-\x7E]/g, '');
  if (!safeText) return '';

  const codes: number[] = [START_CODE_B];
  let checksum = START_CODE_B;

  for (let i = 0; i < safeText.length; i++) {
    const charCode = safeText.charCodeAt(i) - 32;
    codes.push(charCode);
    checksum += charCode * (i + 1);
  }

  codes.push(checksum % 103);
  codes.push(STOP_CODE);

  let totalModules = 0;
  const barSegments: { x: number; width: number }[] = [];

  let currentX = 10; // Quiet zone left

  for (let idx = 0; idx < codes.length; idx++) {
    const code = codes[idx];
    const pattern = CODE128_PATTERNS[code];
    if (!pattern) continue;

    for (let pIdx = 0; pIdx < pattern.length; pIdx++) {
      const width = parseInt(pattern[pIdx], 10) * moduleWidth;
      const isBar = pIdx % 2 === 0;

      if (isBar) {
        barSegments.push({ x: currentX, width });
      }
      currentX += width;
    }
  }

  currentX += 10; // Quiet zone right
  totalModules = currentX;

  const rects = barSegments
    .map(
      (b) =>
        `<rect x="${b.x.toFixed(2)}" y="0" width="${b.width.toFixed(2)}" height="${height}" fill="#000000" />`,
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules.toFixed(2)} ${height}" width="${totalModules.toFixed(0)}" height="${height}" style="display: block; margin: 0 auto;">${rects}</svg>`;
}
