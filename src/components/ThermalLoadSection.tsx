import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CloudSun,
  GitCompareArrows,
  RotateCcw,
  Sun,
  Thermometer,
  Zap,
} from 'lucide-react';
import {
  calculateHvacDesign,
  DEFAULT_HALL_PARAMS,
  HallParameters,
  HvacDesignResult,
} from '../engine/hvacCalculator';

interface ThermalLoadSectionProps {
  params: HallParameters;
  design: HvacDesignResult;
  onChangeParams: (next: HallParameters) => void;
}

export default function ThermalLoadSection({
  params,
  design,
  onChangeParams,
}: ThermalLoadSectionProps) {
  const [showSeasonCompare, setShowSeasonCompare] = useState<boolean>(true);

  const update = <K extends keyof HallParameters>(key: K, value: HallParameters[K]) => {
    onChangeParams({ ...params, [key]: value });
  };

  // Compute live side-by-side seasonal comparison using the user's current church occupancy & envelope
  const seasonalComparison = useMemo(() => {
    const peakDesign = calculateHvacDesign({
      ...params,
      ambientTempC: 47,
      daytimeEvent: true,
    });

    const mildDesign = calculateHvacDesign({
      ...params,
      ambientTempC: 30,
      daytimeEvent: false,
    });

    // Installed system is ALWAYS sized for Peak Aswan Summer (4 ground units)
    const installedUnitTons = peakDesign.nominalUnitTons;
    const peakOperatingUnits = 4;
    const mildOperatingUnits = Math.max(
      1,
      Math.min(4, Math.ceil(mildDesign.requiredTons / installedUnitTons)),
    );

    // Real compressor efficiency improves sharply at 30°C ambient (~0.94 kW/TR) vs 47°C Aswan peak (~1.32 kW/TR)
    const peakKwPerTr = peakDesign.electrical.kwPerTon;
    const mildKwPerTr = 0.94;

    const peakActualKw = peakDesign.requiredTons * peakKwPerTr;
    const mildActualKw = mildDesign.requiredTons * mildKwPerTr;

    const peakActualAmps = (peakActualKw * 1000) / (Math.sqrt(3) * 380 * 0.85);
    const mildActualAmps = (mildActualKw * 1000) / (Math.sqrt(3) * 380 * 0.85);

    const savedTons = Math.max(0, peakDesign.requiredTons - mildDesign.requiredTons);
    const loadReductionPct = (savedTons / Math.max(1, peakDesign.requiredTons)) * 100;

    const savedKw = Math.max(0, peakActualKw - mildActualKw);
    const powerSavingPct = (savedKw / Math.max(1, peakActualKw)) * 100;

    // Estimated monthly savings at 6 operating hours/day × 30 days × 2.35 EGP/kWh (Egyptian commercial 380V tier)
    const savedKwhPerMonth = savedKw * 6 * 30;
    const savedEgpPerMonth = Math.round(savedKwhPerMonth * 2.35);

    // Pair major load items for side-by-side visual bars
    const categories = [
      { id: 'people', labelAr: 'المصلون والحضور' },
      { id: 'ventilation', labelAr: 'الهواء النقي والـ Fresh Air' },
      { id: 'windows', labelAr: 'الشبابيك والإشعاع الشمسي' },
      { id: 'roof', labelAr: 'السقف والأرضية' },
      { id: 'walls', labelAr: 'الحوائط الخرسانية' },
      { id: 'equipment', labelAr: 'النجف والإضاءة والصوتيات' },
    ].map((cat) => {
      const pItem = peakDesign.loads.find((l) => l.id === cat.id);
      const mItem = mildDesign.loads.find((l) => l.id === cat.id);
      return {
        ...cat,
        peakTons: pItem?.tons ?? 0,
        mildTons: mItem?.tons ?? 0,
      };
    });

    const maxCatTons = Math.max(1, ...categories.map((c) => Math.max(c.peakTons, c.mildTons)));

    return {
      peakDesign,
      mildDesign,
      peakOperatingUnits,
      mildOperatingUnits,
      peakActualKw,
      mildActualKw,
      peakActualAmps,
      mildActualAmps,
      savedTons,
      loadReductionPct,
      savedKw,
      powerSavingPct,
      savedKwhPerMonth,
      savedEgpPerMonth,
      categories,
      maxCatTons,
    };
  }, [params]);

  const isPeakPreset = params.ambientTempC >= 45 && params.daytimeEvent;
  const isMildPreset = params.ambientTempC <= 32 && !params.daytimeEvent;

  const applyPeakPreset = () => {
    onChangeParams({ ...params, ambientTempC: 47, daytimeEvent: true });
  };

  const applyMildPreset = () => {
    onChangeParams({ ...params, ambientTempC: 30, daytimeEvent: false });
  };

  return (
    <section id="thermal-load" className="py-16 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div className="max-w-3xl">
            <p className="text-xs font-medium text-sky-400 mb-2">
              حساب الأحمال الحرارية التفصيلي · معيار ASHRAE لدور العبادة والكنائس (محافظة أسوان)
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-50">
              تفصيل الأحمال الحرارية ومقارنة استهلاك الكهرباء بين صيف أسوان والجو المعتدل
            </h2>
          </div>

          <div className="no-print flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSeasonCompare((v) => !v)}
              className={`px-3.5 py-2 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                showSeasonCompare
                  ? 'bg-sky-500/15 border-sky-400/60 text-sky-200'
                  : 'bg-[#121B26] border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <GitCompareArrows className="w-3.5 h-3.5" />
              <span>{showSeasonCompare ? 'إخفاء مقارنة المواسم' : 'مقارنة صيف أسوان والجو المعتدل'}</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeParams(DEFAULT_HALL_PARAMS)}
              className="px-3.5 py-2 rounded-lg bg-[#121B26] border border-white/10 text-xs text-slate-300 hover:text-white hover:border-white/25 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة قيم الذروة</span>
            </button>
          </div>
        </div>

        {/* Interactive Seasonal Comparison Panel: Aswan Peak Summer (47°C) vs Mild Weather (30°C) */}
        {showSeasonCompare && (
          <div className="mb-10 bg-[#0E1621] border border-sky-400/30 rounded-xl overflow-hidden">
            {/* Header Strip + Quick Preset Switcher */}
            <div className="px-6 py-4 bg-[#121D2B] border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-50 flex items-center gap-2">
                  <GitCompareArrows className="w-4 h-4 text-sky-400" />
                  <span>مقارنة الأحمال الحرارية واستهلاك الكهرباء حسب الموسم (لـ {params.guests.toLocaleString('en-US')} مصلّي)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  توضح لماذا نُصمّم النظام على ذروة صيف أسوان (47°C) وكيف يوفر تقسيم الـ 4 وحدات الطاقة تلقائياً في الأجواء المعتدلة (30°C)
                </p>
              </div>

              <div className="no-print flex items-center gap-1 p-1 bg-[#091018] rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={applyPeakPreset}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isPeakPreset
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>صيف أسوان الأقصى (47°C)</span>
                </button>
                <button
                  type="button"
                  onClick={applyMildPreset}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isMildPreset
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <CloudSun className="w-3.5 h-3.5" />
                  <span>الظروف الجوية المعتدلة (30°C)</span>
                </button>
              </div>
            </div>

            {/* 3-Column Seasonal KPI Comparison Cards */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Peak Aswan Summer Column */}
              <div className="lg:col-span-4 bg-[#141E2B] border border-amber-400/35 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Sun className="w-4 h-4" />
                      <span>صيف أسوان الأقصى (نهاراً)</span>
                    </span>
                    <span className="font-mono text-amber-200 tabular-nums">47°C · شمس ذروة</span>
                  </div>

                  <div className="space-y-2.5 text-xs tabular-nums">
                    <div className="flex justify-between py-1.5 border-b border-white/8">
                      <span className="text-slate-400">الحمل الحراري المطلوب</span>
                      <span className="font-mono font-bold text-slate-50">
                        {seasonalComparison.peakDesign.requiredTons.toFixed(1)} TR (
                        {Math.round(seasonalComparison.peakDesign.requiredCoolingHp)} حصان)
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-white/8">
                      <span className="text-slate-400">الوحدات الأرضية العاملة</span>
                      <span className="font-mono font-semibold text-amber-300">
                        {seasonalComparison.peakOperatingUnits} من 4 وحدات (100%)
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-white/8">
                      <span className="text-slate-400">استهلاك الكهرباء الفعلي</span>
                      <span className="font-mono font-bold text-amber-300">
                        {seasonalComparison.peakActualKw.toFixed(1)} kW / ساعة
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">التيار التشغيلي (380V)</span>
                      <span className="font-mono text-slate-200">
                        {seasonalComparison.peakActualAmps.toFixed(0)} A
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={applyPeakPreset}
                  className="no-print mt-4 w-full py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  عرض تفاصيل صيف أسوان في الجدول أدناه
                </button>
              </div>

              {/* Mild Weather Column */}
              <div className="lg:col-span-4 bg-[#141E2B] border border-emerald-400/35 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <CloudSun className="w-4 h-4" />
                      <span>الظروف الجوية المعتدلة</span>
                    </span>
                    <span className="font-mono text-emerald-200 tabular-nums">30°C · ربيع/خريف/مساء</span>
                  </div>

                  <div className="space-y-2.5 text-xs tabular-nums">
                    <div className="flex justify-between py-1.5 border-b border-white/8">
                      <span className="text-slate-400">الحمل الحراري المطلوب</span>
                      <span className="font-mono font-bold text-slate-50">
                        {seasonalComparison.mildDesign.requiredTons.toFixed(1)} TR (
                        {Math.round(seasonalComparison.mildDesign.requiredCoolingHp)} حصان)
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-white/8">
                      <span className="text-slate-400">الوحدات الأرضية العاملة</span>
                      <span className="font-mono font-semibold text-emerald-300">
                        {seasonalComparison.mildOperatingUnits} من 4 وحدات فقط (فصل الباقي)
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-white/8">
                      <span className="text-slate-400">استهلاك الكهرباء الفعلي</span>
                      <span className="font-mono font-bold text-emerald-300">
                        {seasonalComparison.mildActualKw.toFixed(1)} kW / ساعة
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">التيار التشغيلي (380V)</span>
                      <span className="font-mono text-slate-200">
                        {seasonalComparison.mildActualAmps.toFixed(0)} A
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={applyMildPreset}
                  className="no-print mt-4 w-full py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  عرض تفاصيل الجو المعتدل في الجدول أدناه
                </button>
              </div>

              {/* Net Energy & Cost Savings Highlight Column */}
              <div className="lg:col-span-4 bg-[#101C28] border border-sky-400/40 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300 mb-2">
                    <Zap className="w-4 h-4" />
                    <span>مقدار توفير الطاقة في الأجواء المعتدلة</span>
                  </div>

                  <div className="flex items-baseline gap-2.5 my-2 tabular-nums">
                    <span className="font-mono text-3xl font-bold text-emerald-400">
                      -{seasonalComparison.powerSavingPct.toFixed(0)}%
                    </span>
                    <span className="text-xs text-slate-300">توفير فوري في استهلاك الكهرباء</span>
                  </div>

                  <div className="space-y-2 text-xs tabular-nums mt-3">
                    <div className="flex justify-between py-1.5 border-b border-white/8">
                      <span className="text-slate-400">انخفاض الحمل التبريدي</span>
                      <span className="font-mono font-semibold text-sky-300">
                        -{seasonalComparison.savedTons.toFixed(1)} TR (-
                        {seasonalComparison.loadReductionPct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-white/8">
                      <span className="text-slate-400">وفر القدرة الكهربائية</span>
                      <span className="font-mono font-semibold text-emerald-300">
                        {seasonalComparison.savedKw.toFixed(1)} kW كل ساعة تشغيل
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">توفير شهري تقديري (6 س/يوم)</span>
                      <span className="font-mono font-bold text-amber-300">
                        ~{seasonalComparison.savedEgpPerMonth.toLocaleString('en-US')} ج.م/شهر
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-white/8 text-[11px] text-slate-400 leading-relaxed">
                  يتحقق هذا الوفر بفضل ارتفاع كفاءة المكثفات عند 30°C (0.94 kW/TR مقابل 1.32 في حر أسوان) مع إطفاء{' '}
                  {4 - seasonalComparison.mildOperatingUnits} وحدة أرضية تلقائياً.
                </div>
              </div>
            </div>

            {/* Grouped Side-by-Side Load Breakdown Bars */}
            <div className="px-6 pb-6">
              <div className="bg-[#0A1018] border border-white/8 rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
                  <span className="font-semibold text-slate-200">
                    أين يحدث التوفير؟ مقارنة كل مصدر حرارة بين الموسمين (طن تبريد TR)
                  </span>
                  <div className="flex items-center gap-4 text-[11px] text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-2 bg-amber-400 rounded-xs" />
                      صيف أسوان الأقصى (47°C)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-2 bg-emerald-400 rounded-xs" />
                      الظروف الجوية المعتدلة (30°C)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                  {seasonalComparison.categories.map((cat) => (
                    <div key={cat.id} className="space-y-1">
                      <div className="flex justify-between text-xs tabular-nums">
                        <span className="text-slate-300">{cat.labelAr}</span>
                        <span className="font-mono text-[11px] text-slate-400">
                          <span className="text-amber-300">{cat.peakTons.toFixed(1)} TR</span>
                          {' ← '}
                          <span className="text-emerald-300">{cat.mildTons.toFixed(1)} TR</span>
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="w-full h-2 bg-[#16202E] rounded-xs overflow-hidden">
                          <div
                            className="h-full bg-amber-400 transition-all duration-300"
                            style={{ width: `${(cat.peakTons / seasonalComparison.maxCatTons) * 100}%` }}
                          />
                        </div>
                        <div className="w-full h-2 bg-[#16202E] rounded-xs overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 transition-all duration-300"
                            style={{ width: `${(cat.mildTons / seasonalComparison.maxCatTons) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Site & Operating Parameters Bar */}
        <div className="no-print bg-[#111923] border border-white/10 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-white/8">
            {/* Worshippers Slider */}
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-200 font-medium">عدد المصلين والحضور في الكنيسة</span>
                <span className="font-mono text-sky-400 font-semibold tabular-nums">
                  {params.guests.toLocaleString('en-US')} فرد
                </span>
              </div>
              <input
                type="range"
                min={300}
                max={1400}
                step={50}
                value={params.guests}
                onChange={(e) => update('guests', Number(e.target.value))}
                className="studio-slider w-full"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1 tabular-nums">
                <span>300 فرد</span>
                <span>1,000 فرد (الأساسي)</span>
                <span>1,400 فرد</span>
              </div>
            </div>

            {/* Ambient Temp Slider (26°C Mild to 52°C Aswan T3 Peak) */}
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-200 font-medium flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-amber-400" />
                  <span>حرارة الجو الخارجية (أسوان)</span>
                </span>
                <span className="font-mono text-amber-400 font-semibold tabular-nums">
                  {params.ambientTempC}°C
                </span>
              </div>
              <input
                type="range"
                min={26}
                max={52}
                step={1}
                value={params.ambientTempC}
                onChange={(e) => update('ambientTempC', Number(e.target.value))}
                className="studio-slider w-full"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1 tabular-nums">
                <span>26°C (معتدل)</span>
                <span>38°C</span>
                <span>47°C (صيف أسوان)</span>
                <span>52°C (T3)</span>
              </div>
            </div>

            {/* Window Ratio across 4 sides */}
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-200 font-medium">نسبة الشبابيك في الـ 4 واجهات</span>
                <span className="font-mono text-sky-400 font-semibold tabular-nums">
                  {params.windowRatioPct}% ({design.windowAreaM2} م²)
                </span>
              </div>
              <input
                type="range"
                min={15}
                max={50}
                step={5}
                value={params.windowRatioPct}
                onChange={(e) => update('windowRatioPct', Number(e.target.value))}
                className="studio-slider w-full"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1 tabular-nums">
                <span>15%</span>
                <span>30% (متوسط 4 جهات)</span>
                <span>50%</span>
              </div>
            </div>
          </div>

          {/* Engineering Toggles for First Floor / Aswan Daytime & Energy Options */}
          <div className="pt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => update('daytimeEvent', !params.daytimeEvent)}
              className={`px-3.5 py-2.5 rounded-lg border text-right transition-colors cursor-pointer ${
                params.daytimeEvent
                  ? 'bg-amber-500/15 border-amber-400/50 text-amber-100'
                  : 'bg-[#0C131C] border-white/10 text-slate-300 hover:border-white/25'
              }`}
            >
              <div className="text-xs font-semibold flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>{params.daytimeEvent ? 'قداسات ومناسبات نهارية + ليلية' : 'أجواء مسائية / معتدلة'}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {params.daytimeEvent
                  ? 'التصميم يغطي ذروة شمس النهار في أسوان'
                  : 'حمل إشعاع شمسي منخفض بعد الغروب أو في الربيع'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => update('roofExposedToSun', !params.roofExposedToSun)}
              className={`px-3.5 py-2.5 rounded-lg border text-right transition-colors cursor-pointer ${
                !params.roofExposedToSun
                  ? 'bg-sky-500/12 border-sky-400/40 text-sky-100'
                  : 'bg-amber-500/15 border-amber-400/50 text-amber-100'
              }`}
            >
              <div className="text-xs font-semibold">
                {params.roofExposedToSun ? 'السقف معرض للشمس مباشرة' : 'يعلو الكنيسة أول وثاني علوي (تحتها بدروم)'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {params.roofExposedToSun ? 'أعلى حمل حراري من السطح' : 'يوفر ~18 طن + صواعد أرضية قصيرة'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => update('hasAirCurtains', !params.hasAirCurtains)}
              className={`px-3.5 py-2.5 rounded-lg border text-right transition-colors cursor-pointer ${
                params.hasAirCurtains
                  ? 'bg-sky-500/12 border-sky-400/40 text-sky-100'
                  : 'bg-[#0C131C] border-white/10 text-slate-300'
              }`}
            >
              <div className="text-xs font-semibold">
                {params.hasAirCurtains ? 'ستائر هوائية على أبواب الكنيسة' : 'بدون ستائر هوائية للأبواب'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                تمنع دخول هواء أسوان الساخن مع دخول المصلين
              </div>
            </button>

            <button
              type="button"
              onClick={() => update('useErv', !params.useErv)}
              className={`px-3.5 py-2.5 rounded-lg border text-right transition-colors cursor-pointer ${
                params.useErv
                  ? 'bg-sky-500/12 border-sky-400/40 text-sky-100'
                  : 'bg-[#0C131C] border-white/10 text-slate-300 hover:border-white/25'
              }`}
            >
              <div className="text-xs font-semibold">
                {params.useErv ? 'مع وحدة استرجاع طاقة ERV' : 'هواء نقي مباشر (بدون ERV)'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                الـ ERV يبرد الهواء النقي الخارجي ويوفر ~18 طن
              </div>
            </button>
          </div>
        </div>

        {/* Visual Stacked Distribution Bar */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 mb-2">
            <span>توزيع نسب الأحمال الحرارية داخل صحن الكنيسة (عند {params.ambientTempC}°C)</span>
            <span className="font-mono tabular-nums text-slate-200">
              SHR = {(design.sensibleHeatRatio * 100).toFixed(1)}% · إجمالي{' '}
              {design.requiredTons.toFixed(1)} TR ({Math.round(design.requiredCoolingHp)} حصان تبريدي ·{' '}
              {Math.round(design.totalBtuHr).toLocaleString('en-US')} BTU/hr)
            </span>
          </div>
          <div className="w-full h-3.5 rounded-md overflow-hidden flex bg-[#16202E]">
            {design.loads.map((item) => (
              <div
                key={item.id}
                style={{ width: `${item.sharePct}%`, backgroundColor: item.color }}
                title={`${item.nameAr}: ${item.tons.toFixed(1)} TR (${item.sharePct.toFixed(1)}%)`}
                className="h-full transition-all duration-200"
              />
            ))}
          </div>
        </div>

        {/* Complete ASHRAE Thermal Load Breakdown Table */}
        <div className="bg-[#111923] border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-[#16202E] border-b border-white/10 text-xs text-slate-300">
                  <th className="py-3.5 px-4 font-semibold">مصدر الحمل الحراري</th>
                  <th className="py-3.5 px-4 font-semibold">حرارة محسوسة (kW)</th>
                  <th className="py-3.5 px-4 font-semibold">حرارة كامنة (kW)</th>
                  <th className="py-3.5 px-4 font-semibold">الإجمالي (kW)</th>
                  <th className="py-3.5 px-4 font-semibold">BTU / hr</th>
                  <th className="py-3.5 px-4 font-semibold">طن تبريد (TR)</th>
                  <th className="py-3.5 px-4 font-semibold">النسبة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8 text-sm">
                {design.loads.map((row) => (
                  <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-2.5">
                        <span
                          className="mt-1.5 inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: row.color }}
                        />
                        <div>
                          <div className="font-medium text-slate-100">{row.nameAr}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{row.detailAr}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-300">
                      {row.sensibleKw.toFixed(1)}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-300">
                      {row.latentKw.toFixed(1)}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums font-medium text-slate-100">
                      {row.totalKw.toFixed(1)}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-300">
                      {Math.round(row.btuHr).toLocaleString('en-US')}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-sky-300">
                      {row.tons.toFixed(1)} TR
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-400">
                      {row.sharePct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#16202E]/90 border-t border-white/15 font-bold text-slate-50">
                  <td className="py-4 px-4">
                    إجمالي الحمل الحراري ({design.unitCount} وحدات × {design.nominalUnitTons} طن ={' '}
                    {design.installedTotalTons} TR / {design.totalCoolingHp} حصان تبريدي)
                  </td>
                  <td className="py-4 px-4 font-mono tabular-nums">
                    {(design.subtotalSensibleKw + design.safetyFactorKw * 0.85).toFixed(1)}
                  </td>
                  <td className="py-4 px-4 font-mono tabular-nums">
                    {(design.subtotalLatentKw + design.safetyFactorKw * 0.15).toFixed(1)}
                  </td>
                  <td className="py-4 px-4 font-mono tabular-nums">
                    {design.totalCoolingKw.toFixed(1)} kW
                  </td>
                  <td className="py-4 px-4 font-mono tabular-nums">
                    {Math.round(design.totalBtuHr).toLocaleString('en-US')}
                  </td>
                  <td className="py-4 px-4 font-mono tabular-nums text-sky-400 text-base">
                    {design.requiredTons.toFixed(1)} TR
                  </td>
                  <td className="py-4 px-4 font-mono tabular-nums">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Critical Aswan Church & Ground-Mounted Advisories */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-[#111923] border border-amber-500/25 rounded-xl p-5">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm mb-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>شرط حرج لمناخ أسوان: ضواغط T3 + صواعد كلادينج</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              تُركّب الوحدات الـ 4 <strong>أرضياً</strong> على قواعد خرسانية مظللة مفتوحة الجوانب
              لوجود دور أول وثاني علوي فوق الكنيسة، مع مواصفة استوائية{' '}
              <span className="font-mono text-amber-300">T3 Tropical (52°C)</span> وتغليف الصواعد
              الخارجية بصاج ألومنيوم كلادينج 0.7 مم فوق عزل صوف زجاجي 50 مم.
            </p>
          </div>

          <div className="bg-[#111923] border border-white/10 rounded-xl p-5">
            <div className="text-sky-300 font-semibold text-sm mb-2">
              الهدوء الصوتي للقداسات وتنقية جو البخور
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              تثبيت الوحدات خارجياً على الأرض يزيل تماماً أي اهتزاز على سقف الكنيسة، ومع التبطين
              الصوتي للدكت 25 مم ومروحة سحب عادم قرب الهيكل ({design.exhaustCfmTotal.toLocaleString('en-US')} CFM)
              يُطرد دخان البخور مع الحفاظ على هدوء أقل من 35 NC لوضوح صوت العظات والألحان.
            </p>
          </div>

          <div className="bg-[#111923] border border-white/10 rounded-xl p-5">
            <div className="text-sky-300 font-semibold text-sm mb-2">
              التعامل مع الشبابيك في الـ 4 اتجاهات والأبواب
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              أثناء القداسات النهارية والإكليل يجب <strong>إغلاق جميع الشبابيك</strong> المحيطية
              بزجاج دبل عاكس وستائر حجب شمس، والاعتماد على الهواء النقي الميكانيكي (
              {design.freshAirCfmTotal.toLocaleString('en-US')} CFM) مع ستائر هوائية على المداخل.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
