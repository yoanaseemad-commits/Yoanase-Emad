import { useState } from 'react';
import {
  Box,
  ChevronLeft,
  ChevronRight,
  Compass,
  Image as ImageIcon,
  Maximize2,
  X,
} from 'lucide-react';
import { HvacDesignResult } from '../engine/hvacCalculator';
import { RENDER_ASSETS } from '../data/renderAssets';
import HallViewport3D from './HallViewport3D';
import EngineeringDrawingsStage from './EngineeringDrawingsStage';

export type StageViewMode = '3d' | 'blueprint' | 'photos';

interface HeroVisualStageProps {
  design: HvacDesignResult;
  mode: StageViewMode;
  onModeChange: (mode: StageViewMode) => void;
}

export default function HeroVisualStage({ design, mode, onModeChange }: HeroVisualStageProps) {
  const [activePhotoId, setActivePhotoId] = useState<string>(RENDER_ASSETS[1].id);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const currentIndex = Math.max(
    0,
    RENDER_ASSETS.findIndex((p) => p.id === activePhotoId),
  );
  const currentPhoto = RENDER_ASSETS[currentIndex] ?? RENDER_ASSETS[0];

  const stepPhoto = (delta: number) => {
    const nextIdx = (currentIndex + delta + RENDER_ASSETS.length) % RENDER_ASSETS.length;
    setActivePhotoId(RENDER_ASSETS[nextIdx].id);
  };

  return (
    <section id="visual-stage" className="w-full bg-[#0B1117]">
      {/* Prominent 3-Mode Workspace Selector Bar: 3D | 2D Engineering Blueprint | Real Photos */}
      <div className="no-print bg-[#0E1621] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-200">طريقة عرض المشروع:</span>
            <span className="hidden sm:inline">
              اختر بين المجسم التفاعلي أو اللوحات الهندسية أو الصور الواقعية ({RENDER_ASSETS.length} صور)
            </span>
          </div>

          <div
            role="tablist"
            aria-label="اختيار نمط العرض"
            className="flex items-center gap-1 p-1 bg-[#162130] rounded-lg border border-white/10"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === '3d'}
              onClick={() => onModeChange('3d')}
              className={`px-4 py-2 rounded-md text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === '3d'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Box className="w-4 h-4" />
              <span>مجسم ثلاثي الأبعاد (3D)</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={mode === 'blueprint'}
              onClick={() => onModeChange('blueprint')}
              className={`px-4 py-2 rounded-md text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'blueprint'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>رسمة هندسية (AutoCAD 2D)</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={mode === 'photos'}
              onClick={() => onModeChange('photos')}
              className={`px-4 py-2 rounded-md text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'photos'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>صور الوحدات والدكتات ({RENDER_ASSETS.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Visual Mode Content */}
      {mode === '3d' && <HallViewport3D design={design} />}

      {mode === 'blueprint' && <EngineeringDrawingsStage design={design} />}

      {mode === 'photos' && (
        <div className="relative w-full h-[80vh] min-h-[580px] max-h-[860px] bg-[#080E16] border-b border-white/10 flex flex-col">
          <div className="relative flex-1 overflow-hidden flex items-center justify-center bg-black">
            <img
              src={currentPhoto.src}
              alt={currentPhoto.titleAr}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080E16] via-[#080E16]/25 to-transparent" />

            <button
              type="button"
              onClick={() => stepPhoto(-1)}
              aria-label="الصورة السابقة"
              className="no-print absolute top-1/2 right-5 -translate-y-1/2 p-2.5 rounded-lg bg-[#0B1117]/85 border border-white/15 text-slate-100 hover:bg-sky-500 hover:text-slate-950 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => stepPhoto(1)}
              aria-label="الصورة التالية"
              className="no-print absolute top-1/2 left-5 -translate-y-1/2 p-2.5 rounded-lg bg-[#0B1117]/85 border border-white/15 text-slate-100 hover:bg-sky-500 hover:text-slate-950 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setLightboxSrc(currentPhoto.src)}
              className="no-print absolute top-5 left-6 px-3.5 py-2 rounded-lg bg-[#0B1117]/90 border border-white/15 text-xs text-slate-100 hover:bg-sky-500 hover:text-slate-950 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>عرض بملء الشاشة</span>
            </button>

            <div className="absolute bottom-6 right-6 left-6 max-w-4xl">
              <div className="font-mono text-[11px] text-sky-300 mb-1 tabular-nums">
                {currentIndex + 1} / {RENDER_ASSETS.length} · {currentPhoto.subtitleAr}
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white drop-shadow">
                {currentPhoto.titleAr}
              </h2>
              <p className="text-sm text-slate-200 mt-1.5 leading-relaxed">
                {currentPhoto.descriptionAr}
              </p>
            </div>
          </div>

          {/* Bottom Scrollable 7-Photo Thumbnail Strip */}
          <div className="bg-[#0E1621] border-t border-white/10 px-6 py-3 overflow-x-auto">
            <div className="flex items-center gap-2.5 min-w-max mx-auto justify-center">
              {RENDER_ASSETS.map((photo) => {
                const active = photo.id === currentPhoto.id;
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setActivePhotoId(photo.id)}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                      active
                        ? 'bg-sky-500/15 border-sky-400 text-sky-100'
                        : 'bg-[#131E2D] border-white/10 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    <img
                      src={photo.src}
                      alt={photo.shortLabelAr}
                      referrerPolicy="no-referrer"
                      className="w-12 h-8 rounded object-cover shrink-0"
                    />
                    <span className="text-xs font-medium whitespace-nowrap">
                      {photo.shortLabelAr}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox for Photo Mode */}
      {lightboxSrc && (
        <div
          className="no-print fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4 md:p-8"
          onClick={() => setLightboxSrc(null)}
        >
          <div
            className="relative max-w-6xl w-full bg-[#0F1722] border border-white/15 rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <span className="text-sm font-bold text-slate-100">{currentPhoto.titleAr}</span>
              <button
                type="button"
                onClick={() => setLightboxSrc(null)}
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={lightboxSrc}
              alt={currentPhoto.titleAr}
              referrerPolicy="no-referrer"
              className="w-full max-h-[82vh] object-contain bg-black"
            />
          </div>
        </div>
      )}
    </section>
  );
}
