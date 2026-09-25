import { useEffect, useRef, useState } from 'react';
import CardStudio from '@/components/card/CardStudio';
import CardEditorPanel from '@/components/card/CardEditorPanel';
import { createDemoLayers, createUploadedLayers } from '@/lib/card/artwork';
import { DEFAULT_TEXT } from '@/lib/card/defaults';
import { removeImageBackground } from '@/lib/card/segmentation';
import { renderBackLayer, renderTextLayer } from '@/lib/card/textLayers';
import type { CardLayers, CardTextConfig } from '@/lib/card/types';

export default function HomePage() {
  const [layers, setLayers] = useState<CardLayers | null>(null);
  const [text, setText] = useState<CardTextConfig>(DEFAULT_TEXT);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('准备中');
  const [notice, setNotice] = useState('');
  const textRef = useRef(text);
  const busyRef = useRef(false);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    let active = true;
    createDemoLayers(DEFAULT_TEXT)
      .then((demoLayers) => {
        if (active) setLayers(demoLayers);
      })
      .catch(() => {
        if (active) setNotice('默认素材加载失败，请检查网络后刷新页面。');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([renderTextLayer(text), renderBackLayer(text)])
      .then(([textLayer, backLayer]) => {
        if (!cancelled) {
          setLayers((current) => (current ? { ...current, text: textLayer, back: backLayer } : current));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [text]);

  const handleFile = async (file: File) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setNotice('');
    setBusy(true);
    setProgress(3);
    setStatus('启动本地主体识别');
    try {
      const cutout = await removeImageBackground(file, (message, percent) => {
        setStatus(message);
        setProgress(percent);
      });
      setStatus('正在合成分层闪卡');
      setProgress(96);
      const nextLayers = await createUploadedLayers(cutout, textRef.current);
      setLayers(nextLayers);
      setProgress(100);
      setStatus('闪卡已生成');
    } catch {
      setNotice('生成失败：请换一张主体轮廓更清楚、背景对比更明显的照片。');
      setProgress(0);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const updateText = (key: keyof CardTextConfig, value: string) => {
    setText((current) => ({ ...current, [key]: value }));
  };

  return (
    <main className="min-h-screen bg-[#05070D] px-4 py-6 text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 text-center">
          <p className="mb-2 text-xs font-semibold tracking-[0.35em] text-cyan-300/80">HOLOGRAPHIC RARE CARD GENERATOR</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            <span className="text-cyan-300 drop-shadow-[0_0_18px_rgba(66,243,255,.55)]">破界</span>
            <span className="mx-3 text-slate-50/70">·</span>
            <span className="text-fuchsia-400 drop-shadow-[0_0_18px_rgba(255,59,184,.5)]">Neon Protocol</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-cyan-100/62">
            上传有人物或动物轮廓的照片，浏览器会立即完成本地抠图、线稿提取、分层视差和全息镭射闪卡合成。
          </p>
          {notice && <p className="mt-3 text-sm text-rose-300">{notice}</p>}
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <CardStudio layers={layers} />
          <CardEditorPanel
            text={text}
            busy={busy}
            progress={progress}
            status={status}
            onTextChange={updateText}
            onFile={handleFile}
          />
        </div>

        <footer className="mt-6 text-center text-xs leading-5 text-cyan-100/42">
          首次使用会下载一次本地识别模型；照片处理在浏览器内完成。支持 Chrome、Edge、Firefox 新版浏览器。
        </footer>
      </div>
    </main>
  );
}
