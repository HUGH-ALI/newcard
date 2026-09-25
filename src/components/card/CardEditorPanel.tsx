import { useRef, useState } from 'react';
import type { CardTextConfig } from '@/lib/card/types';

interface CardEditorPanelProps {
  text: CardTextConfig;
  busy: boolean;
  progress: number;
  status: string;
  onTextChange: (key: keyof CardTextConfig, value: string) => void;
  onFile: (file: File) => void;
}

function TextInput({
  label, value, placeholder, onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-cyan-100/70">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-cyan-300/20 bg-slate-950/70 px-3 py-2 text-sm text-cyan-50 outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/20"
      />
    </label>
  );
}

export default function CardEditorPanel({
  text, busy, progress, status, onTextChange, onFile,
}: CardEditorPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const handleFileList = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('请上传 JPG、PNG 或 WebP 图片');
      return;
    }
    setError('');
    onFile(file);
  };

  return (
    <aside className="rounded-3xl border border-fuchsia-300/20 bg-slate-950/62 p-4 shadow-[0_0_45px_rgba(255,59,184,.1)] backdrop-blur">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => handleFileList(event.target.files)}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFileList(event.dataTransfer.files);
        }}
        disabled={busy}
        className={`flex min-h-40 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-4 text-center transition ${
          dragging
            ? 'border-cyan-300 bg-cyan-300/10'
            : 'border-cyan-300/35 bg-slate-950/45 hover:border-cyan-300/70 hover:bg-cyan-300/5'
        } disabled:opacity-60`}
      >
        <span className="text-2xl text-cyan-200">↑</span>
        <span className="text-sm font-semibold text-cyan-50">上传人物或动物照片</span>
        <span className="text-xs leading-5 text-cyan-100/58">
          点击选择，或把图片拖到这里。照片只在本机浏览器处理，不会上传服务器。
        </span>
      </button>

      {busy && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-cyan-100/70">
            <span>{status}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-fuchsia-400 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}

      <div className="mt-5 space-y-3">
        <h2 className="text-sm font-bold tracking-[0.18em] text-cyan-200">正面文字</h2>
        <TextInput label="顶部英文标题" value={text.topTitle} onChange={(value) => onTextChange('topTitle', value)} />
        <TextInput label="中央主标题" value={text.mainTitle} onChange={(value) => onTextChange('mainTitle', value)} />
        <TextInput label="正面副标题" value={text.frontSubtitle} onChange={(value) => onTextChange('frontSubtitle', value)} />
        <TextInput label="等级胶囊" value={text.frontGrade} onChange={(value) => onTextChange('frontGrade', value)} />
      </div>

      <div className="mt-5 space-y-3">
        <h2 className="text-sm font-bold tracking-[0.18em] text-fuchsia-200">卡背文字</h2>
        <TextInput label="卡背标题" value={text.backTitle} onChange={(value) => onTextChange('backTitle', value)} />
        <TextInput label="卡背副标题" value={text.backSubtitle} onChange={(value) => onTextChange('backSubtitle', value)} />
        <TextInput label="编号 Serial" value={text.serial} onChange={(value) => onTextChange('serial', value)} />
      </div>
    </aside>
  );
}
