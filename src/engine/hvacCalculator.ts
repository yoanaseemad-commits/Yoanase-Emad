export interface HallParameters {
  widthM: number;           // default 25m
  lengthM: number;          // default 40m
  heightM: number;          // default 4m
  guests: number;           // default 1000
  ambientTempC: number;     // default 47°C (Aswan summer peak)
  indoorTempC: number;      // default 22°C
  windowRatioPct: number;   // default 30% across all 4 facades
  roofExposedToSun: boolean;// First floor: exposed roof vs 2nd floor above
  roofInsulated: boolean;   // default true (5cm XPS recommended for Aswan)
  useErv: boolean;          // default false (standard direct fresh air)
  daytimeEvent: boolean;    // default true (daytime + nighttime peak design)
  hasAirCurtains: boolean;  // default true (recommended for entrance doors)
}

export interface LoadItem {
  id: string;
  nameAr: string;
  detailAr: string;
  sensibleKw: number;
  latentKw: number;
  totalKw: number;
  btuHr: number;
  tons: number;
  sharePct: number;
  color: string;
}

export interface DuctSegment {
  id: string;
  labelAr: string;
  role: 'supply' | 'return' | 'fresh' | 'exhaust';
  cfmPerUnit: number;
  velocityFpm: number;
  widthCm: number;
  heightCm: number;
  widthIn: number;
  heightIn: number;
  gauge: string;
  thicknessMm: string;
  insulationAr: string;
  countNoteAr: string;
}

export interface ElectricalSpecs {
  voltage: number;
  phases: number;
  powerFactor: number;
  kwPerTon: number;
  runningKwPerUnit: number;
  totalRunningKw: number;
  totalKva: number;
  runningAmpsPerUnit: number;
  totalRunningAmps: number;
  mcaAmpsPerUnit: number;
  unitBreakerA: number;
  mainBreakerA: number;
  unitCableSpec: string;
  mainCableSpec: string;
  recommendedTransformerKva: number;
}

export interface HvacDesignResult {
  areaM2: number;
  volumeM3: number;
  perimeterM: number;
  windowAreaM2: number;
  netWallAreaM2: number;
  loads: LoadItem[];
  subtotalSensibleKw: number;
  subtotalLatentKw: number;
  subtotalKw: number;
  safetyFactorKw: number;
  totalCoolingKw: number;
  totalBtuHr: number;
  requiredTons: number;
  requiredCoolingHp: number;
  sensibleHeatRatio: number;
  unitCount: number;
  nominalUnitTons: number;
  installedTotalTons: number;
  coolingHpPerUnit: number;
  totalCoolingHp: number;
  electricalHpPerUnit: number;
  totalElectricalHp: number;
  cfmPerUnit: number;
  totalSupplyCfm: number;
  freshAirCfmTotal: number;
  freshAirCfmPerUnit: number;
  exhaustCfmTotal: number;
  diffusersPerUnit: number;
  totalDiffusers: number;
  cfmPerDiffuser: number;
  clearCeilingHeightM: number;
  maxDuctHeightCm: number;
  ducts: DuctSegment[];
  electrical: ElectricalSpecs;
}

export const DEFAULT_HALL_PARAMS: HallParameters = {
  widthM: 25,
  lengthM: 40,
  heightM: 4,
  guests: 1000,
  ambientTempC: 47,
  indoorTempC: 22,
  windowRatioPct: 30,
  roofExposedToSun: false,
  roofInsulated: true,
  useErv: false,
  daytimeEvent: true,
  hasAirCurtains: true,
};

const KW_PER_TR = 3.51685;
const BTU_PER_KW = 3412.14;

function roundTo5(val: number): number {
  return Math.max(20, Math.ceil(val / 5) * 5);
}

function cmToIn(cm: number): number {
  return Math.round(cm / 2.54);
}

function pickBreaker(amps: number): number {
  const standards = [32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000];
  for (const s of standards) {
    if (s >= amps * 1.25) return s;
  }
  return 1250;
}

function pickUnitCable(breakerA: number): string {
  if (breakerA <= 63) return '4×16 مم² + 16 مم² أرضي (Cu/XLPE)';
  if (breakerA <= 100) return '4×25 مم² + 16 مم² أرضي (Cu/XLPE)';
  if (breakerA <= 125) return '4×35 مم² + 16 مم² أرضي (Cu/XLPE)';
  if (breakerA <= 160) return '4×50 مم² + 25 مم² أرضي (Cu/XLPE)';
  if (breakerA <= 200) return '4×70 مم² + 35 مم² أرضي (Cu/XLPE)';
  return '4×95 مم² + 50 مم² أرضي (Cu/XLPE)';
}

function pickMainCable(mainBreakerA: number): string {
  if (mainBreakerA <= 315) return '4×150 مم² + 70 مم² أرضي (Cu/XLPE)';
  if (mainBreakerA <= 400) return '4×185 مم² + 95 مم² أرضي (Cu/XLPE)';
  if (mainBreakerA <= 500) return '4×240 مم² + 120 مم² أرضي (Cu/XLPE)';
  if (mainBreakerA <= 630) return '2×(4×150 مم²) + 150 مم² أرضي (Cu/XLPE)';
  return '2×(4×240 مم²) + 185 مم² أرضي (Cu/XLPE)';
}

export function calculateHvacDesign(params: HallParameters): HvacDesignResult {
  const {
    widthM,
    lengthM,
    heightM,
    guests,
    ambientTempC,
    indoorTempC,
    windowRatioPct,
    roofExposedToSun,
    roofInsulated,
    useErv,
    daytimeEvent,
    hasAirCurtains,
  } = params;

  const areaM2 = widthM * lengthM;
  const volumeM3 = areaM2 * heightM;
  const perimeterM = 2 * (widthM + lengthM);
  const grossWallAreaM2 = perimeterM * heightM;
  const windowAreaM2 = Math.round(grossWallAreaM2 * (windowRatioPct / 100));
  const netWallAreaM2 = Math.max(0, grossWallAreaM2 - windowAreaM2);
  const deltaT = Math.max(5, ambientTempC - indoorTempC);

  // 1. People Load (ASHRAE Place of Worship / Church Liturgy & Weddings: 70W Sensible, 60W Latent)
  const peopleSensibleKw = (guests * 70) / 1000;
  const peopleLatentKw = (guests * 60) / 1000;

  // 2. Fresh Air Ventilation Load (ASHRAE 62.1 Place of Worship + Incense/Candles dilution: 8.0 CFM/person)
  // Aswan has very high Dry-Bulb (47°C) and dry desert air (~16-22% RH -> ~16 gr/lb moisture diff)
  const freshAirCfmTotal = Math.round(guests * 8.0);
  const deltaTF = deltaT * 1.8;
  const deltaGrains = 16;
  const rawVentSensibleKw = (1.08 * freshAirCfmTotal * deltaTF) / BTU_PER_KW;
  const rawVentLatentKw = (0.68 * freshAirCfmTotal * deltaGrains) / BTU_PER_KW;
  const ervMultiplier = useErv ? 0.42 : 1.0;
  const ventSensibleKw = rawVentSensibleKw * ervMultiplier;
  const ventLatentKw = rawVentLatentKw * (useErv ? 0.55 : 1.0);

  // 3. Concrete Ceiling + Underground Basement Floor Slab Load (1,000 m² concrete)
  // Underground Basement beneath Ground-Floor Church stays much cooler than outdoor air (~2.5°C delta across slab)
  const basementFloorSlabKw = (areaM2 * 1.4 * 2.5) / 1000;
  const roofU = roofExposedToSun ? (roofInsulated ? 0.6 : 2.15) : 1.35;
  const roofCltd = roofExposedToSun
    ? deltaT + (daytimeEvent ? 16 : 8)
    : 6.5; // Shielded by 1st Upper Floor + 2nd Upper Floor built above the Ground-Floor Church
  const roofSensibleKw = (areaM2 * roofU * roofCltd) / 1000 + basementFloorSlabKw;

  // 4. Concrete Exterior Walls (4 orientations in Aswan sun)
  const wallU = 1.65;
  const wallCltd = deltaT * (daytimeEvent ? 1.18 : 0.78);
  const wallSensibleKw = (netWallAreaM2 * wallU * wallCltd) / 1000;

  // 5. Perimeter Ventilation Windows (all 4 directions: Conduction + Direct Aswan Solar Gain)
  const windowU = 3.1; // Double glazed reflective thermal aluminum frame
  const windowConductionKw = (windowAreaM2 * windowU * deltaT) / 1000;
  const avgSolarWPerM2 = daytimeEvent ? 360 : 95;
  const shgcWithCurtains = daytimeEvent ? 0.36 : 0.25;
  const windowSolarKw = (windowAreaM2 * avgSolarWPerM2 * shgcWithCurtains) / 1000;
  const windowSensibleKw = windowConductionKw + windowSolarKw;

  // 6. Church Chandeliers, Sanctuary Spotlights, Audio/Mixers, Screens & Candles
  const lightingKw = (areaM2 * 20) / 1000; // 20 W/m² brass chandeliers + altar lighting
  const avAndCandlesKw = 7 + (guests / 1000) * 3; // Sound system, screens, candles/incense
  const internalSensibleKw = lightingKw + avAndCandlesKw * 0.85;
  const internalLatentKw = avAndCandlesKw * 0.15;

  // 7. Infiltration (Church doors opening for 1,000 attendees + perimeter window seals)
  const ach = hasAirCurtains ? 0.28 : 0.62;
  const infiltrationCfm = (volumeM3 * ach) / 1.699;
  const infSensibleKw = (1.08 * infiltrationCfm * deltaTF) / BTU_PER_KW;
  const infLatentKw = (0.68 * infiltrationCfm * deltaGrains) / BTU_PER_KW;

  const rawItems = [
    {
      id: 'people',
      nameAr: `حمل المصلين والحضور (${guests.toLocaleString('en-US')} فرد)`,
      detailAr: 'حرارة محسوسة 70W + حرارة كامنة 60W لكل فرد (معيار ASHRAE لدور العبادة والكنائس)',
      sensibleKw: peopleSensibleKw,
      latentKw: peopleLatentKw,
      color: '#38BDF8',
    },
    {
      id: 'ventilation',
      nameAr: useErv ? 'الهواء النقي وتجديد البخور (مع ERV)' : 'الهواء النقي وتجديد البخور (ASHRAE 62.1)',
      detailAr: `${freshAirCfmTotal.toLocaleString('en-US')} CFM عند ${ambientTempC}°C لتنقية جو الكنيسة من البخور (${useErv ? 'توفير ~58% بالـ ERV' : 'مباشر عبر الوحدات الأرضية'})`,
      sensibleKw: ventSensibleKw,
      latentKw: ventLatentKw,
      color: '#0EA5E9',
    },
    {
      id: 'roof',
      nameAr: roofExposedToSun
        ? roofInsulated
          ? 'السقف الخرساني المعرض للشمس (معزول) + أرضية البدروم'
          : 'السقف الخرساني المعرض للشمس (بدون عزل) + أرضية البدروم'
        : 'سقف الكنيسة بالدور الأرضي (يعلوه أول وثاني علوي) + سقف البدروم',
      detailAr: `مساحة ${areaM2.toLocaleString('en-US')} م² · يعلوها دوران علويان يحجبان الشمس تماماً ويحدها بدروم بارد من الأسفل`,
      sensibleKw: roofSensibleKw,
      latentKw: 0,
      color: '#F59E0B',
    },
    {
      id: 'windows',
      nameAr: 'الشبابيك في الـ 4 اتجاهات (قداسات نهارية + مناسبات ليلية)',
      detailAr: `مساحة زجاج ${windowAreaM2} م² (${windowRatioPct}%) — ${daytimeEvent ? 'ذروة شمس أسوان النهارية مع زجاج عاكس وستائر' : 'حمل مسائي بعد غروب الشمس'}`,
      sensibleKw: windowSensibleKw,
      latentKw: 0,
      color: '#FB923C',
    },
    {
      id: 'equipment',
      nameAr: 'النجف وإضاءة الهيكل والصوتيات والشاشات والشموع',
      detailAr: 'ثريات صحن الكنيسة + كشافات حامل الأيقونات + نظام الصوت والميكروفونات',
      sensibleKw: internalSensibleKw,
      latentKw: internalLatentKw,
      color: '#A78BFA',
    },
    {
      id: 'walls',
      nameAr: 'الحوائط الخرسانية الخارجية',
      detailAr: `مساحة صافية ${netWallAreaM2} م² في جميع الجهات الأربع`,
      sensibleKw: wallSensibleKw,
      latentKw: 0,
      color: '#94A3B8',
    },
    {
      id: 'infiltration',
      nameAr: hasAirCurtains ? 'تسرب الهواء (مع ستائر هوائية للأبواب)' : 'تسرب الهواء (بدون ستائر هوائية)',
      detailAr: `حركة دخول المصلين والحضور وتسرب إطارات الشبابيك (${Math.round(infiltrationCfm)} CFM)`,
      sensibleKw: infSensibleKw,
      latentKw: infLatentKw,
      color: '#64748B',
    },
  ];

  const subtotalSensibleKw = rawItems.reduce((acc, item) => acc + item.sensibleKw, 0);
  const subtotalLatentKw = rawItems.reduce((acc, item) => acc + item.latentKw, 0);
  const subtotalKw = subtotalSensibleKw + subtotalLatentKw;

  // 10% Safety & Duct Heat Gain Factor
  const safetyFactorKw = subtotalKw * 0.1;
  const totalCoolingKw = subtotalKw + safetyFactorKw;
  const totalBtuHr = totalCoolingKw * BTU_PER_KW;
  const requiredTons = totalCoolingKw / KW_PER_TR;
  const sensibleHeatRatio = subtotalSensibleKw / Math.max(0.01, subtotalKw);

  const loads: LoadItem[] = [
    ...rawItems.map((item) => {
      const total = item.sensibleKw + item.latentKw;
      return {
        ...item,
        totalKw: total,
        btuHr: total * BTU_PER_KW,
        tons: total / KW_PER_TR,
        sharePct: (total / totalCoolingKw) * 100,
      };
    }),
    {
      id: 'safety',
      nameAr: 'معامل الأمان وفواقد الدكت (+10%)',
      detailAr: 'تعويض حرارة المراوح وفواقد مجاري الهواء فوق السقف المستعار',
      sensibleKw: safetyFactorKw * 0.85,
      latentKw: safetyFactorKw * 0.15,
      totalKw: safetyFactorKw,
      btuHr: safetyFactorKw * BTU_PER_KW,
      tons: safetyFactorKw / KW_PER_TR,
      sharePct: (safetyFactorKw / totalCoolingKw) * 100,
      color: '#475569',
    },
  ];

  // Optimal modular zoning: 4 symmetrical Rooftop Package Units (to keep duct height <= 45cm for 4m ceiling!)
  const unitCount = 4;
  const rawUnitTons = requiredTons / unitCount;
  const standardUnitSizes = [20, 25, 30, 35, 40, 45, 50, 55, 60];
  const nominalUnitTons =
    standardUnitSizes.find((s) => s >= rawUnitTons) ?? Math.ceil(rawUnitTons / 5) * 5;
  const installedTotalTons = nominalUnitTons * unitCount;

  // Egyptian HVAC Market Cooling Horsepower (1 TR = 12,000 BTU/hr = 1.5 Cooling HP @ 8,000 BTU/HP)
  const requiredCoolingHp = requiredTons * 1.5;
  const coolingHpPerUnit = nominalUnitTons * 1.5;
  const totalCoolingHp = installedTotalTons * 1.5;

  // Airflow: 400 CFM per TR (standard commercial comfort cooling)
  const cfmPerUnit = nominalUnitTons * 400;
  const totalSupplyCfm = cfmPerUnit * unitCount;
  const freshAirCfmPerUnit = Math.round(freshAirCfmTotal / unitCount);
  const exhaustCfmTotal = Math.round(freshAirCfmTotal * 0.82); // Keep +18% positive pressure

  // 16 diffusers per 250m² zone (4×4 grid = 64 diffusers total across 25m×40m)
  const diffusersPerUnit = 16;
  const totalDiffusers = diffusersPerUnit * unitCount;
  const cfmPerDiffuser = Math.round(cfmPerUnit / diffusersPerUnit);

  // Height constraint math for 4.0m concrete soffit
  // Cap duct height at 40-45cm so clear finished ceiling stays >= 3.25m - 3.35m!
  const maxDuctHeightCm = nominalUnitTons >= 45 ? 45 : 40;
  const clearCeilingHeightM = Number(
    Math.max(2.6, heightM - (maxDuctHeightCm / 100 + 0.25)).toFixed(2),
  );

  // Equal Friction Duct Sizing per Unit (split at roof plenum into 2 twin trunks of 50% CFM for aspect ratio <= 3:1!)
  const calcRectWidthCm = (cfm: number, velocityFpm: number, fixedHeightCm: number): number => {
    const areaFt2 = cfm / velocityFpm;
    const areaM2Duct = areaFt2 * 0.092903;
    const widthM = areaM2Duct / (fixedHeightCm / 100);
    return roundTo5(widthM * 100);
  };

  const plenumWidthCm = calcRectWidthCm(cfmPerUnit, 1650, maxDuctHeightCm + 5);
  const twinTrunkCfm = Math.round(cfmPerUnit / 2);
  const twinTrunkW = calcRectWidthCm(twinTrunkCfm, 1300, maxDuctHeightCm);
  const midBranchCfm = Math.round(cfmPerUnit / 4);
  const midBranchW = calcRectWidthCm(midBranchCfm, 1050, 35);
  const endTrunkCfm = Math.round(cfmPerUnit / 8);
  const endTrunkW = calcRectWidthCm(endTrunkCfm, 850, 30);
  const diffuserNeckW = calcRectWidthCm(cfmPerDiffuser, 650, 25);

  const returnPerUnit = Math.max(4000, cfmPerUnit - freshAirCfmPerUnit);
  const returnTwinCfm = Math.round(returnPerUnit / 2);
  const returnTwinW = calcRectWidthCm(returnTwinCfm, 1050, maxDuctHeightCm);
  const freshW = calcRectWidthCm(freshAirCfmPerUnit, 950, 30);

  const ducts: DuctSegment[] = [
    {
      id: 'plenum',
      labelAr: 'صاعد الدكت الرأسي الخارجي من الوحدة الأرضية (Vertical Supply Riser)',
      role: 'supply',
      cfmPerUnit,
      velocityFpm: 1650,
      widthCm: plenumWidthCm,
      heightCm: maxDuctHeightCm + 5,
      widthIn: cmToIn(plenumWidthCm),
      heightIn: cmToIn(maxDuctHeightCm + 5),
      gauge: 'Gauge 18',
      thicknessMm: '1.2 مم',
      insulationAr:
        'عزل صوف زجاجي 50 مم (كثافة 48 كجم/م³) + تغليف كلادينج ألومنيوم 0.7 مم مقاوم لشمس أسوان',
      countNoteAr: 'صاعد رأسي لكل وحدة أرضية (4 صواعد خارجية)',
    },
    {
      id: 'twin-trunk',
      labelAr: 'الخط الرئيسي المزدوج للتغذية داخل السقف (Main Supply Trunk)',
      role: 'supply',
      cfmPerUnit: twinTrunkCfm,
      velocityFpm: 1300,
      widthCm: twinTrunkW,
      heightCm: maxDuctHeightCm,
      widthIn: cmToIn(twinTrunkW),
      heightIn: cmToIn(maxDuctHeightCm),
      gauge: 'Gauge 20',
      thicknessMm: '1.0 مم',
      insulationAr: 'صوف زجاجي 25 مم مغلف فويل ألومنيوم (R-6) داخل فراغ السقف المستعار',
      countNoteAr: 'خطان لكل وحدة (8 خطوط عرضية/طولية)',
    },
    {
      id: 'mid-branch',
      labelAr: 'المقطع الأوسط بعد التدرج (Mid-Run Reducer)',
      role: 'supply',
      cfmPerUnit: midBranchCfm,
      velocityFpm: 1050,
      widthCm: midBranchW,
      heightCm: 35,
      widthIn: cmToIn(midBranchW),
      heightIn: cmToIn(35),
      gauge: 'Gauge 22',
      thicknessMm: '0.8 مم',
      insulationAr: 'صوف زجاجي 25 مم + دامبر تحكم وموازنة VCD',
      countNoteAr: '4 مقاطع لكل وحدة',
    },
    {
      id: 'end-trunk',
      labelAr: 'نهاية الخط الرئيسي (End Run Section)',
      role: 'supply',
      cfmPerUnit: endTrunkCfm,
      velocityFpm: 850,
      widthCm: endTrunkW,
      heightCm: 30,
      widthIn: cmToIn(endTrunkW),
      heightIn: cmToIn(30),
      gauge: 'Gauge 24',
      thicknessMm: '0.6 مم',
      insulationAr: 'صوف زجاجي 25 مم مغلف فويل ألومنيوم',
      countNoteAr: '4 نهايات لكل وحدة',
    },
    {
      id: 'diffuser-branch',
      labelAr: 'تفريعة مخرج الهواء (Diffuser Takeoff + Box)',
      role: 'supply',
      cfmPerUnit: cfmPerDiffuser,
      velocityFpm: 650,
      widthCm: diffuserNeckW,
      heightCm: 25,
      widthIn: cmToIn(diffuserNeckW),
      heightIn: cmToIn(25),
      gauge: 'Gauge 24 / Flex Ø14"',
      thicknessMm: '0.6 مم',
      insulationAr: 'فلكسبل معزول بطول أقصى 1.5م يغذي دفيوزر 60×60 سم رباعي',
      countNoteAr: `${diffusersPerUnit} مخرج/وحدة (${totalDiffusers} إجمالي)`,
    },
    {
      id: 'return-trunk',
      labelAr: 'خط وصاعد الهواء الراجع (Return Air Trunk & Riser)',
      role: 'return',
      cfmPerUnit: returnTwinCfm,
      velocityFpm: 1050,
      widthCm: returnTwinW,
      heightCm: maxDuctHeightCm,
      widthIn: cmToIn(returnTwinW),
      heightIn: cmToIn(maxDuctHeightCm),
      gauge: 'Gauge 20',
      thicknessMm: '1.0 مم',
      insulationAr: 'تبطين صوتي داخلي 25 مم (<38 NC) + كلادينج للجزء الرأسي الخارجي',
      countNoteAr: 'خط راجع لكل وحدة يعود للماكينة الأرضية',
    },
    {
      id: 'fresh-air',
      labelAr: 'مأخذ الهواء النقي الخارجي (Fresh Air Intake)',
      role: 'fresh',
      cfmPerUnit: freshAirCfmPerUnit,
      velocityFpm: 950,
      widthCm: freshW,
      heightCm: 30,
      widthIn: cmToIn(freshW),
      heightIn: cmToIn(30),
      gauge: 'Gauge 22',
      thicknessMm: '0.8 مم',
      insulationAr: 'فلتر أتربة قابل للغسيل (مهم لمناخ أسوان) + دامبر هواء نقي موتوريزد',
      countNoteAr: '1 مأخذ مدمج بكل وحدة أرضية',
    },
  ];

  // Electrical 380V 3-Phase Calculation (T3 Tropical Commercial Unit: ~1.34 kW/TR at 47°C Aswan, ~1.03 kW/TR at 30°C mild)
  const kwPerTon = Math.max(0.92, 1.18 + (ambientTempC - 38) * 0.018);
  const voltage = 380;
  const phases = 3;
  const powerFactor = 0.85;
  const runningKwPerUnit = nominalUnitTons * kwPerTon;
  const totalRunningKw = runningKwPerUnit * unitCount;
  const totalKva = totalRunningKw / powerFactor;
  const runningAmpsPerUnit = (runningKwPerUnit * 1000) / (Math.sqrt(3) * voltage * powerFactor);
  const totalRunningAmps = runningAmpsPerUnit * unitCount;
  const mcaAmpsPerUnit = runningAmpsPerUnit * 1.25;
  const unitBreakerA = pickBreaker(runningAmpsPerUnit * 1.15);
  const mainBreakerA = pickBreaker(totalRunningAmps * 1.1);
  const recommendedTransformerKva =
    [250, 315, 400, 500, 630].find((k) => k >= totalKva * 1.25) ?? 800;

  const electricalHpPerUnit = runningKwPerUnit / 0.746;
  const totalElectricalHp = totalRunningKw / 0.746;

  return {
    areaM2,
    volumeM3,
    perimeterM,
    windowAreaM2,
    netWallAreaM2,
    loads,
    subtotalSensibleKw,
    subtotalLatentKw,
    subtotalKw,
    safetyFactorKw,
    totalCoolingKw,
    totalBtuHr,
    requiredTons,
    requiredCoolingHp,
    sensibleHeatRatio,
    unitCount,
    nominalUnitTons,
    installedTotalTons,
    coolingHpPerUnit,
    totalCoolingHp,
    electricalHpPerUnit,
    totalElectricalHp,
    cfmPerUnit,
    totalSupplyCfm,
    freshAirCfmTotal,
    freshAirCfmPerUnit,
    exhaustCfmTotal,
    diffusersPerUnit,
    totalDiffusers,
    cfmPerDiffuser,
    clearCeilingHeightM,
    maxDuctHeightCm,
    ducts,
    electrical: {
      voltage,
      phases,
      powerFactor,
      kwPerTon,
      runningKwPerUnit,
      totalRunningKw,
      totalKva,
      runningAmpsPerUnit,
      totalRunningAmps,
      mcaAmpsPerUnit,
      unitBreakerA,
      mainBreakerA,
      unitCableSpec: pickUnitCable(unitBreakerA),
      mainCableSpec: pickMainCable(mainBreakerA),
      recommendedTransformerKva,
    },
  };
}
