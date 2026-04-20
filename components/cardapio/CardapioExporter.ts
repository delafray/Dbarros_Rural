import html2canvas from 'html2canvas';

/**
 * Exports a DOM element to a PNG file download.
 * @param element  - The element to capture (the CardapioCanvas div)
 * @param filename - Name of the downloaded file (without extension)
 * @param scale    - Pixel density multiplier. 1 = screen, 4 ≈ high-res print
 * @param onProgress - Optional callback for status updates
 */
export async function exportCardapioPNG(
  element: HTMLElement,
  filename: string,
  scale = 1,
  onProgress?: (status: string) => void
): Promise<void> {
  try {
    onProgress?.('Aguardando fontes...');
    await document.fonts.ready;

    onProgress?.('Gerando imagem...');
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: null,
      width: element.offsetWidth,
      height: element.offsetHeight,
      imageTimeout: 10000,
    });

    onProgress?.('Preparando download...');
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onProgress?.('Concluído!');
  } catch (err) {
    console.error('Export failed:', err);
    throw new Error('Erro ao gerar imagem. Tente novamente.');
  }
}

/**
 * Scale presets for export
 */
export const EXPORT_SCALES = {
  PREVIEW: 1,     // Quick preview, same as screen
  MEDIUM: 2,      // Medium resolution (~150dpi for 2m banner)
  HIGH: 4,        // High resolution (~300dpi equivalent)
} as const;
