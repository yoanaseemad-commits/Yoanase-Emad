import { useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { RENDER_ASSETS, RenderAsset, RenderCategory } from '../data/renderAssets';

const CATEGORY_TABS: { id: RenderCategory; labelAr: string }[] = [
  { id: 'all', labelAr: `كل الصور (${RENDER_ASSETS.length})` },
  { id: 'units', labelAr: 'الوحدات الأرضية والصواعد (2)' },
  { id: 'ducts', labelAr: 'الدكتات والعزل الصوتي والمخارج (3)' },
  { id: 'building', labelAr: 'المبنى والكنيسة (2)' },
];

export default function FinalRendersGallery() {
  const [category, setCategory] = useState<RenderCategory>('all');
  const [selectedId, setSelectedId] = useState<string>(RENDER_ASSETS[1].id);
  const [lightboxAsset, setLightboxAsset] = useState<RenderAsset | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const visibleAssets =
    category === 'all'
      ? RENDER_ASSETS
      : RENDER_ASSETS.filter((item) => item.category === category);

  const featured =
    visibleAssets.find((item) => item.id === selectedId) ?? visibleAssets[0] ?? RENDER_ASSETS[0];
  const currentIndex = visibleAssets.findIndex((item) => item.id === featured.id);

  const handleStep = (delta: number) => {
    if (visibleAssets.length === 0) return;
    const nextIdx = (currentIndex + delta + visibleAssets.length) % visibleAssets.length;
    setSelectedId(visibleAssets[nextIdx].id);
  };

  const handleCategoryChange = (nextCat: RenderCategory) => {
    setCategory(nextCat);
    const list =
      nextCat === 'all' ? RENDER_ASSETS : RENDER_ASSETS.filter((i) => i.category === nextCat);
    if (list.length > 0 && !list.some((i) => i.id === selectedId)) {
      setSelectedId(list[0].id);
    }
  };

  const handleImgError = (id: string) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <section id="renders" className="py-16 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-sky-400 mb-2">
              مكتبة الصور الواقعية والميكانيكية ({RENDER_ASSETS.length} صور عالية الدقة)
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-50">
              صور الكنيسة والوحدات الأرضية 380V وتفاصيل الدكتات والعزل الصوتي
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#121B26] rounded-lg border border-white/10">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleCategoryChange(tab.id)}
                className={`px-3.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  category === tab.id
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {tab.labelAr}
              </button>
            ))}
          </div>
        </div>

        {/* Main Featured Photo + Caption + Side Navigation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-8 flex flex-col bg-[#111923] border border-white/10 rounded-xl overflow-hidden">
            <div className="relative w-full aspect-[16/9] bg-[#0B1117] overflow-hidden">
              {!failedImages[featured.id] ? (
                <img
                  src={featured.src}
                  alt={featured.titleAr}
                  referrerPolicy="no-referrer"
                  onError={() => handleImgError(featured.id)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-center">
                  <span className="text-sm font-semibold text-slate-200">{featured.titleAr}</span>
                  <span className="text-xs text-slate-400 mt-1">{featured.subtitleAr}</span>
                </div>
              )}

              {/* Next / Prev Controls */}
              {visibleAssets.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => handleStep(-1)}
                    aria-label="الصورة السابقة"
                    className="no-print absolute top-1/2 right-3 -translate-y-1/2 p-2 rounded-lg bg-[#0B1117]/85 border border-white/15 text-slate-100 hover:bg-sky-500 hover:text-slate-950 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStep(1)}
                    aria-label="الصورة التالية"
                    className="no-print absolute top-1/2 left-3 -translate-y-1/2 p-2 rounded-lg bg-[#0B1117]/85 border border-white/15 text-slate-100 hover:bg-sky-500 hover:text-slate-950 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setLightboxAsset(featured)}
                className="no-print absolute bottom-4 left-4 px-3 py-1.5 rounded-lg bg-[#0B1117]/88 border border-white/15 text-xs text-slate-100 hover:bg-sky-500 hover:text-slate-950 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>تكبير الصورة</span>
              </button>

              <div className="no-print absolute bottom-4 right-4 px-2.5 py-1 rounded bg-[#0B1117]/85 border border-white/10 font-mono text-[11px] text-slate-300 tabular-nums">
                {currentIndex + 1} / {visibleAssets.length}
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-50">{featured.titleAr}</h3>
                <p className="text-xs text-sky-400 mt-1">{featured.subtitleAr}</p>
                <p className="text-sm text-slate-300 leading-relaxed mt-3">
                  {featured.descriptionAr}
                </p>
              </div>
            </div>
          </div>

          {/* Right Scrollable Engineering Photo Selector List */}
          <div className="lg:col-span-4 flex flex-col gap-3 max-h-[590px] overflow-y-auto pl-1">
            {visibleAssets.map((asset) => {
              const isCurrent = asset.id === featured.id;
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setSelectedId(asset.id)}
                  className={`text-right bg-[#111923] border rounded-xl overflow-hidden transition-colors flex items-center gap-3 p-2.5 cursor-pointer shrink-0 ${
                    isCurrent
                      ? 'border-sky-400 bg-[#142233]'
                      : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="relative w-28 h-20 rounded-lg bg-[#0B1117] overflow-hidden shrink-0">
                    {!failedImages[asset.id] ? (
                      <img
                        src={asset.src}
                        alt={asset.shortLabelAr}
                        referrerPolicy="no-referrer"
                        onError={() => handleImgError(asset.id)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-900 text-[10px] text-slate-400 px-2 text-center">
                        {asset.shortLabelAr}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-100 leading-snug">
                      {asset.shortLabelAr}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {asset.subtitleAr}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {lightboxAsset && (
        <div
          className="no-print fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4 md:p-8"
          onClick={() => setLightboxAsset(null)}
        >
          <div
            className="relative max-w-6xl w-full bg-[#0F1722] border border-white/15 rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
              <div>
                <h4 className="text-sm font-bold text-slate-100">{lightboxAsset.titleAr}</h4>
                <p className="text-xs text-slate-400">{lightboxAsset.subtitleAr}</p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxAsset(null)}
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={lightboxAsset.src}
              alt={lightboxAsset.titleAr}
              referrerPolicy="no-referrer"
              className="w-full max-h-[78vh] object-contain bg-black"
            />
          </div>
        </div>
      )}
    </section>
  );
}
