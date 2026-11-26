import { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { HvacDesignResult } from '../engine/hvacCalculator';

interface EngineeringDrawingsStageProps {
  design: HvacDesignResult;
}

type DrawingSheetId = 'plan' | 'section' | 'electrical';

export default function EngineeringDrawingsStage({ design }: EngineeringDrawingsStageProps) {
  const [sheet, setSheet] = useState<DrawingSheetId>('plan');
  const [zoom, setZoom] = useState<number>(1);

  const mainTrunk = design.ducts.find((d) => d.id === 'twin-trunk');
  const returnTrunk = design.ducts.find((d) => d.id === 'return-trunk');
  const riserDuct = design.ducts.find((d) => d.id === 'plenum');

  const mainLabel = mainTrunk ? `${mainTrunk.widthCm}×${mainTrunk.heightCm} cm` : '115×40 cm';
  const retLabel = returnTrunk ? `${returnTrunk.widthCm}×${returnTrunk.heightCm} cm` : '110×40 cm';
  const riserLabel = riserDuct ? `${riserDuct.widthCm}×${riserDuct.heightCm} cm` : '165×45 cm';

  return (
    <div className="relative w-full h-[80vh] min-h-[580px] max-h-[860px] bg-[#070D14] flex flex-col border-b border-white/10">
      {/* Top CAD Sheet Bar */}
      <div className="px-6 py-3 bg-[#0C141F] border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-[#131E2D] p-1 rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => {
              setSheet('plan');
              setZoom(1);
            }}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              sheet === 'plan'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            لوحة 01: المسقط الأفقي للدكتات والوحدات الأرضية (Plan)
          </button>
          <button
            type="button"
            onClick={() => {
              setSheet('section');
              setZoom(1);
            }}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              sheet === 'section'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            لوحة 02: القطاع الرأسي (البدروم + الكنيسة + أول وثاني علوي)
          </button>
          <button
            type="button"
            onClick={() => {
              setSheet('electrical');
              setZoom(1);
            }}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              sheet === 'electrical'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            لوحة 03: مخطط الكهرباء 380V (Single-Line Diagram)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.15).toFixed(2))))}
            className="p-1.5 rounded-md bg-[#131E2D] border border-white/10 text-slate-300 hover:text-white cursor-pointer"
            aria-label="تصغير الرسمة الهندسية"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs text-sky-300 tabular-nums w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.6, Number((z + 0.15).toFixed(2))))}
            className="p-1.5 rounded-md bg-[#131E2D] border border-white/10 text-slate-300 hover:text-white cursor-pointer"
            aria-label="تكبير الرسمة الهندسية"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="p-1.5 rounded-md bg-[#131E2D] border border-white/10 text-slate-300 hover:text-white cursor-pointer"
            aria-label="إعادة ضبط التكبير"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main AutoCAD Drawing Canvas */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 md:p-6">
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          className="transition-transform duration-150 w-full max-w-[1040px]"
        >
          {sheet === 'plan' && (
            <svg
              viewBox="0 0 1040 620"
              className="w-full h-auto bg-[#060C13] border border-sky-500/25 rounded-lg"
              role="img"
              aria-label="لوحة أوتوكاد هندسية للمسقط الأفقي لكنيسة 25 في 40 متر وتوزيع الدكتات والوحدات الأرضية"
            >
              <defs>
                <pattern id="engGrid1" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path
                    d="M 20 0 L 0 0 0 20"
                    fill="none"
                    stroke="rgba(56,189,248,0.08)"
                    strokeWidth="0.7"
                  />
                </pattern>
              </defs>
              <rect x="0" y="0" width="1040" height="620" fill="url(#engGrid1)" />
              {/* CAD Sheet Outer Border */}
              <rect x="14" y="14" width="1012" height="592" fill="none" stroke="#334155" strokeWidth="1.5" />

              {/* Outer Dimensions */}
              <line x1="120" y1="42" x2="920" y2="42" stroke="#64748B" strokeWidth="1" />
              <text
                x="520"
                y="36"
                textAnchor="middle"
                fill="#94A3B8"
                fontSize="12"
                fontFamily="JetBrains Mono, monospace"
              >
                L = 40.00 m (CHURCH SANCTUARY — GROUND FLOOR OVER BASEMENT)
              </text>
              <line x1="948" y1="115" x2="948" y2="505" stroke="#64748B" strokeWidth="1" />
              <text
                x="968"
                y="310"
                textAnchor="middle"
                fill="#94A3B8"
                fontSize="12"
                fontFamily="JetBrains Mono, monospace"
                transform="rotate(90 968 310)"
              >
                W = 25.00 m
              </text>

              {/* 4 Ground-Mounted 380V T3 Units OUTSIDE North/South (East/West) Concrete Walls! */}
              {[
                { x: 255, y: 52, side: 'top', num: 1 },
                { x: 655, y: 52, side: 'top', num: 3 },
                { x: 255, y: 520, side: 'bot', num: 2 },
                { x: 655, y: 520, side: 'bot', num: 4 },
              ].map((u) => (
                <g key={`grd-unit-${u.num}`}>
                  <rect
                    x={u.x}
                    y={u.y}
                    width="130"
                    height="46"
                    fill="rgba(14,165,233,0.16)"
                    stroke="#38BDF8"
                    strokeWidth="1.8"
                  />
                  <text
                    x={u.x + 65}
                    y={u.y + 20}
                    textAnchor="middle"
                    fill="#E0F2FE"
                    fontSize="10.5"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    GROUND #{u.num} · {design.nominalUnitTons}TR ({design.coolingHpPerUnit}HP)
                  </text>
                  <text
                    x={u.x + 65}
                    y={u.y + 35}
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize="9"
                  >
                    قاعدة خرسانية أرضية · T3 380V
                  </text>
                  {/* External Vertical Supply & Return Risers penetrating into First Floor Wall */}
                  <rect
                    x={u.x + 24}
                    y={u.side === 'top' ? 98 : 502}
                    width="22"
                    height="20"
                    fill="#0284C7"
                    stroke="#BAE6FD"
                    strokeWidth="1.2"
                  />
                  <rect
                    x={u.x + 84}
                    y={u.side === 'top' ? 98 : 502}
                    width="20"
                    height="20"
                    fill="#B45309"
                    stroke="#FDE68A"
                    strokeWidth="1.2"
                  />
                </g>
              ))}

              {/* Concrete Building Perimeter Walls (25m x 40m) */}
              <rect
                x="120"
                y="115"
                width="800"
                height="390"
                fill="rgba(15,23,34,0.65)"
                stroke="#E2E8F0"
                strokeWidth="3.5"
              />

              {/* Perimeter Ventilation Windows on all 4 facades */}
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <g key={`cad-win-${i}`}>
                  <line x1={136 + i * 98} y1="115" x2={204 + i * 98} y2="115" stroke="#38BDF8" strokeWidth="4.5" />
                  <line x1={136 + i * 98} y1="505" x2={204 + i * 98} y2="505" stroke="#38BDF8" strokeWidth="4.5" />
                </g>
              ))}
              {[0, 1, 2, 3].map((i) => (
                <g key={`cad-win-lr-${i}`}>
                  <line x1="120" y1={132 + i * 94} x2="120" y2={198 + i * 94} stroke="#38BDF8" strokeWidth="4.5" />
                  {i !== 1 && i !== 2 && (
                    <line x1="920" y1={132 + i * 94} x2="920" y2={198 + i * 94} stroke="#38BDF8" strokeWidth="4.5" />
                  )}
                </g>
              ))}

              {/* Iconostasis / Altar Sanctuary (الهيكل وحامل الأيقونات) on Left */}
              <rect
                x="126"
                y="155"
                width="74"
                height="310"
                fill="rgba(245,158,11,0.12)"
                stroke="#F59E0B"
                strokeWidth="1.4"
                strokeDasharray="5 3"
              />
              <text x="163" y="305" textAnchor="middle" fill="#FDE68A" fontSize="12" fontWeight="bold">
                الهيكل
              </text>
              <text x="163" y="324" textAnchor="middle" fill="#FDE68A" fontSize="9.5">
                حامل الأيقونات
              </text>

              {/* Central Processional Aisle + Entrance with Air Curtain on Right */}
              <rect
                x="200"
                y="285"
                width="716"
                height="50"
                fill="rgba(255,255,255,0.03)"
                stroke="rgba(148,163,184,0.22)"
                strokeDasharray="6 4"
              />
              <text x="560" y="314" textAnchor="middle" fill="#94A3B8" fontSize="11">
                الممر الأوسط لصحن الكنيسة (1,000 مقعد على دكك خشبية)
              </text>

              <rect
                x="908"
                y="262"
                width="16"
                height="96"
                fill="rgba(56,189,248,0.3)"
                stroke="#38BDF8"
                strokeWidth="1.6"
              />
              <text
                x="892"
                y="310"
                textAnchor="middle"
                fill="#7DD3FC"
                fontSize="10"
                transform="rotate(-90 892 310)"
              >
                المدخل + ستارة هواء
              </text>

              {/* 4 Symmetrical Ductwork Zones Fed Directly from External Ground Risers */}
              {[
                { x0: 210, x1: 525, yBase: 118, dir: 1, zLabel: 'ZONE 1' },
                { x0: 545, x1: 880, yBase: 118, dir: 1, zLabel: 'ZONE 3' },
                { x0: 210, x1: 525, yBase: 502, dir: -1, zLabel: 'ZONE 2' },
                { x0: 545, x1: 880, yBase: 502, dir: -1, zLabel: 'ZONE 4' },
              ].map((z, idx) => {
                const trunkY1 = z.yBase + z.dir * 42;
                const trunkY2 = z.yBase + z.dir * 130;
                const retY = z.yBase + z.dir * 86;
                const entrySupplyX = z.x0 + 80;
                const entryReturnX = z.x0 + 140;

                return (
                  <g key={`cad-zone-${idx}`}>
                    {/* Feeder from External Supply Riser */}
                    <line
                      x1={entrySupplyX}
                      y1={z.yBase}
                      x2={entrySupplyX}
                      y2={trunkY2}
                      stroke="#38BDF8"
                      strokeWidth="9"
                    />
                    {/* Twin Longitudinal Supply Trunks */}
                    {[trunkY1, trunkY2].map((ty, tIdx) => (
                      <g key={`tr-${idx}-${tIdx}`}>
                        <rect
                          x={z.x0 + 10}
                          y={ty - 7}
                          width={z.x1 - z.x0 - 20}
                          height="14"
                          fill="rgba(56,189,248,0.28)"
                          stroke="#38BDF8"
                          strokeWidth="1.4"
                        />
                        {[0, 1, 2, 3].map((di) => {
                          const dx = z.x0 + 36 + di * ((z.x1 - z.x0 - 72) / 3);
                          return (
                            <g key={`d-${idx}-${tIdx}-${di}`}>
                              <rect
                                x={dx - 6}
                                y={ty - 22}
                                width="12"
                                height="12"
                                fill="rgba(186,230,253,0.24)"
                                stroke="#E0F2FE"
                                strokeWidth="1"
                              />
                              <rect
                                x={dx - 6}
                                y={ty + 10}
                                width="12"
                                height="12"
                                fill="rgba(186,230,253,0.24)"
                                stroke="#E0F2FE"
                                strokeWidth="1"
                              />
                            </g>
                          );
                        })}
                      </g>
                    ))}
                    {/* Central Return Trunk returning to External Return Riser */}
                    <line
                      x1={entryReturnX}
                      y1={z.yBase}
                      x2={entryReturnX}
                      y2={retY}
                      stroke="#F59E0B"
                      strokeWidth="7"
                    />
                    <rect
                      x={z.x0 + 35}
                      y={retY - 7}
                      width={z.x1 - z.x0 - 70}
                      height="14"
                      fill="rgba(245,158,11,0.25)"
                      stroke="#F59E0B"
                      strokeWidth="1.2"
                    />
                  </g>
                );
              })}

              {/* AutoCAD Engineering Title Block (خرطوشة اللوحة الهندسية) */}
              <rect x="24" y="572" width="992" height="28" fill="#0B131E" stroke="#334155" />
              <text x="520" y="590" textAnchor="middle" fill="#CBD5E1" fontSize="9.8" fontFamily="JetBrains Mono, monospace">
                AL-FADI HVAC (مشروع الفادي للتبريد والتكييف) · 4×{design.nominalUnitTons}TR ({design.coolingHpPerUnit}HP) GROUND UNITS · 64 DIFFUSERS · Developed by Eng/Emad azmy
              </text>
            </svg>
          )}

          {sheet === 'section' && (
            <svg
              viewBox="0 0 1040 580"
              className="w-full h-auto bg-[#060C13] border border-sky-500/25 rounded-lg"
              role="img"
              aria-label="قطاع رأسي هندسي يوضح البدروم والدور الأرضي للكنيسة والدور الأول علوي والثاني علوي والوحدات الأرضية الجانبية"
            >
              <defs>
                <pattern id="engGrid2" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path
                    d="M 20 0 L 0 0 0 20"
                    fill="none"
                    stroke="rgba(56,189,248,0.08)"
                    strokeWidth="0.7"
                  />
                </pattern>
              </defs>
              <rect x="0" y="0" width="1040" height="580" fill="url(#engGrid2)" />
              <rect x="14" y="14" width="1012" height="552" fill="none" stroke="#334155" strokeWidth="1.5" />

              {/* Ground Yard Datum Line (0.00 m — Courtyard Level) */}
              <line x1="36" y1="418" x2="230" y2="418" stroke="#94A3B8" strokeWidth="2.5" />
              <line x1="810" y1="418" x2="1004" y2="418" stroke="#94A3B8" strokeWidth="2.5" />
              <text x="122" y="438" textAnchor="middle" fill="#94A3B8" fontSize="9.5">
                منسوب الحوش الأرضي (0.00m)
              </text>
              <text x="916" y="438" textAnchor="middle" fill="#94A3B8" fontSize="9.5">
                منسوب الحوش الأرضي (0.00m)
              </text>

              {/* BASEMENT BELOW GROUND-FLOOR CHURCH (-3.20m to 0.00m) */}
              <rect x="230" y="418" width="580" height="92" fill="rgba(71,85,105,0.22)" stroke="#64748B" strokeWidth="2" strokeDasharray="6 3" />
              <text x="520" y="462" textAnchor="middle" fill="#94A3B8" fontSize="13.5" fontWeight="bold">
                البدروم (تحت الأرض أسفل صحن الكنيسة · منسوب -3.20م إلى 0.00م)
              </text>
              <text x="520" y="484" textAnchor="middle" fill="#64748B" fontSize="10">
                يحافظ على برودة أرضية الكنيسة ويقلل الحمل الحراري السفلي
              </text>

              {/* GROUND FLOOR: CHURCH SANCTUARY (0.00m to +4.00m structural / 3.30m clear) */}
              <rect x="230" y="258" width="580" height="160" fill="rgba(14,165,233,0.08)" stroke="#E2E8F0" strokeWidth="2.5" />
              {/* Suspended Gypsum Ceiling at 3.30m */}
              <line x1="234" y1="292" x2="806" y2="292" stroke="#E2E8F0" strokeWidth="2.5" strokeDasharray="8 4" />
              {/* Main Ducts inside 40cm Ceiling Plenum */}
              <rect x="242" y="266" width="556" height="22" fill="rgba(56,189,248,0.28)" stroke="#38BDF8" strokeWidth="1.6" />
              <text x="520" y="281" textAnchor="middle" fill="#E0F2FE" fontSize="10.5" fontFamily="JetBrains Mono, monospace">
                GROUND-FLOOR CHURCH PLENUM DUCTS ({mainLabel} · MAX HEIGHT {design.maxDuctHeightCm} cm)
              </text>
              {/* 4 Diffusers blowing cool air down */}
              {[300, 440, 600, 740].map((dx) => (
                <g key={`sec-diff-${dx}`}>
                  <rect x={dx - 16} y="290" width="32" height="6" fill="#38BDF8" />
                  <path d={`M ${dx} 300 L ${dx - 18} 326 M ${dx} 300 L ${dx} 332 M ${dx} 300 L ${dx + 18} 326`} stroke="#38BDF8" strokeWidth="1.2" strokeDasharray="3 2" />
                </g>
              ))}
              <text x="520" y="366" textAnchor="middle" fill="#F8FAFC" fontSize="14.5" fontWeight="bold">
                الدور الأرضي: صحن الكنيسة (25م × 40م · ارتفاع صافي {design.clearCeilingHeightM.toFixed(2)}م)
              </text>
              <text x="520" y="388" textAnchor="middle" fill="#7DD3FC" fontSize="10.5">
                دكك خشبية لـ 1,000 مصلّي · دخول الدكت جانبياً مباشرة من الوحدات الأرضية (صاعد قصير ~3.5م فقط!)
              </text>

              {/* 1ST UPPER FLOOR ABOVE CHURCH (+4.00m to +7.30m) */}
              <rect x="230" y="162" width="580" height="96" fill="rgba(245,158,11,0.07)" stroke="#CBD5E1" strokeWidth="2" />
              <text x="520" y="206" textAnchor="middle" fill="#FDE68A" fontSize="13.5" fontWeight="bold">
                الدور الأول علوي (فوق صحن الكنيسة مباشرة · +4.00م إلى +7.30م)
              </text>
              <text x="520" y="228" textAnchor="middle" fill="#CBD5E1" fontSize="10">
                بلاطة خرسانية سليمة 100% بدون أي فتحات دكت أو اهتزازات
              </text>

              {/* 2ND UPPER FLOOR ABOVE 1ST UPPER FLOOR (+7.30m to +10.60m) + EMPTY FLAT ROOF */}
              <rect x="230" y="66" width="580" height="96" fill="rgba(245,158,11,0.05)" stroke="#CBD5E1" strokeWidth="2" />
              <rect x="220" y="54" width="600" height="12" fill="#475569" stroke="#CBD5E1" />
              <text x="520" y="110" textAnchor="middle" fill="#FDE68A" fontSize="13.5" fontWeight="bold">
                الدور الثاني علوي (الدور الأخير · سطح فارغ تماماً بدون أي ماكينات)
              </text>
              <text x="520" y="132" textAnchor="middle" fill="#CBD5E1" fontSize="10">
                يحجب الدوران العلويان شمس أسوان تماماً عن سقف الكنيسة
              </text>

              {/* LEFT & RIGHT GROUND-MOUNTED 380V T3 UNITS AT GRADE (0.00m) + SHORT VERTICAL CLAD RISERS (~3.5m ONLY!) */}
              {[
                { ux: 68, rx: 196, penX: 230, label: 'وحدات غربية (×2)' },
                { ux: 872, rx: 816, penX: 810, label: 'وحدات شرقية (×2)' },
              ].map((s, idx) => (
                <g key={`sec-unit-${idx}`}>
                  {/* Raised Concrete Pad at Ground Courtyard Level */}
                  <rect x={s.ux - 10} y="402" width="120" height="16" fill="#64748B" stroke="#CBD5E1" />
                  {/* 380V T3 Package Unit right beside the Ground-Floor Church wall */}
                  <rect x={s.ux} y="330" width="100" height="72" fill="rgba(14,165,233,0.22)" stroke="#38BDF8" strokeWidth="2" />
                  <text x={s.ux + 50} y="356" textAnchor="middle" fill="#FFFFFF" fontSize="10.5" fontWeight="bold">
                    {s.label}
                  </text>
                  <text x={s.ux + 50} y="374" textAnchor="middle" fill="#BAE6FD" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                    {design.nominalUnitTons}TR · {design.coolingHpPerUnit}HP
                  </text>
                  <text x={s.ux + 50} y="391" textAnchor="middle" fill="#94A3B8" fontSize="8.5">
                    تثبيت أرضي · 380V T3
                  </text>

                  {/* Short Vertical Insulated Aluminum-Clad Riser Duct climbing ONLY ~3.5m to Ground-Floor Church Plenum! */}
                  <rect x={s.rx} y="266" width="28" height="114" fill="rgba(56,189,248,0.32)" stroke="#38BDF8" strokeWidth="1.8" />
                  {/* Horizontal connector from Ground Unit to Riser */}
                  <line
                    x1={idx === 0 ? s.ux + 100 : s.ux}
                    y1="362"
                    x2={idx === 0 ? s.rx : s.rx + 28}
                    y2="362"
                    stroke="#38BDF8"
                    strokeWidth="14"
                  />
                  {/* Horizontal 90° Wall Penetration into Ground-Floor Church Plenum */}
                  <line
                    x1={idx === 0 ? s.rx + 28 : s.rx}
                    y1="277"
                    x2={s.penX + (idx === 0 ? 14 : -14)}
                    y2="277"
                    stroke="#38BDF8"
                    strokeWidth="16"
                  />
                  <text
                    x={s.rx + 14}
                    y="324"
                    textAnchor="middle"
                    fill="#E0F2FE"
                    fontSize="8.5"
                    transform={`rotate(-90 ${s.rx + 14} 324)`}
                  >
                    صاعد قصير 3.5م ({riserLabel})
                  </text>
                </g>
              ))}

              {/* Title Strip */}
              <rect x="24" y="532" width="992" height="26" fill="#0B131E" stroke="#334155" />
              <text x="520" y="549" textAnchor="middle" fill="#CBD5E1" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                AL-FADI HVAC (مشروع الفادي للتبريد والتكييف) · BASEMENT + GROUND CHURCH (4m) + 1ST &amp; 2ND UPPER FLOORS · Developed by Eng/Emad azmy
              </text>
            </svg>
          )}

          {sheet === 'electrical' && (
            <svg
              viewBox="0 0 1040 560"
              className="w-full h-auto bg-[#060C13] border border-sky-500/25 rounded-lg"
              role="img"
              aria-label="مخطط أحادي الخط لتوزيع كهرباء 380 فولت 3 فاز للوحدات الأرضية الأربعة"
            >
              <rect x="14" y="14" width="1012" height="532" fill="none" stroke="#334155" strokeWidth="1.5" />

              {/* Transformer / Utility Source */}
              <rect x="380" y="34" width="280" height="56" rx="6" fill="rgba(245,158,11,0.14)" stroke="#F59E0B" strokeWidth="2" />
              <text x="520" y="58" textAnchor="middle" fill="#FDE68A" fontSize="13" fontWeight="bold">
                مصدر التغذية الرئيسي 380V · 3-Phase · 50Hz
              </text>
              <text x="520" y="78" textAnchor="middle" fill="#CBD5E1" fontSize="10.5" fontFamily="JetBrains Mono, monospace">
                Transformer Allocation: {design.electrical.recommendedTransformerKva} kVA
              </text>

              <line x1="520" y1="90" x2="520" y2="132" stroke="#F59E0B" strokeWidth="3" />

              {/* Main HVAC Panel + Main MCCB + Phase Failure Protection */}
              <rect x="330" y="132" width="380" height="74" rx="6" fill="rgba(14,165,233,0.14)" stroke="#38BDF8" strokeWidth="2" />
              <text x="520" y="156" textAnchor="middle" fill="#E0F2FE" fontSize="13" fontWeight="bold">
                لوحة التكييف الرئيسية (MAIN HVAC MDB — 380V)
              </text>
              <text x="520" y="176" textAnchor="middle" fill="#7DD3FC" fontSize="11" fontFamily="JetBrains Mono, monospace">
                Main MCCB: {design.electrical.mainBreakerA}A 3P · Total Running: {design.electrical.totalRunningAmps.toFixed(0)}A ({design.electrical.totalRunningKw.toFixed(0)} kW)
              </text>
              <text x="520" y="194" textAnchor="middle" fill="#94A3B8" fontSize="10">
                كابل رئيسي: {design.electrical.mainCableSpec} + جهاز حماية سقوط الفازات وتأخير الإقلاع التتابعي
              </text>

              {/* Busbar Distribution */}
              <line x1="520" y1="206" x2="520" y2="250" stroke="#38BDF8" strokeWidth="3" />
              <line x1="150" y1="250" x2="890" y2="250" stroke="#38BDF8" strokeWidth="4" />

              {/* 4 Ground-Mounted Unit Feeders */}
              {[150, 396, 644, 890].map((cx, i) => (
                <g key={`sld-u-${i}`}>
                  <line x1={cx} y1="250" x2={cx} y2="305" stroke="#38BDF8" strokeWidth="2.5" />
                  {/* Unit MCCB Breaker Box */}
                  <rect x={cx - 64} y="305" width="128" height="44" rx="4" fill="#0F1722" stroke="#F59E0B" strokeWidth="1.6" />
                  <text x={cx} y="324" textAnchor="middle" fill="#FDE68A" fontSize="11" fontWeight="bold" fontFamily="JetBrains Mono, monospace">
                    MCCB {design.electrical.unitBreakerA}A (3P)
                  </text>
                  <text x={cx} y="340" textAnchor="middle" fill="#94A3B8" fontSize="9">
                    قاطع فرعي + أوفرلود
                  </text>

                  <line x1={cx} y1="349" x2={cx} y2="400" stroke="#94A3B8" strokeWidth="2" strokeDasharray="5 3" />
                  <text x={cx} y="378" textAnchor="middle" fill="#CBD5E1" fontSize="8.5">
                    {design.electrical.unitCableSpec.split('+')[0]}
                  </text>

                  {/* Ground Unit Load */}
                  <rect x={cx - 92} y="400" width="184" height="86" rx="6" fill="rgba(14,165,233,0.12)" stroke="#38BDF8" strokeWidth="1.8" />
                  <text x={cx} y="424" textAnchor="middle" fill="#FFFFFF" fontSize="11.5" fontWeight="bold">
                    وحدة أرضية T3 #{i + 1}
                  </text>
                  <text x={cx} y="445" textAnchor="middle" fill="#7DD3FC" fontSize="11" fontFamily="JetBrains Mono, monospace">
                    {design.nominalUnitTons}TR ({design.coolingHpPerUnit}HP) · {design.electrical.runningKwPerUnit.toFixed(1)} kW
                  </text>
                  <text x={cx} y="464" textAnchor="middle" fill="#CBD5E1" fontSize="10" fontFamily="JetBrains Mono, monospace">
                    I = {design.electrical.runningAmpsPerUnit.toFixed(1)} A @ 380V
                  </text>
                  <text x={cx} y="479" textAnchor="middle" fill="#94A3B8" fontSize="8.5">
                    مفتاح عزل Isolator بجانب الوحدة
                  </text>
                </g>
              ))}

              <rect x="24" y="510" width="992" height="26" fill="#0B131E" stroke="#334155" />
              <text x="520" y="527" textAnchor="middle" fill="#CBD5E1" fontSize="9.8" fontFamily="JetBrains Mono, monospace">
                AL-FADI HVAC (مشروع الفادي للتبريد والتكييف) · 380V 3-PHASE 50Hz SLD · Developed by Eng/Emad azmy
              </text>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
