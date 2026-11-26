import { Check, Cpu, ShieldCheck, Zap } from 'lucide-react';
import { HvacDesignResult } from '../engine/hvacCalculator';

interface ElectricalAndSystemsSectionProps {
  design: HvacDesignResult;
}

export default function ElectricalAndSystemsSection({ design }: ElectricalAndSystemsSectionProps) {
  const { electrical } = design;

  const systemOptions = [
    {
      id: 'rtu-package',
      recommended: true,
      titleAr: `4 وحدات باكدج أرضية استوائية T3 (${design.nominalUnitTons} طن = ${design.coolingHpPerUnit} حصان/وحدة)`,
      capacityAr: `${design.installedTotalTons} طن (${design.totalCoolingHp} حصان تبريدي)`,
      summaryAr:
        'الخيار الهندسي الأمثل عند وجود ردود جانبي ≥ 2.5م لكنيسة 1,000 م² بالدور الأرضي (تحتها بدروم ويعلوها دور أول وثاني علوي) في أسوان. تُثبت الوحدات على قواعد خرسانية أرضية مع دخول دكت جداري أفقي بدون أي فتحات في سقف الأدوار العلوية.',
      pros: [
        'مثالية لوجود دور أول وثاني علوي فوق الكنيسة — صيانة أرضية سريعة وسهلة بدون أوناش',
        'يحافظ تقسيم 4 مناطق على ارتفاع دكت ≤ 45 سم وارتفاع صافي 3.30م داخل الكنيسة',
        'اعتمادية كاملة: لو توقفت وحدة تعمل 3 وحدات بـ 75% قدرة، ويوفر الكهرباء في الاجتماعات الصغيرة',
        'هدوء تام داخل صحن الكنيسة (< 35 NC) لأن الضواغط والمراوح بالخارج على الأرض',
      ],
    },
    {
      id: 'chiller-ahu',
      recommended: false,
      titleAr: `تشيلر تبريد هواء أرضي T3 (${design.installedTotalTons} طن / ${design.totalCoolingHp} حصان) + 4 وحدات AHU`,
      capacityAr: `${design.installedTotalTons} طن · مواسير مياه 4" فقط`,
      summaryAr:
        'الحل المثالي لو لا ترغب في أي صواعد دكت خارجية على الواجهة؛ يُوضع التشيلر على الأرض وتصعد مواسير مياه مثلجة صغيرة الحجم فقط (4 بوصة) لتغذية وحدات مناولة مخفية بغرف جانبية.',
      pros: [
        'لا يحتاج صواعد صاج ضخمة على الواجهة — مواسير 4 بوصة فقط في منور صغير',
        'عمر تشغيلي طويل جداً (20–25 سنة) وأعلى درجة هدوء داخلي',
        'تكلفة تأسيسية أعلى بحوالي 35%–45% ويحتاج غرفة طلمبات ومعالجة مياه',
        'يحتاج فني تشيلرات متخصص ومتابعة دورية في صعيد مصر',
      ],
    },
    {
      id: 'ducted-split-vrf',
      recommended: false,
      titleAr: '8 وحدات سبليت دكت مركزي أرضي (مكثفات على الأرض + مواسير نحاس فقط)',
      capacityAr: `~${design.installedTotalTons} طن (${design.totalCoolingHp} حصان تبريدي)`,
      summaryAr:
        'حل عملي جداً عندما يكون الردود الجانبي ضيقاً ولا يسمح بدكتات خارجية: توضع الكباسات الخارجية على الأرض، وتصعد مواسير نحاس رفيعة لوحدات دكت مخفية بارتفاع 30 سم فقط فوق السقف المستعار.',
      pros: [
        'صفر دكتات خارجية على الواجهة وصفر فتحات في سقف الأدوار العلوية',
        'أقل استهلاك كهرباء في الأيام العادية خارج الأعياد والمناسبات الكبرى',
        'يحتاج وحدة هواء نقي FAHU منفصلة (8,000 CFM) لتنقية الجو من البخور وتجديد الهواء',
        'يتطلب كابلات 380V ومثبتات حماية ضد تذبذب كهرباء أسوان',
      ],
    },
  ];

  return (
    <section id="electrical" className="py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mb-10">
          <p className="text-xs font-medium text-sky-400 mb-2">
            المواصفات الكهربائية للتغذية 3 فاز · 380V / 50Hz · معامل قدرة 0.85
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-50">
            أحمال الكهرباء 380V ومقاسات القواطع والكابلات وشكل الوحدات الأرضية
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-14 items-stretch">
          <div className="lg:col-span-8 bg-[#111923] border border-white/10 rounded-xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100">
                  جدول الأحمال الكهربائية وتوزيع اللوحة (380V 3-Phase)
                </h3>
              </div>
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                {electrical.kwPerTon.toFixed(2)} kW/TR (T3 Aswan)
              </span>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-[#16202E] border-b border-white/10 text-xs text-slate-300">
                    <th className="py-3 px-4 font-semibold">البند الكهربائي</th>
                    <th className="py-3 px-4 font-semibold">
                      لكل وحدة أرضية ({design.nominalUnitTons} طن)
                    </th>
                    <th className="py-3 px-4 font-semibold">
                      الإجمالي ({design.unitCount} وحدات · {design.installedTotalTons} طن)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8 text-sm">
                  <tr className="bg-sky-500/[0.06]">
                    <td className="py-3.5 px-4 text-sky-200 font-semibold">
                      القدرة بالحصان التبريدي (السوق المصري: 1 طن = 1.5 حصان)
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-sky-300">
                      {design.coolingHpPerUnit} حصان تبريدي ({design.nominalUnitTons} طن)
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-amber-300">
                      {design.totalCoolingHp} حصان تبريدي ({design.installedTotalTons} طن)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 text-slate-200 font-medium">
                      القدرة الكهربائية الفعالة (Running Power / Motor HP)
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-200">
                      {electrical.runningKwPerUnit.toFixed(1)} kW ({design.electricalHpPerUnit.toFixed(0)} HP كهرباء)
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-sky-300">
                      {electrical.totalRunningKw.toFixed(1)} kW ({design.totalElectricalHp.toFixed(0)} HP كهرباء)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 text-slate-200 font-medium">
                      القدرة الظاهرية (Apparent Power)
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-200">
                      {(electrical.runningKwPerUnit / electrical.powerFactor).toFixed(1)} kVA
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-amber-300">
                      {electrical.totalKva.toFixed(0)} kVA
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 text-slate-200 font-medium">
                      الأمبير التشغيلي على 380 فولت (Running Amps)
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-200">
                      {electrical.runningAmpsPerUnit.toFixed(1)} A
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-sky-300">
                      {electrical.totalRunningAmps.toFixed(0)} A
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 text-slate-200 font-medium">
                      القاطع المقترح (MCCB 3-Pole)
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-100">
                      {electrical.unitBreakerA} A MCCB
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-slate-50">
                      {electrical.mainBreakerA} A MCCB رئيسي
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 text-slate-200 font-medium">
                      مقاس الكابل النحاسي المسلح (XLPE/SWA)
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-200">
                      {electrical.unitCableSpec}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-sky-200">
                      {electrical.mainCableSpec}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 text-slate-200 font-medium">
                      قدرة المحول الكهربائي المطلوبة للتكييف
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      مع هامش إقلاع الضواغط وحرارة كابلات أسوان
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-amber-300">
                      محول {electrical.recommendedTransformerKva} kVA (أو كشك 500 kVA للمبنى بالكامل)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4 bg-[#111923] border border-white/10 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-sky-300 text-sm font-bold mb-3">
                <Cpu className="w-4 h-4" />
                <span>مواصفات وحدات التبريد الأرضية (T3 أسوان)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                وحدات باكدج مركزية أرضية (Ground-Mounted Package Units) مجهزة للعمل الشاق مع صواعد
                رأسية معزولة:
              </p>

              <ul className="space-y-3 text-xs text-slate-200">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>تثبيت أرضي آمن ومظلل:</strong> تُركّب على قواعد خرسانية بارتفاع 40 سم عن
                    الأرض مع سياج تهوية شبكي مفتوح من الأعلى لطرد الهواء الساخن ومظلة علوية تقلل
                    حرارة الشمس على المكثفات.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>ضواغط استوائية T3 متعددة المراحل:</strong> 2–4 ضواغط Scroll منفصلة بكل
                    وحدة (R410A) لتقليل تيار الإقلاع وتوفير الكهرباء في الاجتماعات والقداسات العادية.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>حماية كهربائية 380V متكاملة:</strong> جهاز حماية سقوط وانعكاس الفازات
                    (Phase Failure Relay) + تشغيل تتابعي (Sequential Timer) بين الوحدات الـ 4.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>صواعد خارجية كلادينج (~3.5م):</strong> صاعد تغذية وصاعد راجع معزول 50 مم
                    ومغلف ألومنيوم 0.7 مم يدخل سقف الدور الأرضي مباشرة بدون المرور بالأدوار العلوية.
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-5 pt-4 border-t border-white/8 text-xs text-slate-400">
              أبعاد القاعدة الأرضية لكل وحدة {design.nominalUnitTons} طن: ~4.8م × 2.6م مع ترك ممر
              خدمة وتهوية لا يقل عن 1.5م حول المكثفات.
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-50">
            مقارنة أنظمة التكييف المركزي المناسبة للكنيسة (1,000 م² · الدور الأرضي فوق البدروم)
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            لمساعدة لجنة البناء والمهندس الاستشاري في اختيار النظام الأنسب عند التعاقد مع الشركات
            الموردة (كارير، يورك، ترين، ميديا التجارية، الزامل).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {systemOptions.map((opt) => (
            <div
              key={opt.id}
              className={`rounded-xl p-6 border flex flex-col justify-between ${
                opt.recommended
                  ? 'bg-[#13202E] border-sky-400/50'
                  : 'bg-[#111923] border-white/10'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs mb-2">
                  <span className={opt.recommended ? 'text-sky-400 font-semibold' : 'text-slate-400'}>
                    {opt.recommended ? 'الخيار الهندسي الموصى به لأسوان' : 'خيار بديل'}
                  </span>
                  <span className="font-mono text-slate-400 tabular-nums">{opt.capacityAr}</span>
                </div>
                <h4 className="text-base font-bold text-slate-50 leading-snug">{opt.titleAr}</h4>
                <p className="text-xs text-slate-300 leading-relaxed mt-2.5">{opt.summaryAr}</p>

                <ul className="mt-4 pt-4 border-t border-white/8 space-y-2.5 text-xs text-slate-300">
                  {opt.pros.map((pro, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check
                        className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                          opt.recommended ? 'text-sky-400' : 'text-slate-500'
                        }`}
                      />
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
