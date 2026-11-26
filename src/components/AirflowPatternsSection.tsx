import { useState, type CSSProperties } from 'react';
import { Flame, Layers, Pause, Play, Wind } from 'lucide-react';
import { HvacDesignResult } from '../engine/hvacCalculator';

interface AirflowPatternsSectionProps {
  design: HvacDesignResult;
}

type AirflowView = 'plan' | 'section';
type OperatingScenario = 'peak-day' | 'evening' | 'partial-meeting';

interface ScenarioConfig {
  id: OperatingScenario;
  labelAr: string;
  activeUnits: number[];
  flowScale: number;
  flowDurationSec: number;
  ambientLabel: string;
  targetTempC: string;
  velocityMs: string;
  throwM: string;
}

const SCENARIOS: Record<OperatingScenario, ScenarioConfig> = {
  'peak-day': {
    id: 'peak-day',
    labelAr: 'قداس نهاري كامل (47°C · 1,000 فرد · 4 وحدات)',
    activeUnits: [1, 2, 3, 4],
    flowScale: 1.0,
    flowDurationSec: 1.3,
    ambientLabel: '47°C شمس أسوان',
    targetTempC: '22.0°C',
    velocityMs: '0.24 m/s',
    throwM: '3.1 m',
  },
  evening: {
    id: 'evening',
    labelAr: 'عشية أو إكليل ليلي (36°C · 4 وحدات 75%)',
    activeUnits: [1, 2, 3, 4],
    flowScale: 0.75,
    flowDurationSec: 1.85,
    ambientLabel: '36°C ليل أسوان',
    targetTempC: '22.5°C',
    velocityMs: '0.19 m/s',
    throwM: '2.7 m',
  },
  'partial-meeting': {
    id: 'partial-meeting',
    labelAr: 'اجتماع يومي 300 فرد (وحدتان أماميتان فقط 50%)',
    activeUnits: [1, 2],
    flowScale: 0.5,
    flowDurationSec: 1.7,
    ambientLabel: 'توفير 50% كهرباء',
    targetTempC: '23.0°C',
    velocityMs: '0.21 m/s',
    throwM: '2.9 m',
  },
};

export default function AirflowPatternsSection({ design }: AirflowPatternsSectionProps) {
  const [view, setView] = useState<AirflowView>('plan');
  const [scenario, setScenario] = useState<OperatingScenario>('peak-day');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showThermalOverlay, setShowThermalOverlay] = useState<boolean>(true);
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);

  const cfg = SCENARIOS[scenario];
  const activeCount = cfg.activeUnits.length;
  const activeCfm = Math.round(design.cfmPerUnit * activeCount * (scenario === 'evening' ? 0.8 : 1));
  const activeCoolingHp = Math.round(design.coolingHpPerUnit * activeCount);
  const activeTons = design.nominalUnitTons * activeCount;

  const flowStyle = {
    '--flow-duration': `${cfg.flowDurationSec}s`,
  } as CSSProperties;

  // 4 Ground-Mounted Units outside East (top) & West (bottom) exterior walls feeding horizontally into 4 zones
  const zones = [
    {
      id: 1,
      labelAr: 'وحدة أرضية #1 (شرق أمامي — قرب الهيكل)',
      shortAr: 'GND #1',
      unitX: 248,
      unitY: 22,
      side: 'top' as const,
      x0: 215,
      x1: 540,
      yEdge: 108,
      dir: 1,
    },
    {
      id: 2,
      labelAr: 'وحدة أرضية #2 (غرب أمامي — قرب الهيكل)',
      shortAr: 'GND #2',
      unitX: 248,
      unitY: 534,
      side: 'bottom' as const,
      x0: 215,
      x1: 540,
      yEdge: 492,
      dir: -1,
    },
    {
      id: 3,
      labelAr: 'وحدة أرضية #3 (شرق خلفي — جهة المدخل)',
      shortAr: 'GND #3',
      unitX: 608,
      unitY: 22,
      side: 'top' as const,
      x0: 555,
      x1: 880,
      yEdge: 108,
      dir: 1,
    },
    {
      id: 4,
      labelAr: 'وحدة أرضية #4 (غرب خلفي — جهة المدخل)',
      shortAr: 'GND #4',
      unitX: 608,
      unitY: 534,
      side: 'bottom' as const,
      x0: 555,
      x1: 880,
      yEdge: 492,
      dir: -1,
    },
  ];

  // Ducted split 8-unit alternative calculation (thin copper pipes, zero exterior sheet-metal risers)
  const splitUnitTons = Math.ceil((design.requiredTons / 8) / 2.5) * 2.5;
  const splitUnitCoolingHp = Number((splitUnitTons * 1.5).toFixed(1));

  return (
    <section id="airflow" className="py-16 border-b border-white/10 bg-[#0B1117]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div className="max-w-3xl">
            <p className="text-xs font-medium text-sky-400 mb-2">
              محاكاة ديناميكية لتوزيع الهواء (Dynamic SVG Airflow Patterns) · 64 دفيوزر رباعي · بدون فتحات بسقف الأدوار العلوية
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-50">
              اتجاهات تدفق الهواء داخل صحن الكنيسة، القدرة بالحصان التبريدي، وأفضل مكان للوحدات الأرضية
            </h2>
          </div>

          {/* Cooling Horsepower Callout Strip */}
          <div className="bg-[#111C28] border border-sky-400/35 rounded-xl px-5 py-3 flex items-center gap-5 tabular-nums">
            <div>
              <div className="text-[11px] text-slate-400">قدرة الوحدة الواحدة (حصان تبريدي)</div>
              <div className="font-mono text-xl font-bold text-sky-300">
                {design.coolingHpPerUnit} حصان{' '}
                <span className="text-xs font-normal text-slate-400">({design.nominalUnitTons} طن)</span>
              </div>
            </div>
            <div className="h-9 w-px bg-white/10" />
            <div>
              <div className="text-[11px] text-slate-400">الإجمالي (4 وحدات أرضية)</div>
              <div className="font-mono text-xl font-bold text-amber-300">
                {design.totalCoolingHp} حصان{' '}
                <span className="text-xs font-normal text-slate-400">({design.installedTotalTons} طن)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic SVG Controls Toolbar */}
        <div className="bg-[#111923] border border-white/10 rounded-t-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          {/* View Toggle: Plan vs Cross-Section */}
          <div className="flex items-center gap-1 bg-[#0A1018] p-1 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => setView('plan')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                view === 'plan'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Wind className="w-3.5 h-3.5" />
              <span>مسقط أفقي ديناميكي (64 دفيوزر)</span>
            </button>
            <button
              type="button"
              onClick={() => setView('section')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                view === 'section'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>قطاع عرضي (تأثير كواندا و4 أدوار)</span>
            </button>
          </div>

          {/* Operating Scenario Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(SCENARIOS) as OperatingScenario[]).map((key) => {
              const item = SCENARIOS[key];
              const active = scenario === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setScenario(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors border cursor-pointer ${
                    active
                      ? 'bg-sky-500/15 border-sky-400/60 text-sky-200 font-semibold'
                      : 'bg-[#0A1018] border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.labelAr}
                </button>
              );
            })}
          </div>

          {/* Play/Pause & Thermal Overlay Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowThermalOverlay((v) => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs border flex items-center gap-1.5 transition-colors cursor-pointer ${
                showThermalOverlay
                  ? 'bg-amber-500/15 border-amber-400/50 text-amber-200'
                  : 'bg-[#0A1018] border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>التدرج الحراري</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="px-3 py-1.5 rounded-lg text-xs bg-[#0A1018] border border-white/15 text-slate-200 hover:border-sky-400/60 flex items-center gap-1.5 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-sky-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isPlaying ? 'إيقاف الحركة' : 'تشغيل الحركة'}</span>
            </button>
          </div>
        </div>

        {/* Main Dynamic SVG Canvas */}
        <div
          style={flowStyle}
          className={`bg-[#070D14] border-x border-b border-white/10 rounded-b-xl overflow-hidden ${
            isPlaying ? '' : 'airflow-paused'
          }`}
        >
          <div className="p-4 md:p-6 overflow-x-auto">
            {view === 'plan' ? (
              <svg
                viewBox="0 0 1060 605"
                className="w-full h-auto min-w-[720px]"
                role="img"
                aria-label="رسم توضيحي ديناميكي يوضح اتجاهات تدفق الهواء البارد والراجع وسحب البخور داخل صحن الكنيسة من 64 دفيوزر"
              >
                <defs>
                  <pattern id="afGridPlan" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path
                      d="M 20 0 L 0 0 0 20"
                      fill="none"
                      stroke="rgba(56,189,248,0.06)"
                      strokeWidth="0.7"
                    />
                  </pattern>
                  <radialGradient id="coolPlumeGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.28" />
                    <stop offset="65%" stopColor="#0284C7" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="warmHeatGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                  </radialGradient>
                  <marker
                    id="arrowSupply"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#38BDF8" />
                  </marker>
                  <marker
                    id="arrowReturn"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#F59E0B" />
                  </marker>
                  <marker
                    id="arrowExhaust"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#34D399" />
                  </marker>
                  <marker
                    id="arrowHot"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#FB7185" />
                  </marker>
                </defs>

                <rect x="0" y="0" width="1060" height="605" fill="url(#afGridPlan)" />

                {/* Exterior Side Yards Labels */}
                <text x="530" y="15" textAnchor="middle" fill="#64748B" fontSize="10.5">
                  الفناء/الردود الجانبي الشرقي (منسوب الأرض 0.00م — الوحدات الأرضية #1 و #3 خارج المبنى)
                </text>
                <text x="530" y="596" textAnchor="middle" fill="#64748B" fontSize="10.5">
                  الفناء/الردود الجانبي الغربي (منسوب الأرض 0.00م — الوحدات الأرضية #2 و #4 خارج المبنى)
                </text>

                {/* Church Concrete Perimeter Walls (40m x 25m) */}
                <rect
                  x="110"
                  y="108"
                  width="810"
                  height="384"
                  fill="#0A121D"
                  stroke="#CBD5E1"
                  strokeWidth="3.5"
                />

                {/* Sealed Windows on all 4 facades */}
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <g key={`af-win-${i}`}>
                    <line x1={132 + i * 96} y1="108" x2={198 + i * 96} y2="108" stroke="#38BDF8" strokeWidth="4" opacity="0.65" />
                    <line x1={132 + i * 96} y1="492" x2={198 + i * 96} y2="492" stroke="#38BDF8" strokeWidth="4" opacity="0.65" />
                  </g>
                ))}

                {/* Iconostasis / Altar Sanctuary (الهيكل) on Left */}
                <rect
                  x="116"
                  y="144"
                  width="88"
                  height="312"
                  fill="rgba(245,158,11,0.08)"
                  stroke="#F59E0B"
                  strokeWidth="1.5"
                  strokeDasharray="5 3"
                />
                <text x="160" y="294" textAnchor="middle" fill="#FDE68A" fontSize="12.5" fontWeight="bold">
                  الهيكل
                </text>
                <text x="160" y="313" textAnchor="middle" fill="#FDE68A" fontSize="9.5">
                  حامل الأيقونات
                </text>

                {/* Incense / Candle Positive-Pressure Exhaust Relief near Sanctuary */}
                <g>
                  <rect x="122" y="156" width="24" height="58" rx="3" fill="rgba(52,211,153,0.18)" stroke="#34D399" strokeWidth="1.4" />
                  <rect x="122" y="386" width="24" height="58" rx="3" fill="rgba(52,211,153,0.18)" stroke="#34D399" strokeWidth="1.4" />
                  <path
                    d="M 204 235 C 175 225, 165 200, 146 185"
                    fill="none"
                    stroke="#34D399"
                    strokeWidth="2"
                    className="svg-flow-exhaust"
                    markerEnd="url(#arrowExhaust)"
                  />
                  <path
                    d="M 204 365 C 175 375, 165 400, 146 415"
                    fill="none"
                    stroke="#34D399"
                    strokeWidth="2"
                    className="svg-flow-exhaust"
                    markerEnd="url(#arrowExhaust)"
                  />
                  <text x="160" y="176" textAnchor="middle" fill="#6EE7B7" fontSize="8.5">
                    سحب بخور
                  </text>
                  <text x="160" y="438" textAnchor="middle" fill="#6EE7B7" fontSize="8.5">
                    سحب بخور
                  </text>
                </g>

                {/* Central Processional Aisle */}
                <rect
                  x="204"
                  y="274"
                  width="704"
                  height="52"
                  fill="rgba(255,255,255,0.025)"
                  stroke="rgba(148,163,184,0.2)"
                  strokeDasharray="6 4"
                />
                <text x="556" y="304" textAnchor="middle" fill="#94A3B8" fontSize="10.5">
                  الممر الأوسط لصحن الكنيسة (دكك خشبية لـ 1,000 مصلّي · تغطية هواء متجانسة 100%)
                </text>

                {/* Main Entrance Air Curtain Blocking Hot 47°C Aswan Outdoor Air */}
                <g>
                  <rect
                    x="906"
                    y="252"
                    width="18"
                    height="96"
                    fill="rgba(56,189,248,0.34)"
                    stroke="#38BDF8"
                    strokeWidth="2"
                  />
                  <line
                    x1="915"
                    y1="256"
                    x2="915"
                    y2="344"
                    stroke="#E0F2FE"
                    strokeWidth="3"
                    className="svg-flow-supply"
                  />
                  {/* Outdoor 47°C Hot Air Arrows deflected by the Air Curtain */}
                  {[268, 300, 332].map((hy) => (
                    <path
                      key={`hot-in-${hy}`}
                      d={`M 1018 ${hy} L 938 ${hy} Q 928 ${hy} 936 ${hy + (hy < 300 ? -16 : 16)}`}
                      fill="none"
                      stroke="#FB7185"
                      strokeWidth="2"
                      className="svg-flow-hot"
                      markerEnd="url(#arrowHot)"
                    />
                  ))}
                  <text x="992" y="242" textAnchor="middle" fill="#FDA4AF" fontSize="9.5" fontWeight="bold">
                    حرارة أسوان ({cfg.ambientLabel})
                  </text>
                  <text x="992" y="366" textAnchor="middle" fill="#7DD3FC" fontSize="9">
                    ستارة الهواء تصد الهواء الساخن
                  </text>
                </g>

                {/* 4 Ground-Mounted Units + Side-Wall Horizontal Ducts + 64 Animated 4-Way Diffusers */}
                {zones.map((z) => {
                  const isActive = cfg.activeUnits.includes(z.id);
                  const isHighlighted = selectedUnit === null || selectedUnit === z.id;
                  const zoneOpacity = !isActive ? 0.24 : isHighlighted ? 1 : 0.35;

                  const trunkY1 = z.yEdge + z.dir * 38;
                  const trunkY2 = z.yEdge + z.dir * 124;
                  const retY = z.yEdge + z.dir * 81;
                  const entrySupplyX = z.unitX + 44;
                  const entryReturnX = z.unitX + 126;

                  return (
                    <g
                      key={`af-zone-${z.id}`}
                      opacity={zoneOpacity}
                      onMouseEnter={() => setSelectedUnit(z.id)}
                      onMouseLeave={() => setSelectedUnit(null)}
                      onClick={() => setSelectedUnit((prev) => (prev === z.id ? null : z.id))}
                      className="cursor-pointer transition-opacity duration-200"
                    >
                      {/* Ground-Mounted 380V T3 Unit OUTSIDE Exterior Wall */}
                      <rect
                        x={z.unitX}
                        y={z.unitY}
                        width="176"
                        height="48"
                        rx="4"
                        fill={isActive ? 'rgba(14,165,233,0.18)' : 'rgba(71,85,105,0.18)'}
                        stroke={isActive ? '#38BDF8' : '#64748B'}
                        strokeWidth="1.8"
                      />
                      <text
                        x={z.unitX + 88}
                        y={z.unitY + 20}
                        textAnchor="middle"
                        fill="#F8FAFC"
                        fontSize="10.5"
                        fontWeight="bold"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {z.shortAr} · {design.nominalUnitTons}TR ({design.coolingHpPerUnit} HP)
                      </text>
                      <text
                        x={z.unitX + 88}
                        y={z.unitY + 36}
                        textAnchor="middle"
                        fill={isActive ? '#7DD3FC' : '#94A3B8'}
                        fontSize="9"
                      >
                        {isActive ? 'وحدة أرضية تعمل · دخول جداري' : 'متوقفة (وضع توفير الطاقة)'}
                      </text>

                      {/* Side-Wall Penetration Risers (Supply + Return) through Exterior Wall Only */}
                      <rect
                        x={entrySupplyX - 10}
                        y={z.side === 'top' ? 70 : 492}
                        width="20"
                        height="42"
                        fill="#0284C7"
                        stroke="#BAE6FD"
                        strokeWidth="1.2"
                      />
                      <rect
                        x={entryReturnX - 9}
                        y={z.side === 'top' ? 70 : 492}
                        width="18"
                        height="42"
                        fill="#B45309"
                        stroke="#FDE68A"
                        strokeWidth="1.2"
                      />

                      {/* Thermal Comfort Plume Overlay inside active zone */}
                      {showThermalOverlay && isActive && (
                        <>
                          <ellipse
                            cx={(z.x0 + z.x1) / 2}
                            cy={(trunkY1 + trunkY2) / 2}
                            rx={(z.x1 - z.x0) * 0.48}
                            ry="68"
                            fill="url(#coolPlumeGrad)"
                          />
                          <ellipse
                            cx={(z.x0 + z.x1) / 2}
                            cy={retY}
                            rx="72"
                            ry="22"
                            fill="url(#warmHeatGrad)"
                          />
                        </>
                      )}

                      {/* Supply Header entering horizontally from Exterior Side Wall */}
                      <path
                        d={`M ${entrySupplyX} ${z.side === 'top' ? 72 : 532} L ${entrySupplyX} ${trunkY2}`}
                        fill="none"
                        stroke="#0284C7"
                        strokeWidth="12"
                        opacity="0.45"
                      />
                      {isActive && (
                        <path
                          d={`M ${entrySupplyX} ${z.side === 'top' ? 74 : 530} L ${entrySupplyX} ${trunkY2}`}
                          fill="none"
                          stroke="#7DD3FC"
                          strokeWidth="2.6"
                          className="svg-flow-supply"
                          markerEnd="url(#arrowSupply)"
                        />
                      )}

                      {/* Twin Slim Supply Trunks + 16 Diffusers (4×4) with Dynamic 4-Way Throw */}
                      {[trunkY1, trunkY2].map((ty, tIdx) => (
                        <g key={`af-trunk-${z.id}-${tIdx}`}>
                          {/* Sheet metal supply trunk outline */}
                          <rect
                            x={z.x0 + 10}
                            y={ty - 6}
                            width={z.x1 - z.x0 - 20}
                            height="12"
                            fill="rgba(56,189,248,0.18)"
                            stroke="#38BDF8"
                            strokeWidth="1"
                          />
                          {/* Animated supply flow moving left & right from side-entry feeder */}
                          {isActive && (
                            <>
                              <path
                                d={`M ${entrySupplyX} ${ty} L ${z.x0 + 18} ${ty}`}
                                fill="none"
                                stroke="#BAE6FD"
                                strokeWidth="2"
                                className="svg-flow-supply"
                              />
                              <path
                                d={`M ${entrySupplyX} ${ty} L ${z.x1 - 18} ${ty}`}
                                fill="none"
                                stroke="#BAE6FD"
                                strokeWidth="2"
                                className="svg-flow-supply"
                              />
                            </>
                          )}

                          {/* 4 Columns × 2 Diffusers = 8 Diffusers per trunk (16 per unit, 64 total!) */}
                          {[0, 1, 2, 3].map((col) => {
                            const dx = z.x0 + 38 + col * ((z.x1 - z.x0 - 76) / 3);
                            return [-18, 18].map((dyOff, dSubIdx) => {
                              const cy = ty + dyOff;
                              return (
                                <g key={`af-diff-${z.id}-${tIdx}-${col}-${dSubIdx}`}>
                                  {/* Animated radial Coanda throw wave */}
                                  {isActive && (
                                    <circle
                                      cx={dx}
                                      cy={cy}
                                      r="16"
                                      fill="none"
                                      stroke="#38BDF8"
                                      strokeWidth="1.2"
                                      className="svg-diffuser-pulse"
                                      style={{ animationDelay: `${((col + dSubIdx) * 0.28).toFixed(2)}s` }}
                                    />
                                  )}
                                  {/* 4-Way Radial Throw Arrows (N, S, E, W) */}
                                  {isActive && (
                                    <g stroke="#38BDF8" strokeWidth="1.35" className="svg-flow-supply">
                                      <line x1={dx} y1={cy - 5} x2={dx} y2={cy - 17} />
                                      <line x1={dx} y1={cy + 5} x2={dx} y2={cy + 17} />
                                      <line x1={dx - 5} y1={cy} x2={dx - 17} y2={cy} />
                                      <line x1={dx + 5} y1={cy} x2={dx + 17} y2={cy} />
                                    </g>
                                  )}
                                  {/* 60x60cm 4-Way Diffuser Square */}
                                  <rect
                                    x={dx - 5.5}
                                    y={cy - 5.5}
                                    width="11"
                                    height="11"
                                    fill={isActive ? '#0C4A6E' : '#1E293B'}
                                    stroke="#E0F2FE"
                                    strokeWidth="1"
                                  />
                                  <rect
                                    x={dx - 2}
                                    y={cy - 2}
                                    width="4"
                                    height="4"
                                    fill="none"
                                    stroke="#7DD3FC"
                                    strokeWidth="0.7"
                                  />
                                </g>
                              );
                            });
                          })}
                        </g>
                      ))}

                      {/* Warm Return Air Trunk + Animated Amber Return Streamlines back to Ground Unit */}
                      <rect
                        x={z.x0 + 36}
                        y={retY - 6}
                        width={z.x1 - z.x0 - 72}
                        height="12"
                        fill="rgba(245,158,11,0.16)"
                        stroke="#F59E0B"
                        strokeWidth="1.1"
                        strokeDasharray="4 2"
                      />
                      {isActive && (
                        <>
                          {/* Warm air pulling inward along return trunk and exiting to exterior unit */}
                          <path
                            d={`M ${z.x0 + 44} ${retY} L ${entryReturnX} ${retY} L ${entryReturnX} ${z.side === 'top' ? 76 : 528}`}
                            fill="none"
                            stroke="#F59E0B"
                            strokeWidth="2.2"
                            className="svg-flow-return"
                            markerEnd="url(#arrowReturn)"
                          />
                          <path
                            d={`M ${z.x1 - 44} ${retY} L ${entryReturnX} ${retY}`}
                            fill="none"
                            stroke="#F59E0B"
                            strokeWidth="2.2"
                            className="svg-flow-return"
                          />
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            ) : (
              /* DYNAMIC CROSS-SECTION VIEW: 25m Width × 4m Church + 2nd Floor Above + Ground Units Outside */
              <svg
                viewBox="0 0 1060 560"
                className="w-full h-auto min-w-[720px]"
                role="img"
                aria-label="قطاع عرضي ديناميكي لتدفق الهواء وتأثير كواندا داخل صحن الكنيسة أسفل الدور الثاني مع الوحدات الأرضية الجانبية"
              >
                <defs>
                  <pattern id="afGridSec" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path
                      d="M 20 0 L 0 0 0 20"
                      fill="none"
                      stroke="rgba(56,189,248,0.06)"
                      strokeWidth="0.7"
                    />
                  </pattern>
                  <linearGradient id="coandaCoolLayer" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.22" />
                    <stop offset="55%" stopColor="#0EA5E9" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.06" />
                  </linearGradient>
                  <marker
                    id="secArrowBlue"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#38BDF8" />
                  </marker>
                  <marker
                    id="secArrowAmber"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#F59E0B" />
                  </marker>
                  <marker
                    id="secArrowHot"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#FB7185" />
                  </marker>
                </defs>

                <rect x="0" y="0" width="1060" height="560" fill="url(#afGridSec)" />

                {/* Ground Courtyard Datum Line (0.00 m) */}
                <line x1="26" y1="448" x2="220" y2="448" stroke="#94A3B8" strokeWidth="2.5" />
                <line x1="840" y1="448" x2="1034" y2="448" stroke="#94A3B8" strokeWidth="2.5" />

                {/* 2ND UPPER FLOOR (+7.30m to +10.60m) + EMPTY FLAT ROOF */}
                <rect x="220" y="18" width="620" height="62" fill="rgba(245,158,11,0.05)" stroke="#94A3B8" strokeWidth="1.6" />
                <text x="530" y="53" textAnchor="middle" fill="#FDE68A" fontSize="12" fontWeight="bold">
                  الدور الثاني علوي (سطح فارغ تماماً بدون أي ماكينات)
                </text>

                {/* 1ST UPPER FLOOR (+4.00m to +7.30m) DIRECTLY ABOVE GROUND-FLOOR CHURCH */}
                <rect x="220" y="80" width="620" height="74" fill="rgba(245,158,11,0.08)" stroke="#CBD5E1" strokeWidth="1.8" />
                <rect x="214" y="148" width="632" height="12" fill="#475569" stroke="#CBD5E1" />
                <text x="530" y="114" textAnchor="middle" fill="#FDE68A" fontSize="12.5" fontWeight="bold">
                  الدور الأول علوي (فوق الكنيسة مباشرة — سليم 100% بدون أي فتحات دكت)
                </text>
                <text x="530" y="135" textAnchor="middle" fill="#CBD5E1" fontSize="9.8">
                  يعزل الدوران العلويان شمس أسوان عن سقف الكنيسة · دخول الدكت من حوائط الدور الأرضي فقط
                </text>

                {/* GROUND FLOOR CHURCH SANCTUARY (25m Width × 4.00m Height, 0.00m to +4.00m) */}
                <rect x="220" y="160" width="620" height="288" fill="#0B131E" stroke="#E2E8F0" strokeWidth="2.5" />
                {showThermalOverlay && (
                  <rect x="223" y="210" width="614" height="236" fill="url(#coandaCoolLayer)" />
                )}

                {/* Suspended Gypsum Ceiling at 3.30m clear (40cm plenum above) */}
                <line x1="224" y1="210" x2="836" y2="210" stroke="#E2E8F0" strokeWidth="2.5" strokeDasharray="8 4" />

                {/* Slim Side-Entry Horizontal Ducts tucked into 40cm Plenum */}
                <rect x="224" y="168" width="286" height="32" fill="rgba(56,189,248,0.22)" stroke="#38BDF8" strokeWidth="1.5" />
                <rect x="550" y="168" width="286" height="32" fill="rgba(56,189,248,0.22)" stroke="#38BDF8" strokeWidth="1.5" />
                <text x="367" y="188" textAnchor="middle" fill="#E0F2FE" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                  دكت دخول جانبي غرب (ارتفاع ≤ {design.maxDuctHeightCm} سم)
                </text>
                <text x="693" y="188" textAnchor="middle" fill="#E0F2FE" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                  دكت دخول جانبي شرق (ارتفاع ≤ {design.maxDuctHeightCm} سم)
                </text>

                {/* Animated Supply Air moving horizontally from BOTH exterior walls toward center */}
                <path
                  d="M 190 184 L 485 184"
                  fill="none"
                  stroke="#BAE6FD"
                  strokeWidth="2.8"
                  className="svg-flow-supply"
                  markerEnd="url(#secArrowBlue)"
                />
                <path
                  d="M 870 184 L 575 184"
                  fill="none"
                  stroke="#BAE6FD"
                  strokeWidth="2.8"
                  className="svg-flow-supply"
                  markerEnd="url(#secArrowBlue)"
                />

                {/* 4 Ceiling Diffusers with Curved Coanda Effect Jets */}
                {[296, 440, 620, 764].map((dx, i) => (
                  <g key={`coanda-diff-${i}`}>
                    <rect x={dx - 18} y="207" width="36" height="7" fill="#38BDF8" />
                    <path
                      d={`M ${dx - 10} 216 C ${dx - 52} 220, ${dx - 64} 264, ${dx - 46} 366`}
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="2.2"
                      className="svg-flow-supply"
                      markerEnd="url(#secArrowBlue)"
                    />
                    <path
                      d={`M ${dx + 10} 216 C ${dx + 52} 220, ${dx + 64} 264, ${dx + 46} 366`}
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="2.2"
                      className="svg-flow-supply"
                      markerEnd="url(#secArrowBlue)"
                    />
                  </g>
                ))}

                {/* Central & Side Rising Warm Return Air Convection Arcs */}
                <rect x="510" y="204" width="40" height="8" fill="#F59E0B" />
                <text x="530" y="193" textAnchor="middle" fill="#FDE68A" fontSize="9">
                  راجع مركزي
                </text>
                {[368, 530, 692].map((rx, idx) => (
                  <path
                    key={`ret-up-${idx}`}
                    d={`M ${rx} 392 C ${rx + (idx === 1 ? 0 : idx === 0 ? 22 : -22)} 326, ${530 + (idx - 1) * 18} 274, 530 218`}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="2"
                    className="svg-flow-return"
                    markerEnd="url(#secArrowAmber)"
                  />
                ))}

                {/* Occupied Zone Band & Church Pews Silhouette (Ground-Floor Church) */}
                <line x1="224" y1="358" x2="836" y2="358" stroke="rgba(56,189,248,0.35)" strokeDasharray="4 4" />
                <text x="530" y="350" textAnchor="middle" fill="#7DD3FC" fontSize="9.8">
                  الدور الأرضي: صحن الكنيسة · درجة حرارة {cfg.targetTempC} · سرعة هادئة {cfg.velocityMs} بدون تيار مباشر
                </text>
                {[256, 316, 376, 436, 584, 644, 704, 764].map((px) => (
                  <g key={`pew-sec-${px}`}>
                    <rect x={px} y="416" width="38" height="28" rx="2" fill="#78350F" stroke="#B45309" strokeWidth="1" />
                    <circle cx={px + 19} cy="400" r="7" fill="#94A3B8" opacity="0.65" />
                  </g>
                ))}
                <rect x="502" y="438" width="56" height="8" fill="#991B1B" />

                {/* BASEMENT BELOW GROUND-FLOOR CHURCH (-3.20m) */}
                <rect x="220" y="448" width="620" height="92" fill="rgba(71,85,105,0.22)" stroke="#64748B" strokeWidth="2" strokeDasharray="6 3" />
                <text x="530" y="492" textAnchor="middle" fill="#94A3B8" fontSize="13" fontWeight="bold">
                  البدروم (تحت الأرض أسفل الكنيسة مباشرة · -3.20م)
                </text>
                <text x="530" y="514" textAnchor="middle" fill="#64748B" fontSize="9.8">
                  منسوب الحوش الأرضي يقع عند سقف البدروم (0.00م) مما يجعل صواعد الوحدات الأرضية قصيرة جداً (~3.5م)
                </text>

                {/* LEFT & RIGHT GROUND-MOUNTED UNITS AT GRADE (0.00m) + SHORT VERTICAL CLAD SIDE RISERS */}
                {[
                  { ux: 38, rx: 174, side: 'left' as const, label: 'وحدتان أرضيتان غرب' },
                  { ux: 902, rx: 856, side: 'right' as const, label: 'وحدتان أرضيتان شرق' },
                ].map((u) => (
                  <g key={`sec-grd-${u.side}`}>
                    {/* Sun Shade Canopy above ground unit */}
                    <path d={`M ${u.ux - 10} 330 L ${u.ux + 130} 330`} stroke="#F59E0B" strokeWidth="3" />
                    {/* Hot condenser air blowing upward outdoors */}
                    <path
                      d={`M ${u.ux + 40} 356 L ${u.ux + 40} 296`}
                      fill="none"
                      stroke="#FB7185"
                      strokeWidth="2"
                      className="svg-flow-hot"
                      markerEnd="url(#secArrowHot)"
                    />
                    <path
                      d={`M ${u.ux + 80} 356 L ${u.ux + 80} 296`}
                      fill="none"
                      stroke="#FB7185"
                      strokeWidth="2"
                      className="svg-flow-hot"
                      markerEnd="url(#secArrowHot)"
                    />
                    <text x={u.ux + 60} y="286" textAnchor="middle" fill="#FDA4AF" fontSize="8.5">
                      طرد حرارة للخارج
                    </text>

                    {/* Raised Anti-Vibration Concrete Pad on Courtyard Grade */}
                    <rect x={u.ux - 6} y="430" width="132" height="18" fill="#64748B" stroke="#CBD5E1" />
                    {/* Ground-Mounted 380V T3 Unit Body */}
                    <rect x={u.ux} y="356" width="120" height="74" rx="4" fill="rgba(14,165,233,0.22)" stroke="#38BDF8" strokeWidth="2" />
                    <text x={u.ux + 60} y="381" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">
                      {u.label}
                    </text>
                    <text x={u.ux + 60} y="399" textAnchor="middle" fill="#7DD3FC" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                      {design.nominalUnitTons}TR · {design.coolingHpPerUnit} HP
                    </text>
                    <text x={u.ux + 60} y="416" textAnchor="middle" fill="#CBD5E1" fontSize="8.5">
                      380V T3 · صيانة أرضية
                    </text>

                    {/* Short Exterior Aluminum-Clad Vertical Riser (~3.5m ONLY!) */}
                    <rect x={u.rx} y="170" width="30" height="236" fill="rgba(56,189,248,0.22)" stroke="#38BDF8" strokeWidth="1.6" />
                    <path
                      d={
                        u.side === 'left'
                          ? `M ${u.ux + 120} 390 L ${u.rx + 15} 390 L ${u.rx + 15} 184 L 222 184`
                          : `M ${u.ux} 390 L ${u.rx + 15} 390 L ${u.rx + 15} 184 L 838 184`
                      }
                      fill="none"
                      stroke="#7DD3FC"
                      strokeWidth="2.8"
                      className="svg-flow-supply"
                      markerEnd="url(#secArrowBlue)"
                    />
                    <text
                      x={u.rx + 15}
                      y="286"
                      textAnchor="middle"
                      fill="#E0F2FE"
                      fontSize="9"
                      transform={`rotate(-90 ${u.rx + 15} 286)`}
                    >
                      صاعد قصير 3.5م (دخول أرضي)
                    </text>
                  </g>
                ))}
              </svg>
            )}
          </div>

          {/* Live Airflow Legend & Telemetry Strip */}
          <div className="px-5 py-3.5 bg-[#0C141F] border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-0.5 bg-sky-400" />
                هواء بارد مُغذي (Supply Coanda)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-0.5 bg-amber-400" />
                هواء راجع دافئ (Return)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-0.5 bg-emerald-400" />
                سحب البخور والشموع (+18% ضغط موجب)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-0.5 bg-rose-400" />
                حرارة خارجية مطرودة (47°C)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-5 font-mono tabular-nums text-slate-200">
              <span>
                التشغيل الحالي:{' '}
                <strong className="text-sky-300">
                  {activeTons} TR ({activeCoolingHp} HP)
                </strong>
              </span>
              <span>
                التدفق:{' '}
                <strong className="text-slate-50">{activeCfm.toLocaleString('en-US')} CFM</strong>
              </span>
              <span>
                مدى الرمي (Throw): <strong className="text-sky-300">{cfg.throwM}</strong>
              </span>
              <span>
                سرعة الهواء بالمصلين: <strong className="text-emerald-300">{cfg.velocityMs}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Direct Engineering Answer: Cooling Horsepower Breakdown + Best 3 Ground Unit Placements (No Rooftop!) */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Card 1: Clear Answer to "الوحدة كام حصان تبريدي؟" */}
          <div className="lg:col-span-4 bg-[#111923] border border-sky-400/30 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-sky-400 mb-1.5">
                تحويل القدرة للسوق المصري (طن تبريد ↔ حصان تبريدي)
              </p>
              <h3 className="text-lg font-bold text-slate-50">
                الوحدة الواحدة كم حصان تبريدي؟
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mt-2">
                في السوق المصري للتكييف، كل <strong className="text-white">1 طن تبريد (12,000 BTU/h) = 1.5 حصان تبريدي</strong> (حيث الحصان التبريدي = 8,000 BTU/h). وبناءً على الحسابات الحالية لكنيسة 1,000 م² في أسوان:
              </p>

              <div className="mt-4 space-y-2.5 text-sm tabular-nums">
                <div className="flex items-center justify-between py-2 border-b border-white/8">
                  <span className="text-slate-400 text-xs">صافي الحمل المطلوب للكنيسة</span>
                  <span className="font-mono font-bold text-slate-100">
                    {design.requiredCoolingHp.toFixed(0)} حصان ({design.requiredTons.toFixed(1)} طن)
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/8">
                  <span className="text-slate-400 text-xs">قدرة الوحدة الواحدة (من 4 وحدات)</span>
                  <span className="font-mono font-bold text-sky-300">
                    {design.coolingHpPerUnit} حصان تبريدي ({design.nominalUnitTons} طن)
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/8">
                  <span className="text-slate-400 text-xs">إجمالي القدرة المركّبة (4 وحدات)</span>
                  <span className="font-mono font-bold text-amber-300">
                    {design.totalCoolingHp} حصان تبريدي ({design.installedTotalTons} طن)
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-400 text-xs">بديل 8 وحدات سبليت دكت مخفي</span>
                  <span className="font-mono text-xs font-semibold text-emerald-300">
                    8 × {splitUnitCoolingHp} حصان ({splitUnitTons} طن/وحدة)
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/8 text-[11px] text-slate-400 leading-relaxed">
              ملاحظة كهربائية: القدرة الحصانية الكهربائية الفعلية لضواغط الوحدة عند حرارة أسوان 47°C تعادل{' '}
              <span className="font-mono text-slate-200">{design.electricalHpPerUnit.toFixed(0)} HP</span> كهربائي (
              <span className="font-mono text-slate-200">{design.electrical.runningKwPerUnit.toFixed(1)} kW</span>).
            </div>
          </div>

          {/* Card 2: Best 3 Ground-Level Placements (NO Rooftop Units, NO Upper-Floor Slab Cuts!) */}
          <div className="lg:col-span-8 bg-[#111923] border border-white/10 rounded-xl p-6">
            <p className="text-xs font-medium text-amber-400 mb-1.5">
              حل مشكلة وجود دور أول وثاني علوي فوق الكنيسة (بدون أي وحدة على السطح وبدون تكسير بالسقف)
            </p>
            <h3 className="text-lg font-bold text-slate-50 mb-4">
              أفضل 3 أوضاع لمكان الوحدات الأرضية وشكل الدكتات المناسب للكنيسة
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#0D1520] border border-sky-400/40 rounded-lg p-4 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-sky-400 mb-1">
                    الوضع 1 · الأفضل لو يوجد ردود جانبي ≥ 2.5م
                  </div>
                  <h4 className="text-sm font-bold text-slate-100">
                    4 وحدات باكدج أرضية بالجانبين + دخول دكت جداري أفقي
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed mt-2">
                    تُوضع وحدتان شرقاً ووحدتان غرباً على الأرض؛ يصعد دكت كلادينج معزول <strong>3.5م فقط</strong> بمحاذاة جدار الدور الأرضي ويدخل <strong>أفقياً من الحائط الجانبي</strong> تحت كمرة سقف الكنيسة. لا توجد أي فتحة في سقف الأدوار العلوية نهائياً.
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/8 text-[11px] font-mono text-sky-300 tabular-nums">
                  4 × {design.coolingHpPerUnit} حصان ({design.nominalUnitTons} طن) · دكت ≤ {design.maxDuctHeightCm} سم
                </div>
              </div>

              <div className="bg-[#0D1520] border border-white/10 rounded-lg p-4 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-emerald-400 mb-1">
                    الوضع 2 · لو لا تريد أي دكت خارجي على الواجهة!
                  </div>
                  <h4 className="text-sm font-bold text-slate-100">
                    8 وحدات سبليت دكت مركزي (مكثفات أرضية + مواسير نحاس فقط)
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed mt-2">
                    تُوضع جميع الوحدات الخارجية (الكباسات) على الأرض في الحوش أو بجانب السور، وتصعد <strong>مواسير نحاس رفيعة فقط</strong> داخل الجدران إلى 8 وحدات داخلية مخفية فوق السقف المستعار بدكتات قصيرة جداً (ارتفاع 30 سم فقط).
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/8 text-[11px] font-mono text-emerald-300 tabular-nums">
                  8 × {splitUnitCoolingHp} حصان ({splitUnitTons} طن) · صفر دكت خارجي
                </div>
              </div>

              <div className="bg-[#0D1520] border border-white/10 rounded-lg p-4 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-amber-400 mb-1">
                    الوضع 3 · للكاتدرائيات والمجمعات الكبرى
                  </div>
                  <h4 className="text-sm font-bold text-slate-100">
                    تشيلر أرضي بالخارج + مواسير مياه 4" + وحدات مناولة جانبية
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed mt-2">
                    يُوضع التشيلر بالكامل في الحوش الأرضي، وتمر <strong>مواسير مياه مثلجة معزولة (قطر 4 بوصة فقط)</strong> لتغذية 4 وحدات مناولة (AHU) بغرف خدمات جانبية بالدور الأرضي أو البدروم بدون أي صواعد صاج خارجية.
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/8 text-[11px] font-mono text-amber-300 tabular-nums">
                  تشيلر {design.totalCoolingHp} حصان ({design.installedTotalTons} طن) · هدوء فائق
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
