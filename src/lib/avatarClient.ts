import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

export const AVATAR_OPTIONS = [
  {
    key: 'hairStyle',
    label: 'تسريحة الشعر',
    choices: [
      { value: 'short', label: 'قصير' },
      { value: 'curly', label: 'مجعد' },
      { value: 'wavy', label: 'مموج' },
      { value: 'long', label: 'طويل' },
      { value: 'bun', label: 'مرفوع' },
      { value: 'bald', label: 'بدون شعر' },
    ],
  },
  {
    key: 'hairColor',
    label: 'لون الشعر',
    choices: [
      { value: 'black', label: 'أسود' },
      { value: 'brown', label: 'بني' },
      { value: 'blonde', label: 'أشقر' },
      { value: 'red', label: 'أحمر' },
      { value: 'silver', label: 'فضي' },
      { value: 'blue', label: 'أزرق' },
    ],
  },
  {
    key: 'beard',
    label: 'اللحية',
    choices: [
      { value: 'none', label: 'بدون' },
      { value: 'stubble', label: 'خفيفة' },
      { value: 'short', label: 'قصيرة' },
      { value: 'full', label: 'كثيفة' },
      { value: 'mustache', label: 'شارب' },
    ],
  },
  {
    key: 'eyes',
    label: 'لون العينين',
    choices: [
      { value: 'brown', label: 'بني' },
      { value: 'green', label: 'أخضر' },
      { value: 'blue', label: 'أزرق' },
      { value: 'hazel', label: 'عسلي' },
      { value: 'dark', label: 'داكن' },
    ],
  },
  {
    key: 'eyebrows',
    label: 'الحواجب',
    choices: [
      { value: 'natural', label: 'طبيعية' },
      { value: 'bold', label: 'بارزة' },
      { value: 'arched', label: 'مقوسة' },
      { value: 'thin', label: 'رفيعة' },
    ],
  },
  {
    key: 'mouth',
    label: 'التعبير',
    choices: [
      { value: 'smile', label: 'ابتسامة' },
      { value: 'calm', label: 'هادئ' },
      { value: 'laugh', label: 'مرح' },
      { value: 'confident', label: 'واثق' },
    ],
  },
  {
    key: 'nose',
    label: 'الأنف',
    choices: [
      { value: 'natural', label: 'طبيعي' },
      { value: 'small', label: 'صغير' },
      { value: 'broad', label: 'عريض' },
      { value: 'defined', label: 'بارز' },
    ],
  },
  {
    key: 'teeth',
    label: 'الأسنان',
    choices: [
      { value: 'natural', label: 'طبيعية' },
      { value: 'bright', label: 'مشرقة' },
      { value: 'hidden', label: 'ابتسامة مغلقة' },
    ],
  },
  {
    key: 'skinTone',
    label: 'لون البشرة',
    choices: [
      { value: 'dark', label: 'داكنة' },
      { value: 'brown', label: 'بنية' },
      { value: 'tan', label: 'سمراء' },
      { value: 'golden', label: 'ذهبية' },
      { value: 'light', label: 'فاتحة' },
      { value: 'fair', label: 'بيضاء' },
    ],
  },
  {
    key: 'clothing',
    label: 'الملابس',
    choices: [
      { value: 'casual', label: 'عصرية' },
      { value: 'formal', label: 'رسمية' },
      { value: 'traditional', label: 'تقليدية' },
      { value: 'sporty', label: 'رياضية' },
      { value: 'creative', label: 'فنية' },
      { value: 'futuristic', label: 'مستقبلية' },
    ],
  },
  {
    key: 'accessories',
    label: 'الإكسسوارات',
    choices: [
      { value: 'none', label: 'بدون' },
      { value: 'glasses', label: 'نظارات' },
      { value: 'earrings', label: 'أقراط' },
      { value: 'headphones', label: 'سماعات' },
      { value: 'hat', label: 'قبعة' },
      { value: 'scarf', label: 'وشاح' },
    ],
  },
  {
    key: 'background',
    label: 'الخلفية',
    choices: [
      { value: 'emerald', label: 'زمردية' },
      { value: 'night', label: 'ليلية' },
      { value: 'warm', label: 'دافئة' },
      { value: 'sky', label: 'زرقاء' },
      { value: 'neutral', label: 'هادئة' },
      { value: 'abstract', label: 'تجريدية' },
    ],
  },
] as const;

export type AvatarOptions = {
  [Group in (typeof AVATAR_OPTIONS)[number] as Group['key']]:
    Group['choices'][number]['value'];
};

export const DEFAULT_AVATAR_OPTIONS: AvatarOptions = {
  hairStyle: 'short',
  hairColor: 'black',
  beard: 'none',
  eyes: 'brown',
  eyebrows: 'natural',
  mouth: 'smile',
  nose: 'natural',
  teeth: 'natural',
  skinTone: 'tan',
  clothing: 'casual',
  accessories: 'none',
  background: 'emerald',
};

export const AVATAR_EMOJIS = ['😊', '😎', '🦊', '🐼', '🦁', '🌟', '🎨', '🚀', '🌿', '🐯'] as const;

const FREE_GENERATIONS = 2;
const SECOND_GENERATION_DELAY_MS = 7 * 24 * 60 * 60 * 1000;

export function canGenerateAvatar(generationsUsed: number, lastGeneratedAt: string | null) {
  if (generationsUsed >= FREE_GENERATIONS) {
    return { allowed: false as const, reason: 'payment_required' as const };
  }
  if (generationsUsed === 1) {
    const firstGeneratedAt = lastGeneratedAt ? Date.parse(lastGeneratedAt) : Number.NaN;
    if (!Number.isFinite(firstGeneratedAt)) {
      return { allowed: false as const, reason: 'cooldown' as const, availableAt: null };
    }
    const availableAt = firstGeneratedAt + SECOND_GENERATION_DELAY_MS;
    if (availableAt > Date.now()) {
      return { allowed: false as const, reason: 'cooldown' as const, availableAt };
    }
  }
  return { allowed: true as const };
}

const MODEL_URL = '/models/blaze_face_short_range.tflite';
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm';
let detectorPromise: Promise<FaceDetector> | undefined;

function getFaceDetector() {
  detectorPromise ??= FilesetResolver.forVisionTasks(WASM_URL).then((fileset) =>
    FaceDetector.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.6,
    })
  );
  return detectorPromise;
}

function imageFromFile(file: File): Promise<{ image: HTMLImageElement; objectUrl: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, objectUrl });
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('تعذر فتح الصورة. اختر صورة أخرى.'));
    };
    image.src = objectUrl;
  });
}

function isImageSharp(image: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return false;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const luminance = new Float32Array(canvas.width * canvas.height);
  for (let index = 0; index < luminance.length; index++) {
    const pixel = index * 4;
    luminance[index] = pixels[pixel] * 0.299 + pixels[pixel + 1] * 0.587 + pixels[pixel + 2] * 0.114;
  }
  let total = 0;
  let count = 0;
  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = 1; x < canvas.width - 1; x++) {
      const index = y * canvas.width + x;
      total += Math.abs(
        4 * luminance[index]
        - luminance[index - 1]
        - luminance[index + 1]
        - luminance[index - canvas.width]
        - luminance[index + canvas.width]
      );
      count++;
    }
  }
  return count > 0 && total / count >= 9;
}

export async function validateAvatarReference(file: File): Promise<{ valid: true } | { valid: false; message: string }> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return { valid: false, message: 'اختر صورة بصيغة JPG أو PNG أو WebP.' };
  }
  if (file.size > 3 * 1024 * 1024) {
    return { valid: false, message: 'يجب ألا يتجاوز حجم الصورة 3 ميغابايت.' };
  }

  let objectUrl = '';
  try {
    const loaded = await imageFromFile(file);
    objectUrl = loaded.objectUrl;
    const { image } = loaded;
    if (image.naturalWidth < 480 || image.naturalHeight < 480) {
      return { valid: false, message: 'الصورة صغيرة جداً. اختر صورة أوضح وبحجم أكبر.' };
    }
    if (!isImageSharp(image)) {
      return { valid: false, message: 'الصورة غير واضحة بما يكفي. اختر صورة أكثر وضوحاً وإضاءة.' };
    }

    const detector = await getFaceDetector();
    const result = detector.detect(image);
    if (result.detections.length !== 1) {
      return { valid: false, message: 'يجب أن يظهر وجه واحد فقط في الصورة.' };
    }
    const box = result.detections[0].boundingBox;
    if (!box || box.width / image.naturalWidth < 0.16 || box.height / image.naturalHeight < 0.16) {
      return { valid: false, message: 'قرّب وجهك من الكاميرا واختر صورة يظهر فيها وجهك بوضوح.' };
    }
    const marginX = box.originX / image.naturalWidth;
    const marginY = box.originY / image.naturalHeight;
    const rightMargin = (image.naturalWidth - box.originX - box.width) / image.naturalWidth;
    const bottomMargin = (image.naturalHeight - box.originY - box.height) / image.naturalHeight;
    if (marginX < 0.015 || marginY < 0.015 || rightMargin < 0.015 || bottomMargin < 0.015) {
      return { valid: false, message: 'يبدو أن الوجه مقصوص من الصورة. اختر صورة يظهر فيها الوجه كاملاً.' };
    }
    return { valid: true };
  } catch (error) {
    console.error('Local face validation failed:', error);
    return {
      valid: false,
      message: 'تعذر التحقق من الصورة الآن. تحقق من اتصالك ثم حاول مجدداً.',
    };
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
