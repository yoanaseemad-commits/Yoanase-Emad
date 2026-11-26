import { useState } from 'react';
import { HvacDesignResult } from '../engine/hvacCalculator';
import AcousticNoiseEstimator from './AcousticNoiseEstimator';

interface DuctSizingSectionProps {
  design: HvacDesignResult;
}

const DUCT_MATERIAL_TYPES = [
  {
    id: 'gi',
    titleAr: '1. صاج مجلفن ساخن + كلادينج خارجي (Galvanized Steel GI - G90)',
    subtitleAr: 'المعتمد الأساسي للصواعد الخارجية والخطوط الرئيسية في مناخ أسوان',
    specsAr:
      'يُصنع بسمك Gauge 18 إلى 24 (1.2 مم للصاعد الخارجي إلى 0.6 مم بالنهايات) وفق كود SMACNA مع قفل بيتسبرج وفلانشات محكمة. تُعزل الصواعد الخارجية من الوحدات الأرضية بصوف زجاجي 50 مم وتُغلف بصاج ألومنيوم كلادينج 0.7 مم لمقاومة شمس أسوان وأتربتها.',
    usageAr: 'الصواعد الرأسية الخارجية من الوحدات الأرضية والخطوط الرئيسية فوق السقف المستعار.',
  },
  {
    id: 'pir',
    titleAr: '2. دكت معزول مسبقاً (Pre-Insulated PIR / Phenolic)',
    subtitleAr: 'بديل خفيف الوزن وسريع التركيب داخل صحن الكنيسة',
    specsAr:
      'ألواح فوم بولي أيزوسيانورات بسمك 20–30 مم مغلفة بطبقتي ألومنيوم مقوى (كثافة 50 كجم/م³). يتميز بوزن خفيف جداً على سقف الكنيسة وعزل حراري فائق، مع اشتراط أن تكون الصواعد الخارجية من الصاج المجلفن المغلف كلادينج.',
    usageAr: 'بديل ممتاز للخطوط الداخلية فقط لتقليل الأحمال المعلقة وسرعة التنفيذ.',
  },
  {
    id: 'acoustic',
    titleAr: '3. دكت راجع مبطن صوتياً (Acoustic Lined Duct)',
    subtitleAr: 'شرط أساسي لهدوء الكنيسة ووضوح العظات والألحان (< 35 NC)',
    specsAr:
      'تبطين داخلي لأول 5 أمتار بعد خروج الهواء من الوحدات الأرضية ولخطوط الراجع بصوف زجاجي أسود مقاوم للتفتت (Acoustic Liner 25 مم، كثافة 48 كجم/م³) مع وصلة قماش مرنة (Canvas Connector) لمنع انتقال أي صوت أو اهتزاز لصحن الكنيسة.',
    usageAr: 'مخارج الوحدات الأرضية وخطوط الراجع المركزية في المناطق الأربع.',
  },
  {
    id: 'flex-diffusers',
    titleAr: '4. وصلات فلكسبل معزولة ومخارج الهواء (Diffusers)',
    subtitleAr: '64 مخرج رباعي 60×60 سم + مخارج سلوت طولية (Linear Slot)',
    specsAr:
      'تُربط التفريعات بصناديق توزيع (Plenum Boxes) عبر دكت مرن معزول (Insulated Flexible Duct Ø12"–14") بطول أقصى 1.5 متر لمنع هبوط الضغط، وتنتهي بمخارج ألومنيوم أبيض مع دامبر VCD لضبط توزيع الهواء بهدوء فوق الدكك الخشبية.',
    usageAr: 'توزيع هواء بارد متجانس على 1,000 مصلّي بدون تيارات مزعجة على الرؤوس.',
  },
];

export default function DuctSizingSection({ design }: DuctSizingSectionProps) {
  const [activeZone, setActiveZone] = useState<number | null>(null);

  const mainTrunk = design.ducts.find((d) => d.id === 'twin-trunk');
  const returnTrunk = design.ducts.find((d) => d.id === 'return-trunk');

  const zones = [
    { id: 1, x0: 120, x1: 445, yEdge: 78, dir: 1, unitX: 160, unitY: 16, side: 'top' as const, label: 'منطقة 1 (شرق أمامي)' },
    { id: 2, x0: 120, x1: 445, yEdge: 462, dir: -1, unitX: 160, unitY: 486, side: 'bottom' as const, label: 'منطقة 2 (غرب أمامي)' },
    { id: 3, x0: 460, x1: 775, yEdge: 78, dir: 1, unitX: 500, unitY: 16, side: 'top' as const, label: 'منطقة 3 (شرق خلفي)' },
    { id: 4, x0: 460, x1: 775, yEdge: 462, dir: -1, unitX: 500, unitY: 486, side: 'bottom' as const, label: 'منطقة 4 (غرب خلفي)' },
  ];

  return (
    <section id="ducts" className="py-16 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mb-10">
          <p className="text-xs font-medium text-sky-400 mb-2">
            تصميم مجاري الهواء بطريقة الاحتكاك المتساوي · Equal Friction Method (0.08–0.10 in.wg/100ft)
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-50">
            أنواع الدكتات ومقاساتها وتنسيق ارتفاع 4 متر بالدور الأرضي (تحت الأول والثاني علوي)
          </h2>
        </div>

        {/* Part A: Types of Air Ducts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
          {DUCT_MATERIAL_TYPES.map((ductType) => (
            <div
              key={ductType.id}
              className="bg-[#111923] border border-white/10 rounded-xl p-5 flex flex-col justify-between"
            >
              <div>
                <h3 className="text-base font-bold text-slate-100">{ductType.titleAr}</h3>
                <p className="text-xs text-sky-400 mt-1">{ductType.subtitleAr}</p>
                <p className="text-sm text-slate-300 leading-relaxed mt-3">{ductType.specsAr}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/8 text-xs text-slate-400">
                <span className="text-slate-200 font-medium">الاستخدام: </span>
                {ductType.usageAr}
              </div>
            </div>
          ))}
        </div>

        {/* Part B: 2D AutoCAD Top-Down Ducting Blueprint (Exterior Ground Units -> Side-Wall Horizontal Entry) + Vertical 4.00m Clearance Cross-Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10 items-stretch">
          <div className="lg:col-span-8 bg-[#0A1018] border border-white/12 rounded-xl p-5 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  توزيع الدكتات بدخول جداري جانبي من الوحدات الأرضية (صفر فتحات في سقف الأدوار العلوية)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                  4 وحدات أرضية خارجية ({design.nominalUnitTons} طن = {design.coolingHpPerUnit} حصان تبريدي/وحدة ·{' '}
                  {design.diffusersPerUnit} دفيوزر/منطقة = {design.totalDiffusers} مخرج هواء)
                </p>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-1.5 bg-sky-400 rounded-xs" />
                  تغذية (Supply)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-1.5 bg-amber-400 rounded-xs" />
                  راجع (Return)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 border border-sky-200 bg-sky-500/20" />
                  دفيوزر 60×60
                </span>
              </div>
            </div>

            <div className="w-full overflow-x-auto flex-1 flex items-center">
              <svg
                viewBox="0 0 840 540"
                className="w-full h-auto min-w-[560px]"
                role="img"
                aria-label="مخطط أوتوكاد أفقي لتوزيع دكتات التكييف المركزي من الوحدات الأرضية الخارجية عبر الجدران الجانبية لصحن الكنيسة"
              >
                <defs>
                  <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path
                      d="M 20 0 L 0 0 0 20"
                      fill="none"
                      stroke="rgba(56,189,248,0.08)"
                      strokeWidth="0.7"
                    />
                  </pattern>
                </defs>
                <rect x="20" y="10" width="800" height="520" fill="url(#cadGrid)" />

                <text
                  x="824"
                  y="270"
                  textAnchor="middle"
                  fill="#94A3B8"
                  fontSize="11"
                  fontFamily="JetBrains Mono, monospace"
                  transform="rotate(90 824 270)"
                >
                  Width = 25.00 m (5 Bays × 5.0 m)
                </text>

                {/* Church Perimeter Concrete Walls (40m x 25m) */}
                <rect
                  x="40"
                  y="78"
                  width="760"
                  height="384"
                  fill="rgba(15,23,34,0.6)"
                  stroke="#CBD5E1"
                  strokeWidth="3.5"
                />
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <g key={`win-tb-${i}`}>
                    <line
                      x1={56 + i * 94}
                      y1="78"
                      x2={122 + i * 94}
                      y2="78"
                      stroke="#38BDF8"
                      strokeWidth="4"
                    />
                    <line
                      x1={56 + i * 94}
                      y1="462"
                      x2={122 + i * 94}
                      y2="462"
                      stroke="#38BDF8"
                      strokeWidth="4"
                    />
                  </g>
                ))}
                {[0, 1, 2, 3].map((i) => (
                  <g key={`win-lr-${i}`}>
                    <line
                      x1="40"
                      y1={96 + i * 92}
                      x2="40"
                      y2={158 + i * 92}
                      stroke="#38BDF8"
                      strokeWidth="4"
                    />
                    {i !== 1 && i !== 2 && (
                      <line
                        x1="800"
                        y1={96 + i * 92}
                        x2="800"
                        y2={158 + i * 92}
                        stroke="#38BDF8"
                        strokeWidth="4"
                      />
                    )}
                  </g>
                ))}

                {/* Sanctuary / Iconostasis on Left */}
                <rect
                  x="48"
                  y="128"
                  width="64"
                  height="284"
                  fill="rgba(245, 158, 11, 0.12)"
                  stroke="#F59E0B"
                  strokeWidth="1.2"
                  strokeDasharray="4 3"
                />
                <text x="80" y="274" textAnchor="middle" fill="#FDE68A" fontSize="11">
                  الهيكل
                </text>

                {/* Entrance + Air Curtain on Right */}
                <rect
                  x="788"
                  y="222"
                  width="18"
                  height="96"
                  fill="rgba(56, 189, 248, 0.25)"
                  stroke="#38BDF8"
                  strokeWidth="1.5"
                />
                <text
                  x="772"
                  y="270"
                  textAnchor="middle"
                  fill="#7DD3FC"
                  fontSize="10"
                  transform="rotate(-90 772 270)"
                >
                  المدخل + ستارة هواء
                </text>

                {/* 4 Ground-Mounted Exterior Units + Horizontal Side-Wall Entry Ductwork Zones */}
                {zones.map((z) => {
                  const isHighlighted = activeZone === null || activeZone === z.id;
                  const trunkY1 = z.yEdge + z.dir * 38;
                  const trunkY2 = z.yEdge + z.dir * 124;
                  const retY = z.yEdge + z.dir * 81;
                  const supplyEntryX = z.unitX + 46;
                  const returnEntryX = z.unitX + 124;

                  return (
                    <g
                      key={z.id}
                      opacity={isHighlighted ? 1 : 0.28}
                      onMouseEnter={() => setActiveZone(z.id)}
                      onMouseLeave={() => setActiveZone(null)}
                      className="cursor-pointer transition-opacity"
                    >
                      {/* Exterior Ground-Mounted Unit OUTSIDE the building wall */}
                      <rect
                        x={z.unitX}
                        y={z.unitY}
                        width="170"
                        height="38"
                        rx="3"
                        fill="rgba(14, 165, 233, 0.18)"
                        stroke="#38BDF8"
                        strokeWidth="1.6"
                      />
                      <text
                        x={z.unitX + 85}
                        y={z.unitY + 17}
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        GND#{z.id} · {design.nominalUnitTons}TR ({design.coolingHpPerUnit} HP)
                      </text>
                      <text
                        x={z.unitX + 85}
                        y={z.unitY + 31}
                        textAnchor="middle"
                        fill="#94A3B8"
                        fontSize="8.5"
                      >
                        وحدة أرضية خارجية · دخول جانبي
                      </text>

                      {/* Side-Wall Supply & Return Riser Sleeves penetrating exterior wall only */}
                      <rect
                        x={supplyEntryX - 8}
                        y={z.side === 'top' ? 54 : 460}
                        width="16"
                        height="26"
                        fill="#0284C7"
                        stroke="#BAE6FD"
                        strokeWidth="1.1"
                      />
                      <rect
                        x={returnEntryX - 7}
                        y={z.side === 'top' ? 54 : 460}
                        width="14"
                        height="26"
                        fill="#B45309"
                        stroke="#FDE68A"
                        strokeWidth="1.1"
                      />

                      {/* Horizontal Supply Feeder from Side-Wall Sleeve */}
                      <line
                        x1={supplyEntryX}
                        y1={z.yEdge}
                        x2={supplyEntryX}
                        y2={trunkY2}
                        stroke="#38BDF8"
                        strokeWidth="8"
                      />

                      {/* Return Feeder exiting to Side-Wall Return Sleeve */}
                      <line
                        x1={returnEntryX}
                        y1={z.yEdge}
                        x2={returnEntryX}
                        y2={retY}
                        stroke="#F59E0B"
                        strokeWidth="6"
                      />
                      <rect
                        x={z.x0 + 34}
                        y={retY - 7}
                        width={z.x1 - z.x0 - 68}
                        height="14"
                        fill="rgba(245, 158, 11, 0.24)"
                        stroke="#F59E0B"
                        strokeWidth="1.2"
                      />

                      {/* Twin Slim Supply Trunks + 16 Diffusers */}
                      {[trunkY1, trunkY2].map((ty, tIdx) => (
                        <g key={`trunk-${z.id}-${tIdx}`}>
                          <rect
                            x={z.x0 + 12}
                            y={ty - 7}
                            width={z.x1 - z.x0 - 24}
                            height="14"
                            fill="rgba(56, 189, 248, 0.3)"
                            stroke="#38BDF8"
                            strokeWidth="1.3"
                          />
                          {[0, 1, 2, 3].map((dIdx) => {
                            const dx = z.x0 + 38 + dIdx * ((z.x1 - z.x0 - 76) / 3);
                            return (
                              <g key={`diff-${z.id}-${tIdx}-${dIdx}`}>
                                <rect
                                  x={dx - 6}
                                  y={ty - 21}
                                  width="12"
                                  height="12"
                                  fill="rgba(186,230,253,0.22)"
                                  stroke="#E0F2FE"
                                  strokeWidth="1"
                                />
                                <rect
                                  x={dx - 6}
                                  y={ty + 9}
                                  width="12"
                                  height="12"
                                  fill="rgba(186,230,253,0.22)"
                                  stroke="#E0F2FE"
                                  strokeWidth="1"
                                />
                              </g>
                            );
                          })}
                        </g>
                      ))}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Vertical 4.00m Ceiling Clearance Cross-Section Diagram */}
          <div className="lg:col-span-4 bg-[#111923] border border-white/10 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                قطاع رأسي لتنسيق ارتفاع 4.00 متر
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                لماذا قسّمنا القدرة على 4 وحدات بدل وحدة واحدة؟ للحفاظ على أقصى ارتفاع للدكت عند{' '}
                <span className="font-mono text-sky-300">{design.maxDuctHeightCm} سم</span> وترك
                ارتفاع صافي فخم لصحن الكنيسة.
              </p>

              {/* Precision Cross-Section SVG */}
              <div className="mt-5 bg-[#0A1018] border border-white/10 rounded-lg p-4">
                <svg
                  viewBox="0 0 300 280"
                  className="w-full h-auto"
                  role="img"
                  aria-label="قطاع رأسي يوضح ارتفاع السقف الخرساني 4 متر بالدور الأرضي تحت الأول والثاني علوي وفراغ الدكت والارتفاع الصافي 3.30 متر"
                >
                  {/* Concrete Slab between Ground-Floor Church & Upper Floors */}
                  <rect x="20" y="16" width="210" height="24" fill="#475569" stroke="#94A3B8" />
                  <text x="125" y="32" textAnchor="middle" fill="#F8FAFC" fontSize="9">
                    بلاطة السقف (يعلوها دور أول وثاني علوي)
                  </text>

                  {/* Hangers & Drop Beam Clearance (15cm) */}
                  <line x1="75" y1="40" x2="75" y2="58" stroke="#94A3B8" strokeWidth="1.5" />
                  <line x1="175" y1="40" x2="175" y2="58" stroke="#94A3B8" strokeWidth="1.5" />

                  {/* Main Supply Duct Box (40-45cm) */}
                  <rect
                    x="55"
                    y="58"
                    width="140"
                    height="40"
                    fill="rgba(56, 189, 248, 0.25)"
                    stroke="#38BDF8"
                    strokeWidth="2"
                  />
                  <text
                    x="125"
                    y="81"
                    textAnchor="middle"
                    fill="#E0F2FE"
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {mainTrunk ? `${mainTrunk.widthCm} × ${mainTrunk.heightCm} cm` : '125 × 40 cm'}
                  </text>

                  {/* Gypsum False Ceiling Level */}
                  <rect x="20" y="106" width="210" height="8" fill="#E2E8F0" />
                  <rect x="105" y="106" width="40" height="10" fill="#38BDF8" />
                  <text x="125" y="128" textAnchor="middle" fill="#94A3B8" fontSize="9.5">
                    السقف الجبسي المستعار + مخارج الهواء
                  </text>

                  {/* Clear Hall Space */}
                  <rect
                    x="20"
                    y="114"
                    width="210"
                    height="140"
                    fill="rgba(255,255,255,0.02)"
                    stroke="rgba(255,255,255,0.08)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x="125"
                    y="192"
                    textAnchor="middle"
                    fill="#38BDF8"
                    fontSize="18"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {design.clearCeilingHeightM.toFixed(2)} m
                  </text>
                  <text x="125" y="210" textAnchor="middle" fill="#CBD5E1" fontSize="10.5">
                    الارتفاع الصافي داخل صحن الكنيسة
                  </text>

                  {/* Marble Floor Datum */}
                  <rect x="20" y="254" width="210" height="12" fill="#94A3B8" />
                  <text x="125" y="263" textAnchor="middle" fill="#0F172A" fontSize="8.8">
                    أرضية الدور الأرضي للكنيسة (أسفلها بدروم)
                  </text>

                  {/* Dimension Callouts on Right */}
                  <line x1="248" y1="40" x2="248" y2="254" stroke="#64748B" strokeWidth="1.2" />
                  <line x1="242" y1="40" x2="254" y2="40" stroke="#64748B" />
                  <line x1="242" y1="110" x2="254" y2="110" stroke="#38BDF8" />
                  <line x1="242" y1="254" x2="254" y2="254" stroke="#64748B" />

                  <text
                    x="274"
                    y="78"
                    textAnchor="middle"
                    fill="#38BDF8"
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    ~{(4.0 - design.clearCeilingHeightM).toFixed(2)}m
                  </text>
                  <text
                    x="274"
                    y="186"
                    textAnchor="middle"
                    fill="#F8FAFC"
                    fontSize="10.5"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    4.00m
                  </text>
                </svg>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/8 space-y-1.5 text-xs text-slate-300 tabular-nums">
              <div className="flex justify-between">
                <span className="text-slate-400">مقاس خط التغذية المزدوج:</span>
                <span className="font-mono text-sky-300">
                  {mainTrunk ? `${mainTrunk.widthCm} × ${mainTrunk.heightCm} سم` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">مقاس خط الراجع الصوتي:</span>
                <span className="font-mono text-amber-300">
                  {returnTrunk ? `${returnTrunk.widthCm} × ${returnTrunk.heightCm} سم` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">مراوح سحب العادم (ضغط موجب):</span>
                <span className="font-mono text-slate-100">
                  {design.exhaustCfmTotal.toLocaleString('en-US')} CFM
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Part C: Full Equal Friction Duct Sizing Schedule Table */}
        <div className="bg-[#111923] border border-white/10 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-100">
              جدول مقاسات الدكت التفصيلي لكل وحدة ({design.nominalUnitTons} طن ·{' '}
              {design.cfmPerUnit.toLocaleString('en-US')} CFM)
            </h3>
            <span className="text-xs text-slate-400 tabular-nums">
              يتكرر هذا التصميم في المناطق الـ 4 بالكامل
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-[#16202E] border-b border-white/10 text-xs text-slate-300">
                  <th className="py-3.5 px-4 font-semibold">مقطع الدكت</th>
                  <th className="py-3.5 px-4 font-semibold">التدفق (CFM)</th>
                  <th className="py-3.5 px-4 font-semibold">السرعة (FPM)</th>
                  <th className="py-3.5 px-4 font-semibold">المقاس (سم)</th>
                  <th className="py-3.5 px-4 font-semibold">المقاس (بوصة)</th>
                  <th className="py-3.5 px-4 font-semibold">سمك الصاج</th>
                  <th className="py-3.5 px-4 font-semibold">العزل والملاحظات التنفيذية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8 text-sm">
                {design.ducts.map((d) => (
                  <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-100">{d.labelAr}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{d.countNoteAr}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-200">
                      {d.cfmPerUnit.toLocaleString('en-US')}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-300">
                      {d.velocityFpm.toLocaleString('en-US')}
                    </td>
                    <td
                      className={`py-3.5 px-4 font-mono tabular-nums font-semibold ${
                        d.role === 'return'
                          ? 'text-amber-300'
                          : d.role === 'fresh'
                            ? 'text-emerald-300'
                            : 'text-sky-300'
                      }`}
                    >
                      {d.widthCm} × {d.heightCm} cm
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-300">
                      {d.widthIn}" × {d.heightIn}"
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-200 whitespace-nowrap">
                      {d.gauge} ({d.thicknessMm})
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-300 leading-relaxed max-w-xs">
                      {d.insulationAr}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Interactive ASHRAE Noise Level Estimator & Acoustic Mitigation Tool */}
        <AcousticNoiseEstimator design={design} />
      </div>
    </section>
  );
}
