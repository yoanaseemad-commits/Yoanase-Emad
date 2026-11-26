import { useMemo, useState } from 'react';
import { CheckCircle2, ShieldAlert, Sliders, Volume2, Wand2 } from 'lucide-react';
import { HvacDesignResult } from '../engine/hvacCalculator';

interface AcousticNoiseEstimatorProps {
  design: HvacDesignResult;
}

export default function AcousticNoiseEstimator({ design }: AcousticNoiseEstimatorProps) {
  const [mainVelocityFpm, setMainVelocityFpm] = useState<number>(1300);
  const [neckVelocityFpm, setNeckVelocityFpm] = useState<number>(650);

  // Interactive acoustic isolation toggles
  const [hasAcousticLiner, setHasAcousticLiner] = useState<boolean>(true);
  const [hasCanvasIsolator, setHasCanvasIsolator] = useState<boolean>(true);
  const [hasPlenumFlex, setHasPlenumFlex] = useState<boolean>(true);
  const [hasSoundAttenuator, setHasSoundAttenuator] = useState<boolean>(false);

  const twinTrunkCfm = Math.round(design.cfmPerUnit / 2);

  const acoustic = useMemo(() => {
    // ASHRAE Ch. 49 velocity-scaled aerodynamic regenerated noise (50-55 log10 velocity law)
    const trunkNoise = 25.5 + 50 * Math.log10(mainVelocityFpm / 1000);
    const neckNoise = 27.5 + 55 * Math.log10(neckVelocityFpm / 550);
    // Ground-mounted units outdoors have far lower structural breakout into the church than rooftop units
    const unitBreakout = hasCanvasIsolator ? 24.5 : 31.5;

    const combinedRaw =
      10 *
      Math.log10(
        Math.pow(10, trunkNoise / 10) +
          Math.pow(10, neckNoise / 10) +
          Math.pow(10, unitBreakout / 10),
      );

    let attenuation = 0;
    if (hasAcousticLiner) attenuation += 5.0;
    if (hasPlenumFlex) attenuation += 3.0;
    if (hasSoundAttenuator) attenuation += 6.5;

    const estimatedNc = Math.max(22, Math.min(58, Math.round(combinedRaw - attenuation)));
    const estimatedDba = estimatedNc + 7;

    // Trade-off: required main trunk duct width (cm) at 40cm height for the selected velocity
    const areaFt2 = twinTrunkCfm / mainVelocityFpm;
    const widthCm = Math.max(40, Math.ceil(((areaFt2 * 0.092903) / (design.maxDuctHeightCm / 100)) * 100 / 5) * 5);

    const status: 'optimal' | 'caution' | 'high' =
      estimatedNc <= 35 ? 'optimal' : estimatedNc <= 41 ? 'caution' : 'high';

    // Smart dynamic engineering recommendations
    const suggestions: { id: string; titleAr: string; impactAr: string; action?: () => void }[] = [];

    if (mainVelocityFpm > 1400) {
      suggestions.push({
        id: 'lower-main-v',
        titleAr: `خفض سرعة الدكت الرئيسي من ${mainVelocityFpm} إلى 1,250 FPM (بتكبير عرض الدكت إلى ~${Math.ceil((((twinTrunkCfm / 1250) * 0.092903) / (design.maxDuctHeightCm / 100)) * 100 / 5) * 5} سم)`,
        impactAr: 'يقلل ضوضاء احتكاك الهواء ~4–6 NC',
        action: () => setMainVelocityFpm(1250),
      });
    }
    if (neckVelocityFpm > 700) {
      suggestions.push({
        id: 'lower-neck-v',
        titleAr: `خفض سرعة الهواء عند مخرج الدفيوزر إلى 600 FPM بزيادة مقاس رقبة الدفيوزر أو استخدام دفيوزر 60×60 بفتحة أكبر`,
        impactAr: 'يمنع صوت الصفير فوق رؤوس المصلين (-5 NC)',
        action: () => setNeckVelocityFpm(600),
      });
    }
    if (!hasAcousticLiner) {
      suggestions.push({
        id: 'add-liner',
        titleAr: 'إضافة تبطين صوتي داخلي (Acoustic Liner 25 مم كثافة 48 كجم/م³) لأول 5 أمتار بعد دخول الدكت',
        impactAr: 'يمتص ترددات المراوح (-5.0 NC)',
        action: () => setHasAcousticLiner(true),
      });
    }
    if (!hasSoundAttenuator && estimatedNc > 35) {
      suggestions.push({
        id: 'add-silencer',
        titleAr: 'تركيب كاتم صوت (Duct Sound Attenuator / Silencer بطول 1.2م) مباشرة عند مخرج الوحدة الأرضية',
        impactAr: 'أقوى خفض صوتي احترافي للكنائس (-6.5 NC)',
        action: () => setHasSoundAttenuator(true),
      });
    }
    if (!hasCanvasIsolator) {
      suggestions.push({
        id: 'add-canvas',
        titleAr: 'إضافة وصلة قماش مرنة (Canvas Flexible Connector) وقواعد مطاطية مانعة للاهتزاز تحت الوحدات الأرضية',
        impactAr: 'يقطع انتقال اهتزازات الصاج (-3.5 NC)',
        action: () => setHasCanvasIsolator(true),
      });
    }
    if (!hasPlenumFlex && estimatedNc > 34) {
      suggestions.push({
        id: 'add-plenum',
        titleAr: 'استخدام صناديق توزيع مبطنة صوتياً (Lined Plenum Boxes) مع فلكسبل صوتي بطول 1.2–1.5م قبل كل دفيوزر',
        impactAr: 'يُنعّم تدفق الهواء عند المخرج (-3.0 NC)',
        action: () => setHasPlenumFlex(true),
      });
    }

    return {
      estimatedNc,
      estimatedDba,
      mainVelocityMs: (mainVelocityFpm * 0.00508).toFixed(1),
      neckVelocityMs: (neckVelocityFpm * 0.00508).toFixed(1),
      widthCm,
      status,
      suggestions,
    };
  }, [
    mainVelocityFpm,
    neckVelocityFpm,
    hasAcousticLiner,
    hasCanvasIsolator,
    hasPlenumFlex,
    hasSoundAttenuator,
    twinTrunkCfm,
    design.maxDuctHeightCm,
  ]);

  const applyOptimalChurchAcoustics = () => {
    setMainVelocityFpm(1250);
    setNeckVelocityFpm(600);
    setHasAcousticLiner(true);
    setHasCanvasIsolator(true);
    setHasPlenumFlex(true);
    setHasSoundAttenuator(true);
  };

  // Position of marker along the 20 NC – 55 NC gauge
  const gaugePct = Math.max(0, Math.min(100, ((acoustic.estimatedNc - 20) / 35) * 100));

  return (
    <div id="acoustics" className="mt-10 bg-[#111923] border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-[#141F2D] border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-sky-400 flex items-center gap-1.5 mb-1">
            <Volume2 className="w-3.5 h-3.5" />
            <span>أداة تقدير مستوى الضوضاء والعزل الصوتي (ASHRAE Noise Criterion · NC / dBA)</span>
          </p>
          <h3 className="text-lg font-bold text-slate-50">
            تقدير مستوى الهدوء داخل صحن الكنيسة بناءً على سرعة الهواء في الدكتات
          </h3>
        </div>

        <button
          type="button"
          onClick={applyOptimalChurchAcoustics}
          className="no-print px-3.5 py-2 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/50 text-sky-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>ضبط تلقائي لمعيار هدوء الكنائس (&lt; 32 NC)</span>
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Controls Column: Velocity Sliders + Isolation Toggles */}
        <div className="lg:col-span-7 space-y-5">
          {/* Velocity Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-[#0C131C] border border-white/8 rounded-lg p-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-200 font-medium flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-sky-400" />
                  <span>سرعة الهواء بالدكت الرئيسي</span>
                </span>
                <span className="font-mono text-sky-300 font-semibold tabular-nums">
                  {mainVelocityFpm.toLocaleString('en-US')} FPM ({acoustic.mainVelocityMs} m/s)
                </span>
              </div>
              <input
                type="range"
                min={800}
                max={2200}
                step={50}
                value={mainVelocityFpm}
                onChange={(e) => setMainVelocityFpm(Number(e.target.value))}
                className="studio-slider w-full"
              />
              <div className="flex justify-between text-[10.5px] text-slate-500 mt-1 tabular-nums">
                <span>800 (هادئ جداً)</span>
                <span>1,300 (تصميمي)</span>
                <span>2,200 (مزعج)</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400 tabular-nums">
                مقاس الخط الرئيسي المطلوب عند هذه السرعة:{' '}
                <span className="font-mono text-sky-300">
                  {acoustic.widthCm} × {design.maxDuctHeightCm} سم
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-200 font-medium flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>سرعة الهواء عند مخرج الدفيوزر</span>
                </span>
                <span className="font-mono text-amber-300 font-semibold tabular-nums">
                  {neckVelocityFpm.toLocaleString('en-US')} FPM ({acoustic.neckVelocityMs} m/s)
                </span>
              </div>
              <input
                type="range"
                min={400}
                max={1100}
                step={25}
                value={neckVelocityFpm}
                onChange={(e) => setNeckVelocityFpm(Number(e.target.value))}
                className="studio-slider w-full"
              />
              <div className="flex justify-between text-[10.5px] text-slate-500 mt-1 tabular-nums">
                <span>400 (صامت)</span>
                <span>650 (موصى به)</span>
                <span>1,100 (صفير)</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                الحد الأقصى الموصى به فوق دكك الكنيسة: <span className="font-mono text-emerald-300">≤ 650 FPM</span>
              </div>
            </div>
          </div>

          {/* Acoustic Isolation Options */}
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-2.5">
              حلول العزل الصوتي المطبّقة على شبكة الدكت (جرّب التفعيل لقياس الأثر الفوري):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setHasAcousticLiner((v) => !v)}
                className={`p-3 rounded-lg border text-right transition-colors cursor-pointer ${
                  hasAcousticLiner
                    ? 'bg-sky-500/12 border-sky-400/50 text-sky-100'
                    : 'bg-[#0C131C] border-white/10 text-slate-400 hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>تبطين صوتي داخلي Acoustic Liner 25مم</span>
                  <span className="font-mono text-[11px] text-emerald-300">-5.0 NC</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  صوف زجاجي أسود لأول 5 أمتار بعد دخول الدكت للصحن
                </div>
              </button>

              <button
                type="button"
                onClick={() => setHasSoundAttenuator((v) => !v)}
                className={`p-3 rounded-lg border text-right transition-colors cursor-pointer ${
                  hasSoundAttenuator
                    ? 'bg-emerald-500/12 border-emerald-400/50 text-emerald-100'
                    : 'bg-[#0C131C] border-white/10 text-slate-400 hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>كاتم صوت Silencer (Sound Attenuator)</span>
                  <span className="font-mono text-[11px] text-emerald-300">-6.5 NC</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  يُركّب على صاعد الخروج من الوحدة الأرضية لهدوء مثالي
                </div>
              </button>

              <button
                type="button"
                onClick={() => setHasCanvasIsolator((v) => !v)}
                className={`p-3 rounded-lg border text-right transition-colors cursor-pointer ${
                  hasCanvasIsolator
                    ? 'bg-sky-500/12 border-sky-400/50 text-sky-100'
                    : 'bg-[#0C131C] border-white/10 text-slate-400 hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>وصلة قماش مرنة Canvas + قواعد مطاطية</span>
                  <span className="font-mono text-[11px] text-emerald-300">-3.5 NC</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  تفصل اهتزاز المراوح والضواغط الأرضية عن الصاج
                </div>
              </button>

              <button
                type="button"
                onClick={() => setHasPlenumFlex((v) => !v)}
                className={`p-3 rounded-lg border text-right transition-colors cursor-pointer ${
                  hasPlenumFlex
                    ? 'bg-sky-500/12 border-sky-400/50 text-sky-100'
                    : 'bg-[#0C131C] border-white/10 text-slate-400 hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>صناديق Plenum مبطنة + فلكسبل صوتي</span>
                  <span className="font-mono text-[11px] text-emerald-300">-3.0 NC</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  تهدئة دوامات الهواء قبل خروجه من الـ 64 دفيوزر
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Result Column: NC/dBA Live Readout + Visual ASHRAE Scale + Dynamic Suggestions */}
        <div className="lg:col-span-5 bg-[#0C131C] border border-white/10 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs text-slate-400">مستوى الضوضاء التقديري داخل الصحن</span>
              <span
                className={`text-xs font-bold flex items-center gap-1 ${
                  acoustic.status === 'optimal'
                    ? 'text-emerald-400'
                    : acoustic.status === 'caution'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                }`}
              >
                {acoustic.status === 'optimal' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <ShieldAlert className="w-4 h-4" />
                )}
                <span>
                  {acoustic.status === 'optimal'
                    ? 'مطابق لمعيار الكنائس (≤ 35 NC)'
                    : acoustic.status === 'caution'
                      ? 'أعلى قليلاً من الحد المثالي'
                      : 'ضوضاء مرتفعة — يلزم عزل إضافي'}
                </span>
              </span>
            </div>

            <div className="flex items-baseline gap-4 my-2 tabular-nums">
              <div
                className={`font-mono text-4xl font-bold ${
                  acoustic.status === 'optimal'
                    ? 'text-emerald-400'
                    : acoustic.status === 'caution'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                }`}
              >
                NC-{acoustic.estimatedNc}
              </div>
              <div className="font-mono text-lg text-slate-300">
                ≈ {acoustic.estimatedDba} <span className="text-xs text-slate-400">dBA</span>
              </div>
            </div>

            {/* Visual ASHRAE Scale Bar (20 NC to 55 NC) */}
            <div className="mt-4">
              <div className="relative h-3 rounded-full overflow-hidden flex bg-[#16202E]">
                {/* 20-35 NC Optimal Church Zone (43%) */}
                <div className="h-full bg-emerald-500/75" style={{ width: '43%' }} />
                {/* 35-41 NC Caution Zone (17%) */}
                <div className="h-full bg-amber-500/75" style={{ width: '17%' }} />
                {/* 41-55 NC High Noise Zone (40%) */}
                <div className="h-full bg-rose-500/75" style={{ width: '40%' }} />
              </div>
              {/* Indicator Needle */}
              <div className="relative h-4 mt-1">
                <div
                  className="absolute -top-4 w-1 h-5 bg-white rounded-full shadow transition-all duration-200"
                  style={{ right: `calc(${gaugePct}% - 2px)` }}
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400 tabular-nums">
                  <span>20 NC (استوديو)</span>
                  <span className="text-emerald-300">35 NC (حد الكنائس)</span>
                  <span className="text-rose-300">55 NC (صاخب)</span>
                </div>
              </div>
            </div>

            {/* Dynamic Acoustic Recommendations */}
            <div className="mt-5 pt-4 border-t border-white/8">
              <div className="text-xs font-semibold text-slate-200 mb-2.5">
                {acoustic.suggestions.length > 0
                  ? 'توصيات العزل الصوتي المقترحة:'
                  : 'التقييم الصوتي للنظام الحالي:'}
              </div>

              {acoustic.suggestions.length === 0 ? (
                <p className="text-xs text-emerald-300/90 leading-relaxed">
                  ممتاز! سرعات الهواء الحالية والعزل الصوتي المفعّل يحققان هدوءاً نموذجياً (
                  <span className="font-mono">NC-{acoustic.estimatedNc}</span> /{' '}
                  <span className="font-mono">{acoustic.estimatedDba} dBA</span>) يضمن وضوح صوت
                  العظات والقداسات والألحان دون أي تشويش على الميكروفونات.
                </p>
              ) : (
                <ul className="space-y-2">
                  {acoustic.suggestions.slice(0, 3).map((s) => (
                    <li
                      key={s.id}
                      className="p-2.5 rounded-lg bg-[#111923] border border-white/8 flex items-start justify-between gap-2"
                    >
                      <div className="text-xs">
                        <div className="text-slate-200 leading-snug">{s.titleAr}</div>
                        <div className="text-[11px] text-sky-400 mt-0.5">{s.impactAr}</div>
                      </div>
                      {s.action && (
                        <button
                          type="button"
                          onClick={s.action}
                          className="no-print shrink-0 px-2.5 py-1 rounded bg-sky-500/15 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-[11px] font-semibold cursor-pointer"
                        >
                          تطبيق
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
