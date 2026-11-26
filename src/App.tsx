import { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import {
  calculateHvacDesign,
  DEFAULT_HALL_PARAMS,
  HallParameters,
} from './engine/hvacCalculator';
import HeroVisualStage, { StageViewMode } from './components/HeroVisualStage';
import AirflowPatternsSection from './components/AirflowPatternsSection';
import FinalRendersGallery from './components/FinalRendersGallery';
import ThermalLoadSection from './components/ThermalLoadSection';
import DuctSizingSection from './components/DuctSizingSection';
import ElectricalAndSystemsSection from './components/ElectricalAndSystemsSection';

export default function App() {
  const [params, setParams] = useState<HallParameters>(DEFAULT_HALL_PARAMS);
  const [stageMode, setStageMode] = useState<StageViewMode>('3d');

  const design = useMemo(() => calculateHvacDesign(params), [params]);

  const handlePrintReport = () => {
    window.print();
  };

  const jumpToStageMode = (mode: StageViewMode) => {
    setStageMode(mode);
    document.getElementById('visual-stage')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0B1117] text-[#EEF2F6]">
      {/* Strict 3-Zone Top Bar Contract (Single-line Brand · 5 Concise Nav Links · 1 Primary CTA) */}
      <header className="no-print sticky top-0 z-40 bg-[#0B1117]/95 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#visual-stage"
            className="font-display text-lg font-bold tracking-tight text-slate-50 whitespace-nowrap shrink-0"
          >
            مشروع الفادي للتبريد والتكييف
          </a>

          <nav
            aria-label="التنقل الرئيسي"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300"
          >
            <button
              type="button"
              onClick={() => jumpToStageMode('3d')}
              className="hover:text-sky-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              المجسم 3D
            </button>
            <button
              type="button"
              onClick={() => jumpToStageMode('blueprint')}
              className="hover:text-sky-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              الرسم الهندسي
            </button>
            <a
              href="#airflow"
              className="hover:text-sky-400 transition-colors whitespace-nowrap shrink-0"
            >
              تدفق الهواء
            </a>
            <a
              href="#thermal-load"
              className="hover:text-sky-400 transition-colors whitespace-nowrap shrink-0"
            >
              الأحمال الحرارية
            </a>
            <a
              href="#electrical"
              className="hover:text-sky-400 transition-colors whitespace-nowrap shrink-0"
            >
              كهرباء 380V
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={handlePrintReport}
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة التقرير الهندسي</span>
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* 1. Unified 3-Mode Visual Stage: 3D Interactive / 2D AutoCAD Blueprint / Real Photos */}
        <HeroVisualStage design={design} mode={stageMode} onModeChange={setStageMode} />

        {/* Full-Width 4-Column Engineering KPI Summary Strip */}
        <section
          aria-label="ملخص القدرة التصميمية"
          className="bg-[#0F1722] border-b border-white/10"
        >
          <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-white/10">
            <div className="py-3 sm:py-0 sm:px-5 first:pr-0">
              <div className="text-xs text-slate-400">
                القدرة الموصى بها (4 وحدات أرضية T3 أسوان)
              </div>
              <div className="mt-1.5 font-mono text-2xl font-bold text-sky-400 tabular-nums">
                {design.installedTotalTons} TR · {design.totalCoolingHp} حصان
              </div>
              <div className="mt-1 text-xs text-slate-300 tabular-nums">
                {design.unitCount} وحدات أرضية × {design.nominalUnitTons} طن ({design.coolingHpPerUnit} حصان تبريدي/وحدة)
              </div>
            </div>

            <div className="py-3 sm:py-0 sm:px-5">
              <div className="text-xs text-slate-400">إجمالي تدفق الهواء ومخارج صحن الكنيسة</div>
              <div className="mt-1.5 font-mono text-2xl font-bold text-slate-50 tabular-nums">
                {design.totalSupplyCfm.toLocaleString('en-US')} CFM
              </div>
              <div className="mt-1 text-xs text-slate-300 tabular-nums">
                {design.totalDiffusers} دفيوزر 60×60 سم · هواء نقي{' '}
                {design.freshAirCfmTotal.toLocaleString('en-US')} CFM
              </div>
            </div>

            <div className="py-3 sm:py-0 sm:px-5">
              <div className="text-xs text-slate-400">الحمل الكهربائي (380V 3-Phase)</div>
              <div className="mt-1.5 font-mono text-2xl font-bold text-amber-400 tabular-nums">
                {design.electrical.totalRunningAmps.toFixed(0)} A
              </div>
              <div className="mt-1 text-xs text-slate-300 tabular-nums">
                {design.electrical.totalRunningKw.toFixed(0)} kW ({design.electrical.totalKva.toFixed(0)}{' '}
                kVA) · قاطع رئيسي {design.electrical.mainBreakerA}A
              </div>
            </div>

            <div className="py-3 sm:py-0 sm:px-5">
              <div className="text-xs text-slate-400">الارتفاع الصافي بعد تمرير الدكت</div>
              <div className="mt-1.5 font-mono text-2xl font-bold text-slate-50 tabular-nums">
                {design.clearCeilingHeightM.toFixed(2)} متر
              </div>
              <div className="mt-1 text-xs text-slate-300 tabular-nums">
                الدور الأرضي 4.00م (تحته بدروم ويعلوه أول وثاني علوي) · دكت ≤ {design.maxDuctHeightCm} سم
              </div>
            </div>
          </div>
        </section>

        {/* 2. Dynamic SVG Airflow Patterns Simulator + Cooling HP + Ground Placement Options */}
        <AirflowPatternsSection design={design} />

        {/* 3. Final Architectural & MEP Renders Gallery */}
        <FinalRendersGallery />

        {/* 3. Interactive ASHRAE Thermal Load Calculator (Aswan Church First Floor) */}
        <ThermalLoadSection params={params} design={design} onChangeParams={setParams} />

        {/* 4. Duct Material Types, 2D AutoCAD Blueprint & Sizing Table */}
        <DuctSizingSection design={design} />

        {/* 5. 380V 3-Phase Electrical Specs & System Comparison */}
        <ElectricalAndSystemsSection design={design} />
      </main>

      <footer className="border-t border-white/10 bg-[#090E14] py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            <strong className="text-slate-100">مشروع الفادي للتبريد والتكييف</strong> — دراسة هندسية
            لكنيسة بمساحة 1,000 م² (بدروم + دور أرضي + أول وثاني علوي) وفق كود ASHRAE 62.1 و SMACNA.
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-mono tabular-nums text-slate-500">
              25m × 40m × 4m · 1,000 m² · Aswan Church · Ground T3 380V
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span dir="ltr" className="font-mono font-semibold text-sky-400 tracking-wide">
              Developed by Eng/Emad azmy
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
