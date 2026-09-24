import { removeBackground } from '@imgly/background-removal';
import { publicAsset } from './canvas';

export type SegmentationProgress = (message: string, percent: number) => void;

const OFFICIAL_RESOURCE_PATH = 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/';

export async function removeImageBackground(
  file: File,
  onProgress?: SegmentationProgress,
): Promise<Blob> {
  const progress = (key: string, current: number, total: number) => {
    if (!total) return;
    const percent = Math.min(99, Math.round((current / total) * 100));
    const label = key.includes('fetch') || key.includes('download')
      ? '下载本地识别模型'
      : '正在识别主体轮廓';
    onProgress?.(label, percent);
  };

  const resourcePaths = [
    publicAsset('model-resources/npmmirror/'),
    publicAsset('model-resources/npmmirror-cdn/'),
    publicAsset('model-resources/unpkg/'),
    OFFICIAL_RESOURCE_PATH,
  ];
  type SegmentationAttempt = {
    publicPath: string;
    device: 'cpu' | 'gpu';
    model: 'isnet_quint8' | 'isnet_fp16';
  };
  const attempts: SegmentationAttempt[] = [
    ...resourcePaths.map((publicPath): SegmentationAttempt => ({ publicPath, device: 'cpu', model: 'isnet_quint8' })),
    ...resourcePaths.map((publicPath): SegmentationAttempt => ({ publicPath, device: 'gpu', model: 'isnet_fp16' })),
  ];

  let lastError: unknown;
  for (const [index, attempt] of attempts.entries()) {
    onProgress?.(`准备识别资源 ${index + 1}/${attempts.length}`, Math.min(8, index + 2));
    try {
      return await removeBackground(file, {
        ...attempt,
        output: { format: 'image/png', quality: 0.95 },
        progress,
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('主体识别失败');
}
