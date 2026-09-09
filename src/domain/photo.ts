/**
 * Подготовка фото клиента.
 *
 * Фото показывается только в маленьком круге (44 px в списке, 56 px в карточке),
 * а место в Telegram CloudStorage ограничено 4096 символами на запись.
 * Поэтому картинка обрезается по центру в квадрат, уменьшается и сжимается
 * до тех пор, пока не влезет в лимит с запасом.
 */

/** запас на служебные символы */
const MAX_CHARS = 3800;

/** пробуем от лучшего качества к худшему */
const ATTEMPTS: { size: number; quality: number }[] = [
  { size: 128, quality: 0.72 },
  { size: 112, quality: 0.65 },
  { size: 96, quality: 0.6 },
  { size: 88, quality: 0.5 },
  { size: 72, quality: 0.45 },
  { size: 64, quality: 0.4 },
];

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не получилось открыть картинку.'));
    };
    image.src = url;
  });
}

function drawSquare(image: HTMLImageElement, size: number, quality: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Браузер не смог обработать картинку.');

  // обрезаем по центру: берём квадрат по меньшей стороне
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  const sx = (image.naturalWidth - side) / 2;
  const sy = (image.naturalHeight - side) / 2;

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, sx, sy, side, side, 0, 0, size, size);

  return canvas.toDataURL('image/jpeg', quality);
}

/** Файл из галереи → маленькое квадратное фото в виде строки data:… */
export async function fileToAvatar(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Это не картинка. Подойдёт фото или логотип.');
  }

  const image = await loadImage(file);

  let last = '';
  for (const attempt of ATTEMPTS) {
    last = drawSquare(image, attempt.size, attempt.quality);
    if (last.length <= MAX_CHARS) return last;
  }

  if (last.length > MAX_CHARS) {
    throw new Error('Картинка слишком сложная. Попробуй другую.');
  }
  return last;
}
