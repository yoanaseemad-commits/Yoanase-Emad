import { useEffect, useRef, useState } from 'react';
import {
  Box,
  ChevronDown,
  ChevronUp,
  Eye,
  Film,
  Grid3X3,
  Layers,
  Pause,
  Wind,
} from 'lucide-react';
import {
  CameraPresetId,
  HallSceneController,
  InspectableComponentInfo,
} from '../scene/HallScene';
import { HvacDesignResult } from '../engine/hvacCalculator';

interface HallViewport3DProps {
  design: HvacDesignResult;
}

const CAMERA_TABS: { id: CameraPresetId; labelAr: string }[] = [
  { id: 'xray', labelAr: 'قطاع الأشعة X' },
  { id: 'exterior', labelAr: 'خارجي 3D' },
  { id: 'units', labelAr: 'الوحدات الأرضية والصواعد' },
  { id: 'interior', labelAr: 'داخل الكنيسة' },
  { id: 'topdown', labelAr: 'مسقط أفقي' },
];

export default function HallViewport3D({ design }: HallViewport3DProps) {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<HallSceneController | null>(null);

  const [activePreset, setActivePreset] = useState<CameraPresetId>('xray');
  const [roofLift, setRoofLift] = useState<number>(8.5);
  const [cadMode, setCadMode] = useState<boolean>(false);
  const [videoTour, setVideoTour] = useState<boolean>(false);
  const [showDucts, setShowDucts] = useState<boolean>(true);
  const [showAirflow, setShowAirflow] = useState<boolean>(true);
  const [showInterior, setShowInterior] = useState<boolean>(true);
  const [dockExpanded, setDockExpanded] = useState<boolean>(true);
  const [selectedPart, setSelectedPart] = useState<InspectableComponentInfo | null>(null);
  const [webglFallback, setWebglFallback] = useState<boolean>(false);

  const mainTrunk = design.ducts.find((d) => d.id === 'twin-trunk');
  const returnTrunk = design.ducts.find((d) => d.id === 'return-trunk');
  const mainDuctLabel = mainTrunk ? `${mainTrunk.widthCm}×${mainTrunk.heightCm} سم` : '115×40 سم';
  const returnDuctLabel = returnTrunk
    ? `${returnTrunk.widthCm}×${returnTrunk.heightCm} سم`
    : '110×40 سم';

  // Mount Three.js scene ONCE in isolated ref container
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const controller = new HallSceneController(
      mountEl,
      {
        nominalUnitTons: design.nominalUnitTons,
        cfmPerUnit: design.cfmPerUnit,
        mainDuctSizeLabel: mainDuctLabel,
        returnDuctSizeLabel: returnDuctLabel,
        unitBreakerA: design.electrical.unitBreakerA,
      },
      {
        onSelectPart: (info) => setSelectedPart(info),
        onWebglError: () => setWebglFallback(true),
        onVideoTourChange: (active) => setVideoTour(active),
      },
    );

    controllerRef.current = controller;

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    controllerRef.current?.updateEngineeringSpecs({
      nominalUnitTons: design.nominalUnitTons,
      cfmPerUnit: design.cfmPerUnit,
      mainDuctSizeLabel: mainDuctLabel,
      returnDuctSizeLabel: returnDuctLabel,
      unitBreakerA: design.electrical.unitBreakerA,
    });
  }, [
    design.nominalUnitTons,
    design.cfmPerUnit,
    design.electrical.unitBreakerA,
    mainDuctLabel,
    returnDuctLabel,
  ]);

  useEffect(() => {
    controllerRef.current?.setLayerVisibility({
      ducts: showDucts,
      airflow: showAirflow,
      interior: showInterior,
      upperFloor: true,
    });
  }, [showDucts, showAirflow, showInterior]);

  const handlePresetClick = (id: CameraPresetId) => {
    setActivePreset(id);
    setVideoTour(false);
    controllerRef.current?.applyCameraPreset(id);
    if (id === 'xray') setRoofLift(8.5);
    else if (id === 'topdown') setRoofLift(13.5);
    else setRoofLift(0);
  };

  const handleLiftChange = (val: number) => {
    setRoofLift(val);
    setVideoTour(false);
    controllerRef.current?.setVideoTour(false);
    controllerRef.current?.setRoofLift(val);
  };

  const handleToggleCad = () => {
    const next = !cadMode;
    setCadMode(next);
    controllerRef.current?.setCadMode(next);
    if (next && roofLift < 5) setRoofLift(8.5);
  };

  const handleToggleVideo = () => {
    const next = !videoTour;
    setVideoTour(next);
    controllerRef.current?.setVideoTour(next);
  };

  return (
    <div className="relative w-full h-[78vh] min-h-[560px] max-h-[840px] bg-[#0B1117] overflow-hidden border-b border-white/10">
      {/* Dedicated Empty WebGL Canvas Mount */}
      {!webglFallback ? (
        <div
          ref={canvasMountRef}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
          aria-label="نموذج ثلاثي الأبعاد تفاعلي لمبنى الكنيسة ووحدات التكييف الأرضية والصواعد"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0D1520] p-8 text-center">
          <img
            src="/src/assets/images/hall_exterior_ground_hvac_1795716061956.jpg"
            alt="منظور معماري لمبنى الكنيسة ووحدات التكييف المركزي الأرضية"
            referrerPolicy="no-referrer"
            className="max-h-[65%] rounded-lg object-cover border border-white/10 mb-4"
          />
          <p className="text-sm text-slate-300">
            تم عرض المنظور المعماري البديل لأن متصفحك لا يدعم تسريع WebGL حالياً.
          </p>
        </div>
      )}

      {/* Minimal Top Architectural Spec Overlay */}
      <div className="pointer-events-none absolute top-4 right-6 left-6 flex flex-wrap items-start justify-between gap-4 z-10">
        <div className="bg-[#0B1117]/86 px-4 py-3 rounded-lg border border-white/10 max-w-xl">
          <h1 className="text-lg md:text-2xl font-bold text-slate-50 leading-snug">
            مشروع الفادي للتبريد والتكييف · كنيسة 1,000 م² بأسوان
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-300 tabular-nums">
            <span>الدور الأرضي (تحته بدروم ويعلوه أول وثاني علوي)</span>
            <span aria-hidden="true">·</span>
            <span>25م × 40م × 4م</span>
            <span aria-hidden="true">·</span>
            <span>1,000 مصلّي (نهاري وليلي)</span>
            <span aria-hidden="true">·</span>
            <span>4 وحدات أرضية T3</span>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-4 bg-[#0B1117]/86 px-3.5 py-2 rounded-lg border border-white/10 text-xs text-slate-300">
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-sky-400" />
            صاعد وتغذية هواء بارد
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-400" />
            صاعد وراجع صوتي
          </span>
          <span className="text-slate-400 whitespace-nowrap">
            اضغط على أي وحدة أو دكت لعرض بياناته
          </span>
        </div>
      </div>

      {/* Unified Collapsible Bottom Control Dock (Zero backdrop-filter over WebGL) */}
      <div
        className="no-print absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center"
        style={{ width: 'min(980px, 95vw)' }}
      >
        {selectedPart && (
          <div className="mb-2 w-full bg-[#0F1722]/96 border border-sky-500/40 rounded-lg px-4 py-2.5 flex items-center justify-between gap-4 text-xs md:text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-sky-300">{selectedPart.titleAr}</span>
              <span className="text-slate-500" aria-hidden="true">
                —
              </span>
              <span className="text-slate-200 tabular-nums">{selectedPart.specAr}</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPart(null)}
              className="text-xs text-slate-400 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setDockExpanded((prev) => !prev)}
          className="mb-1.5 px-3.5 py-1 rounded-t-lg bg-[#0F1722]/95 border border-white/12 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
        >
          {dockExpanded ? (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>إخفاء لوحة التحكم 3D</span>
            </>
          ) : (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>إظهار أدوات التحكم 3D</span>
            </>
          )}
        </button>

        {dockExpanded && (
          <div className="w-full bg-[#0F1722]/96 border border-white/12 rounded-xl px-4 py-3 shadow-2xl flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-[#16202E] p-1 rounded-lg overflow-x-auto max-w-full">
                {CAMERA_TABS.map((tab) => {
                  const isActive = activePreset === tab.id && !videoTour;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handlePresetClick(tab.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-sky-500 text-slate-950 font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {tab.labelAr}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleCad}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    cadMode
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                      : 'bg-[#16202E] border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                  <span>وضع الأوتوكاد CAD</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleVideo}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    videoTour
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-semibold'
                      : 'bg-[#16202E] border-white/10 text-slate-200 hover:text-white'
                  }`}
                >
                  {videoTour ? <Pause className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
                  <span>{videoTour ? 'إيقاف الجولة' : 'جولة فيديو 3D'}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/8">
              <div className="flex items-center gap-3 flex-1 min-w-[230px]">
                <label
                  htmlFor="roof-lift-slider"
                  className="text-xs text-slate-300 whitespace-nowrap flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  <span>رفع الأدوار العلوية وكشف الدكتات</span>
                </label>
                <input
                  id="roof-lift-slider"
                  type="range"
                  min={0}
                  max={17}
                  step={0.2}
                  value={roofLift}
                  onChange={(e) => handleLiftChange(parseFloat(e.target.value))}
                  className="studio-slider flex-1"
                />
                <span className="font-mono text-xs text-sky-300 tabular-nums w-12 text-left">
                  {Math.round((roofLift / 17) * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowDucts((v) => !v)}
                  className={`px-2.5 py-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                    showDucts
                      ? 'bg-sky-500/15 text-sky-200 border border-sky-500/35'
                      : 'bg-white/5 text-slate-400 border border-white/8'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>الدكتات</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAirflow((v) => !v)}
                  className={`px-2.5 py-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                    showAirflow
                      ? 'bg-sky-500/15 text-sky-200 border border-sky-500/35'
                      : 'bg-white/5 text-slate-400 border border-white/8'
                  }`}
                >
                  <Wind className="w-3.5 h-3.5" />
                  <span>مسار الهواء البارد</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowInterior((v) => !v)}
                  className={`px-2.5 py-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                    showInterior
                      ? 'bg-sky-500/15 text-sky-200 border border-sky-500/35'
                      : 'bg-white/5 text-slate-400 border border-white/8'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>صحن الكنيسة والهيكل</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
