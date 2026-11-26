import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createProceduralTextures, ProceduralTextures } from './textures';

export type CameraPresetId = 'exterior' | 'xray' | 'interior' | 'units' | 'topdown';

export interface InspectableComponentInfo {
  id: string;
  titleAr: string;
  specAr: string;
  category: 'rtu' | 'supply' | 'return' | 'structure' | 'interior';
}

export interface HallSceneCallbacks {
  onSelectPart?: (info: InspectableComponentInfo | null) => void;
  onWebglError?: () => void;
  onVideoTourChange?: (active: boolean) => void;
}

export interface HallSceneOptions {
  nominalUnitTons: number;
  cfmPerUnit: number;
  mainDuctSizeLabel: string;
  returnDuctSizeLabel: string;
  unitBreakerA: number;
}

const HALL_W = 25;
const HALL_L = 40;
const BASEMENT_H = 1.15; // Semi-subterranean basement visible plinth with vent windows below Ground-Floor Church
const HALL_H = 4.0;      // Ground-Floor Church Sanctuary height (exact 4.0m)
const UPPER1_H = 3.2;    // 1st Upper Floor built directly above Church
const UPPER2_H = 3.2;    // 2nd Upper Floor built above 1st Upper Floor (empty flat roof above!)
const FLOOR1_Y = BASEMENT_H;
const FLOOR2_Y = FLOOR1_Y + HALL_H;
const SLAB_THICK = 0.25;
const WALL_THICK = 0.35;

// Reusable module-scope math objects (Zero GC in render loop)
const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _pointer = new THREE.Vector2();
const _dummy = new THREE.Object3D();

const CAMERA_PRESETS: Record<
  CameraPresetId,
  { pos: [number, number, number]; target: [number, number, number]; lift: number; xray: boolean }
> = {
  exterior: { pos: [38, 22, 40], target: [0, FLOOR1_Y + 3.8, 0], lift: 0, xray: false },
  xray: { pos: [35, 25, 35], target: [0, FLOOR1_Y + 2.4, 0], lift: 10.5, xray: true },
  interior: { pos: [0, FLOOR1_Y + 2.1, 16.2], target: [0, FLOOR1_Y + 1.9, -14], lift: 0, xray: false },
  units: { pos: [29, 6.2, 22], target: [HALL_W / 2 + 2.2, 2.4, 2], lift: 0, xray: false },
  topdown: { pos: [0.1, FLOOR1_Y + 52, 0.1], target: [0, FLOOR1_Y + 1.5, 0], lift: 16.5, xray: true },
};

function detectSoftwareGl(): boolean {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

export class HallSceneController {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private textures!: ProceduralTextures;
  private isSoftwareGl: boolean;
  private callbacks: HallSceneCallbacks;
  private options: HallSceneOptions;

  // Scene groups
  private siteGroup = new THREE.Group();
  private buildingGroup = new THREE.Group();
  private upperFloorGroup = new THREE.Group(); // 2nd floor above hall (lifts cleanly in cutaway!)
  private groundUnitsGroup = new THREE.Group(); // Ground-level 380V T3 units + vertical risers!
  private ceilingGroup = new THREE.Group();
  private ductworkGroup = new THREE.Group();
  private interiorGroup = new THREE.Group();
  private airflowGroup = new THREE.Group();
  private cadGridGroup = new THREE.Group();
  private cadEdges: THREE.LineSegments[] = [];

  private fanBlades: THREE.Object3D[] = [];
  private wallMaterials: THREE.MeshStandardMaterial[] = [];
  private inspectables: THREE.Object3D[] = [];
  private raycaster = new THREE.Raycaster();

  // Airflow particle buffers
  private airflowPoints: THREE.Points | null = null;
  private airflowPositions: Float32Array | null = null;
  private airflowOrigins: Float32Array | null = null;
  private airflowSpeeds: Float32Array | null = null;
  private airflowCount = 768;

  // Transition & interactive states
  private targetRoofLift = 0;
  private currentRoofLift = 0;
  private targetXray = false;
  private currentWallOpacity = 1;
  private cadMode = false;
  private videoTourActive = false;
  private videoTourTime = 0;
  private showAirflow = true;
  private cameraTransitionActive = false;
  private lastTime = performance.now();
  private frameId = 0;
  private disposed = false;
  private resizeObserver: ResizeObserver | null = null;
  private selectedHighlightMesh: THREE.Mesh | null = null;
  private selectedOriginalEmissive = new THREE.Color(0x000000);

  constructor(
    container: HTMLElement,
    options: HallSceneOptions,
    callbacks: HallSceneCallbacks = {},
  ) {
    this.container = container;
    this.options = options;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareGl();

    try {
      this.initRendererAndScene();
      this.buildSiteEnvironment();
      this.buildConcreteBuilding();
      this.buildUpperFloorAboveHall();
      this.buildGroundMountedUnitsAndRisers();
      this.buildCeilingAndDuctwork();
      this.buildWeddingHallInterior();
      this.buildAirflowParticles();
      this.buildCadOverlay();
      this.bindEvents();

      if (!this.isSoftwareGl) {
        this.renderer.compile(this.scene, this.camera);
      }

      // Start in crisp X-Ray cutaway angle showing Ground-Mounted Units + Risers + First Floor Ductwork + 2nd Floor lifted!
      this.applyCameraPreset('xray', true);
      this.tick();
    } catch {
      this.callbacks.onWebglError?.();
    }
  }

  private initRendererAndScene() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1520);
    this.scene.fog = new THREE.FogExp2(0x0d1520, 0.0058);

    this.camera = new THREE.PerspectiveCamera(44, width / height, 0.2, 280);
    this.camera.position.set(36, 25, 36);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.textures = createProceduralTextures(this.renderer.capabilities.getMaxAnisotropy());

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI * 0.485;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 95;
    this.controls.target.set(0, FLOOR1_Y + 2.2, 0);

    this.controls.addEventListener('start', () => {
      this.cameraTransitionActive = false;
      if (this.videoTourActive) {
        this.videoTourActive = false;
        this.callbacks.onVideoTourChange?.(false);
      }
    });

    // Warm Aswan Sun Key Light + Cool Sky Fill + Rim Light
    const hemi = new THREE.HemisphereLight(0xd4e8ff, 0x352c22, 0.95);
    this.scene.add(hemi);

    const keySun = new THREE.DirectionalLight(0xffeed4, 2.25);
    keySun.position.set(38, 48, 32);
    keySun.castShadow = !this.isSoftwareGl;
    keySun.shadow.mapSize.set(2048, 2048);
    keySun.shadow.camera.near = 10;
    keySun.shadow.camera.far = 140;
    const d = 44;
    keySun.shadow.camera.left = -d;
    keySun.shadow.camera.right = d;
    keySun.shadow.camera.top = d;
    keySun.shadow.camera.bottom = -d;
    keySun.shadow.bias = -0.0005;
    keySun.shadow.normalBias = 0.025;
    this.scene.add(keySun);

    const rimCool = new THREE.DirectionalLight(0x7cc4fa, 0.8);
    rimCool.position.set(-36, 22, -30);
    this.scene.add(rimCool);

    const hallWarm1 = new THREE.PointLight(0xffe1b5, 16, 28, 1.5);
    hallWarm1.position.set(0, FLOOR1_Y + 3.1, -10);
    this.scene.add(hallWarm1);

    const hallWarm2 = new THREE.PointLight(0xffe1b5, 16, 28, 1.5);
    hallWarm2.position.set(0, FLOOR1_Y + 3.1, 10);
    this.scene.add(hallWarm2);

    this.raycaster.layers.set(1);
  }

  private registerInspectable(obj: THREE.Object3D, info: InspectableComponentInfo) {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.layers.enable(1);
        child.userData.inspectInfo = info;
      }
    });
    this.inspectables.push(obj);
  }

  private addCadEdge(mesh: THREE.Mesh, colorHex: number, parent: THREE.Object3D) {
    const edges = new THREE.EdgesGeometry(mesh.geometry, 24);
    const lineMat = new THREE.LineBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.85,
    });
    const seg = new THREE.LineSegments(edges, lineMat);
    seg.position.copy(mesh.position);
    seg.rotation.copy(mesh.rotation);
    seg.scale.copy(mesh.scale);
    seg.visible = false;
    parent.add(seg);
    this.cadEdges.push(seg);
  }

  private buildSiteEnvironment() {
    const groundGeo = new THREE.PlaneGeometry(260, 260);
    const groundMat = new THREE.MeshStandardMaterial({
      map: this.textures.pavingPlaza,
      roughness: 0.88,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.04;
    ground.receiveShadow = true;
    this.siteGroup.add(ground);

    const contactMat = new THREE.MeshBasicMaterial({
      map: this.textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    const contactPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(HALL_W + 14, HALL_L + 10),
      contactMat,
    );
    contactPlane.rotation.x = -Math.PI / 2;
    contactPlane.position.y = -0.01;
    this.siteGroup.add(contactPlane);

    // Wide paved service yard apron accommodating East & West Ground-Mounted HVAC Units!
    const apronMat = new THREE.MeshStandardMaterial({
      color: 0x3b4654,
      roughness: 0.85,
      metalness: 0.05,
    });
    const apron = new THREE.Mesh(new THREE.BoxGeometry(HALL_W + 14, 0.08, HALL_L + 8), apronMat);
    apron.position.y = 0.02;
    apron.receiveShadow = true;
    this.siteGroup.add(apron);

    const walkMat = new THREE.MeshStandardMaterial({
      color: 0x566373,
      roughness: 0.72,
      metalness: 0.08,
    });
    const walkway = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.09, 11), walkMat);
    walkway.position.set(0, 0.025, HALL_L / 2 + 7);
    walkway.receiveShadow = true;
    this.siteGroup.add(walkway);

    // Outer Landscaped Planters (beyond the East/West HVAC equipment yards)
    const turfMat = new THREE.MeshStandardMaterial({ color: 0x264432, roughness: 0.92 });
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 });
    const planterPositions: [number, number, number, number][] = [
      [-HALL_W / 2 - 8.5, 0, 2.2, HALL_L + 2],
      [HALL_W / 2 + 8.5, 0, 2.2, HALL_L + 2],
      [-8.6, HALL_L / 2 + 6.2, 7.2, 2.4],
      [8.6, HALL_L / 2 + 6.2, 7.2, 2.4],
    ];
    planterPositions.forEach(([x, z, w, d]) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.22, d + 0.3), curbMat);
      curb.position.set(x, 0.11, z);
      this.siteGroup.add(curb);
      const turf = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), turfMat);
      turf.position.set(x, 0.13, z);
      this.siteGroup.add(turf);
    });

    // Architectural Trees / Palms along outer perimeter
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x624938, roughness: 0.92 });
    const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x2e613e, roughness: 0.78 });
    const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x3c794e, roughness: 0.76 });
    const treeCoords: [number, number][] = [
      [-21, -15], [-21, -5], [-21, 5], [-21, 15],
      [21, -15], [21, -5], [21, 5], [21, 15],
      [-9.8, 26.2], [9.8, 26.2],
    ];
    treeCoords.forEach(([tx, tz], idx) => {
      const tree = new THREE.Group();
      const s = 0.9 + (idx % 3) * 0.12;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 2.4 * s, 8), trunkMat);
      trunk.position.y = 1.2 * s;
      trunk.castShadow = true;
      tree.add(trunk);

      const canopyLower = new THREE.Mesh(new THREE.DodecahedronGeometry(1.18 * s, 1), leafMat1);
      canopyLower.position.set(0, 2.75 * s, 0);
      canopyLower.scale.set(1.15, 0.82, 1.15);
      canopyLower.castShadow = true;
      tree.add(canopyLower);

      const canopyUpper = new THREE.Mesh(new THREE.DodecahedronGeometry(0.84 * s, 1), leafMat2);
      canopyUpper.position.set(0.2 * s, 3.55 * s, -0.15 * s);
      canopyUpper.castShadow = true;
      tree.add(canopyUpper);

      tree.position.set(tx, 0.2, tz);
      this.siteGroup.add(tree);
    });

    this.scene.add(this.siteGroup);
  }

  private buildConcreteBuilding() {
    // Semi-Subterranean Basement Plinth beneath the Ground-Floor Church (with low horizontal vent grilles)
    const basementMat = new THREE.MeshStandardMaterial({
      map: this.textures.concreteWall,
      color: 0x87837b,
      roughness: 0.88,
      metalness: 0.05,
      transparent: true,
      opacity: 1,
    });
    this.wallMaterials.push(basementMat);

    const basementCore = new THREE.Mesh(
      new THREE.BoxGeometry(HALL_W - 0.3, BASEMENT_H - 0.15, HALL_L - 0.3),
      basementMat,
    );
    basementCore.position.y = (BASEMENT_H - 0.15) / 2;
    basementCore.castShadow = true;
    basementCore.receiveShadow = true;
    this.buildingGroup.add(basementCore);
    this.addCadEdge(basementCore, 0x334155, this.buildingGroup);

    // Low horizontal basement ventilation grilles along East & West basement walls
    const basementVentMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.45,
      metalness: 0.65,
    });
    [-1, 1].forEach((side) => {
      for (let z = -15; z <= 15; z += 5) {
        const bVent = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 2.2), basementVentMat);
        bVent.position.set(side * (HALL_W / 2 - 0.12), BASEMENT_H * 0.48, z);
        this.buildingGroup.add(bVent);
      }
    });

    const columnMat = new THREE.MeshStandardMaterial({
      color: 0xc2bcb2,
      roughness: 0.72,
      metalness: 0.06,
    });
    for (let z = -HALL_L / 2; z <= HALL_L / 2 + 0.01; z += 5) {
      [-HALL_W / 2, HALL_W / 2].forEach((x) => {
        const gCol = new THREE.Mesh(new THREE.BoxGeometry(0.56, BASEMENT_H, 0.56), columnMat);
        gCol.position.set(x, BASEMENT_H / 2, z);
        gCol.castShadow = true;
        this.buildingGroup.add(gCol);
      });
    }

    // Short 5-Step Church Entrance Staircase from Courtyard up to Ground-Floor Church (over Basement)
    const stairMat = new THREE.MeshStandardMaterial({
      color: 0xd8d2c7,
      roughness: 0.65,
      metalness: 0.08,
    });
    for (let s = 0; s < 5; s++) {
      const stepH = (FLOOR1_Y / 5) * (s + 1);
      const step = new THREE.Mesh(new THREE.BoxGeometry(7.2, stepH, 0.46), stairMat);
      step.position.set(0, stepH / 2, HALL_L / 2 + 2.4 - s * 0.44);
      step.receiveShadow = true;
      this.buildingGroup.add(step);
    }

    // Ground-Floor Church Concrete Slab (Roof of Basement) + Marble Interior Floor
    const slabFirstFloor = new THREE.Mesh(
      new THREE.BoxGeometry(HALL_W + 0.8, 0.3, HALL_L + 0.8),
      columnMat,
    );
    slabFirstFloor.position.y = FLOOR1_Y - 0.15;
    slabFirstFloor.receiveShadow = true;
    this.buildingGroup.add(slabFirstFloor);
    this.addCadEdge(slabFirstFloor, 0x38bdf8, this.buildingGroup);

    const floorMat = new THREE.MeshStandardMaterial({
      map: this.textures.marbleFloor,
      roughness: 0.22,
      metalness: 0.08,
    });
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(HALL_W - WALL_THICK * 2, 0.04, HALL_L - WALL_THICK * 2),
      floorMat,
    );
    floor.position.y = FLOOR1_Y + 0.02;
    floor.receiveShadow = true;
    this.buildingGroup.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({
      map: this.textures.concreteWall,
      color: 0xdcd6cc,
      roughness: 0.78,
      metalness: 0.04,
      transparent: true,
      opacity: 1,
    });
    this.wallMaterials.push(wallMat);

    const mullionMat = new THREE.MeshStandardMaterial({
      color: 0x2a3441,
      roughness: 0.35,
      metalness: 0.72,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x7db7d9,
      roughness: 0.12,
      metalness: 0.1,
      transmission: this.isSoftwareGl ? 0 : 0.62,
      transparent: true,
      opacity: this.isSoftwareGl ? 0.38 : 0.5,
      ior: 1.5,
      thickness: 0.2,
      depthWrite: false,
    });

    const buildWindowedFacade = (
      axis: 'X' | 'Z',
      fixedCoord: number,
      totalSpan: number,
      bayCount: number,
      skipCenterEntrance = false,
    ) => {
      const bayWidth = totalSpan / bayCount;
      const sillHeight = 1.05;
      const windowHeight = 2.05;
      const lintelHeight = HALL_H - sillHeight - windowHeight;

      const facadeGroup = new THREE.Group();

      for (let i = 0; i < bayCount; i++) {
        const offset = -totalSpan / 2 + bayWidth * (i + 0.5);
        const isCenterBay = skipCenterEntrance && Math.abs(offset) < bayWidth * 0.6;

        const colPos = -totalSpan / 2 + i * bayWidth;
        const col = new THREE.Mesh(new THREE.BoxGeometry(0.48, HALL_H, 0.48), columnMat);
        if (axis === 'X') col.position.set(colPos, FLOOR1_Y + HALL_H / 2, fixedCoord);
        else col.position.set(fixedCoord, FLOOR1_Y + HALL_H / 2, colPos);
        col.castShadow = true;
        col.receiveShadow = true;
        facadeGroup.add(col);
        this.addCadEdge(col, 0x64748b, facadeGroup);

        const clearBay = bayWidth - 0.48;
        if (isCenterBay) {
          const lintel = new THREE.Mesh(
            axis === 'X'
              ? new THREE.BoxGeometry(clearBay, 1.1, WALL_THICK)
              : new THREE.BoxGeometry(WALL_THICK, 1.1, clearBay),
            wallMat,
          );
          if (axis === 'X') lintel.position.set(offset, FLOOR1_Y + HALL_H - 0.55, fixedCoord);
          else lintel.position.set(fixedCoord, FLOOR1_Y + HALL_H - 0.55, offset);
          facadeGroup.add(lintel);

          const doorGlass = new THREE.Mesh(
            axis === 'X'
              ? new THREE.BoxGeometry(clearBay - 0.2, 2.8, 0.08)
              : new THREE.BoxGeometry(0.08, 2.8, clearBay - 0.2),
            glassMat,
          );
          if (axis === 'X') doorGlass.position.set(offset, FLOOR1_Y + 1.4, fixedCoord);
          else doorGlass.position.set(fixedCoord, FLOOR1_Y + 1.4, offset);
          facadeGroup.add(doorGlass);
          continue;
        }

        const sill = new THREE.Mesh(
          axis === 'X'
            ? new THREE.BoxGeometry(clearBay, sillHeight, WALL_THICK)
            : new THREE.BoxGeometry(WALL_THICK, sillHeight, clearBay),
          wallMat,
        );
        if (axis === 'X') sill.position.set(offset, FLOOR1_Y + sillHeight / 2, fixedCoord);
        else sill.position.set(fixedCoord, FLOOR1_Y + sillHeight / 2, offset);
        sill.castShadow = true;
        sill.receiveShadow = true;
        facadeGroup.add(sill);
        this.addCadEdge(sill, 0x475569, facadeGroup);

        const lintel = new THREE.Mesh(
          axis === 'X'
            ? new THREE.BoxGeometry(clearBay, lintelHeight, WALL_THICK)
            : new THREE.BoxGeometry(WALL_THICK, lintelHeight, clearBay),
          wallMat,
        );
        if (axis === 'X') lintel.position.set(offset, FLOOR1_Y + HALL_H - lintelHeight / 2, fixedCoord);
        else lintel.position.set(fixedCoord, FLOOR1_Y + HALL_H - lintelHeight / 2, offset);
        lintel.castShadow = true;
        facadeGroup.add(lintel);
        this.addCadEdge(lintel, 0x475569, facadeGroup);

        const winY = FLOOR1_Y + sillHeight + windowHeight / 2;
        const pane = new THREE.Mesh(
          axis === 'X'
            ? new THREE.BoxGeometry(clearBay - 0.16, windowHeight - 0.14, 0.07)
            : new THREE.BoxGeometry(0.07, windowHeight - 0.14, clearBay - 0.16),
          glassMat,
        );
        if (axis === 'X') pane.position.set(offset, winY, fixedCoord);
        else pane.position.set(fixedCoord, winY, offset);
        pane.renderOrder = 2;
        facadeGroup.add(pane);
        this.addCadEdge(pane, 0x38bdf8, facadeGroup);

        const vMullion = new THREE.Mesh(
          axis === 'X'
            ? new THREE.BoxGeometry(0.08, windowHeight, 0.16)
            : new THREE.BoxGeometry(0.16, windowHeight, 0.08),
          mullionMat,
        );
        if (axis === 'X') vMullion.position.set(offset, winY, fixedCoord);
        else vMullion.position.set(fixedCoord, winY, offset);
        facadeGroup.add(vMullion);

        const hTransom = new THREE.Mesh(
          axis === 'X'
            ? new THREE.BoxGeometry(clearBay, 0.08, 0.18)
            : new THREE.BoxGeometry(0.18, 0.08, clearBay),
          mullionMat,
        );
        if (axis === 'X') hTransom.position.set(offset, winY + 0.35, fixedCoord);
        else hTransom.position.set(fixedCoord, winY + 0.35, offset);
        facadeGroup.add(hTransom);
      }

      const endCol = new THREE.Mesh(new THREE.BoxGeometry(0.52, HALL_H, 0.52), columnMat);
      if (axis === 'X') endCol.position.set(totalSpan / 2, FLOOR1_Y + HALL_H / 2, fixedCoord);
      else endCol.position.set(fixedCoord, FLOOR1_Y + HALL_H / 2, totalSpan / 2);
      facadeGroup.add(endCol);
      this.addCadEdge(endCol, 0x64748b, facadeGroup);

      return facadeGroup;
    };

    const westWall = buildWindowedFacade('Z', -HALL_W / 2, HALL_L, 8);
    const eastWall = buildWindowedFacade('Z', HALL_W / 2, HALL_L, 8);
    const northWall = buildWindowedFacade('X', -HALL_L / 2, HALL_W, 5);
    const southWall = buildWindowedFacade('X', HALL_L / 2, HALL_W, 5, true);

    this.buildingGroup.add(westWall, eastWall, northWall, southWall);

    this.registerInspectable(eastWall, {
      id: 'windows-perimeter',
      titleAr: 'شبابيك التهوية في الـ 4 اتجاهات (الدور الأرضي — أسوان)',
      specAr: 'زجاج دبل عاكس حراري محكم الغلق أثناء تشغيل التكييف النهاري والليلي مع ستائر حجب شمس',
      category: 'structure',
    });

    // Grand First-Floor Entrance Portico Canopy
    const portico = new THREE.Group();
    const canopySlab = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.36, 3.4), columnMat);
    canopySlab.position.set(0, FLOOR1_Y + 3.55, HALL_L / 2 + 1.7);
    canopySlab.castShadow = true;
    portico.add(canopySlab);

    const canopyTrim = new THREE.Mesh(
      new THREE.BoxGeometry(8.3, 0.08, 3.5),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.45 }),
    );
    canopyTrim.position.set(0, FLOOR1_Y + 3.34, HALL_L / 2 + 1.7);
    portico.add(canopyTrim);

    [-3.5, 3.5].forEach((px) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.55, FLOOR1_Y + 3.4, 0.55), columnMat);
      pillar.position.set(px, (FLOOR1_Y + 3.4) / 2, HALL_L / 2 + 3.0);
      pillar.castShadow = true;
      portico.add(pillar);
    });
    this.buildingGroup.add(portico);

    this.scene.add(this.buildingGroup);
  }

  // --- TWO UPPER FLOORS BUILT ABOVE THE GROUND-FLOOR CHURCH (1st Upper + 2nd Upper Floor; lifts cleanly in cutaway!) ---
  private buildUpperFloorAboveHall() {
    const slabMat = new THREE.MeshStandardMaterial({
      map: this.textures.concreteWall,
      color: 0xa6aeb8,
      roughness: 0.84,
      metalness: 0.05,
    });

    const upperWallMat = new THREE.MeshStandardMaterial({
      map: this.textures.concreteWall,
      color: 0xe6e0d6,
      roughness: 0.78,
      metalness: 0.04,
      transparent: true,
      opacity: 1,
    });
    this.wallMaterials.push(upperWallMat);

    const upperWinMat = new THREE.MeshStandardMaterial({
      color: 0x3b5870,
      roughness: 0.18,
      metalness: 0.65,
    });

    const buildUpperStory = (baseY: number, storyH: number) => {
      // Floor slab separating stories
      const storySlab = new THREE.Mesh(
        new THREE.BoxGeometry(HALL_W + 0.8, SLAB_THICK, HALL_L + 0.8),
        slabMat,
      );
      storySlab.position.y = baseY + SLAB_THICK / 2;
      storySlab.castShadow = true;
      storySlab.receiveShadow = true;
      this.upperFloorGroup.add(storySlab);
      this.addCadEdge(storySlab, 0x64748b, this.upperFloorGroup);

      // Story concrete volume with subtle terrace inset
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(HALL_W - 1.8, storyH, HALL_L - 1.8),
        upperWallMat,
      );
      body.position.y = baseY + SLAB_THICK + storyH / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      this.upperFloorGroup.add(body);
      this.addCadEdge(body, 0x475569, this.upperFloorGroup);

      // Windows on all 4 sides
      [-1, 1].forEach((side) => {
        for (let z = -14; z <= 14; z += 7) {
          const wPane = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.45, 4.0), upperWinMat);
          wPane.position.set(side * ((HALL_W - 1.8) / 2 + 0.02), baseY + SLAB_THICK + 1.65, z);
          this.upperFloorGroup.add(wPane);
        }
      });
      [-1, 1].forEach((endZ) => {
        for (let x = -7; x <= 7; x += 7) {
          const wPane = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.45, 0.12), upperWinMat);
          wPane.position.set(x, baseY + SLAB_THICK + 1.65, endZ * ((HALL_L - 1.8) / 2 + 0.02));
          this.upperFloorGroup.add(wPane);
        }
      });
    };

    // 1st Upper Floor (الدور الأول علوي) directly above the Ground-Floor Church
    buildUpperStory(FLOOR2_Y, UPPER1_H);

    // 2nd Upper Floor (الدور الثاني علوي) above the 1st Upper Floor
    const upper2BaseY = FLOOR2_Y + SLAB_THICK + UPPER1_H;
    buildUpperStory(upper2BaseY, UPPER2_H);

    // Clean Empty Top Roof Slab + Parapet above 2nd Upper Floor (NO AC units on top!)
    const roofTopBaseY = upper2BaseY + SLAB_THICK + UPPER2_H;
    const topRoofSlab = new THREE.Mesh(
      new THREE.BoxGeometry(HALL_W + 0.5, 0.28, HALL_L + 0.5),
      slabMat,
    );
    topRoofSlab.position.y = roofTopBaseY + 0.14;
    topRoofSlab.castShadow = true;
    this.upperFloorGroup.add(topRoofSlab);
    this.addCadEdge(topRoofSlab, 0x64748b, this.upperFloorGroup);

    const parapetMat = new THREE.MeshStandardMaterial({ color: 0xc8c2b8, roughness: 0.76 });
    const pY = roofTopBaseY + 0.58;
    const pN = new THREE.Mesh(new THREE.BoxGeometry(HALL_W + 0.5, 0.65, 0.26), parapetMat);
    pN.position.set(0, pY, -HALL_L / 2 - 0.12);
    const pS = pN.clone();
    pS.position.z = HALL_L / 2 + 0.12;
    const pW = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.65, HALL_L + 0.5), parapetMat);
    pW.position.set(-HALL_W / 2 - 0.12, pY, 0);
    const pE = pW.clone();
    pE.position.x = HALL_W / 2 + 0.12;
    this.upperFloorGroup.add(pN, pS, pW, pE);

    this.registerInspectable(this.upperFloorGroup, {
      id: 'upper-two-floors',
      titleAr: 'الدور الأول علوي والدور الثاني علوي فوق الكنيسة',
      specAr: 'دوران علويان فوق صحن الكنيسة (الدور الأرضي) يحجبان حرارة شمس أسوان تماماً عن السقف، ولذلك تُركّب الوحدات أرضياً بجانب الكنيسة بصواعد قصيرة لا تمس الأدوار العلوية',
      category: 'structure',
    });

    this.scene.add(this.upperFloorGroup);
  }

  // --- 4 × GROUND-MOUNTED 380V T3 COOLING UNITS + VERTICAL ALUMINUM-CLAD RISER DUCTS ---
  private buildGroundMountedUnitsAndRisers() {
    const unitSpecs: {
      side: -1 | 1;
      uz: number;
      label: string;
    }[] = [
      { side: -1, uz: -10, label: 'وحدة تكييف أرضية T3 #1 (الجهة الغربية الشمالية)' },
      { side: 1, uz: -10, label: 'وحدة تكييف أرضية T3 #2 (الجهة الشرقية الشمالية)' },
      { side: -1, uz: 10, label: 'وحدة تكييف أرضية T3 #3 (الجهة الغربية الجنوبية)' },
      { side: 1, uz: 10, label: 'وحدة تكييف أرضية T3 #4 (الجهة الشرقية الجنوبية)' },
    ];

    const padMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xdbe2ea,
      roughness: 0.4,
      metalness: 0.38,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.5,
      metalness: 0.78,
    });
    const louverMat = new THREE.MeshStandardMaterial({
      map: this.textures.louverGrille,
      roughness: 0.55,
      metalness: 0.45,
    });
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.6,
    });
    const fanBladeMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.75,
    });
    const claddingSupplyMat = new THREE.MeshStandardMaterial({
      map: this.textures.galvanizedSteel,
      color: 0xcbe8f9,
      roughness: 0.24,
      metalness: 0.82,
    });
    const claddingReturnMat = new THREE.MeshStandardMaterial({
      map: this.textures.galvanizedSteel,
      color: 0xf7dbb0,
      roughness: 0.3,
      metalness: 0.74,
    });
    const screenPostMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.45,
      metalness: 0.7,
    });

    const plenumY = FLOOR1_Y + 3.66; // Height where vertical risers turn horizontally into First-Floor ceiling plenum!

    unitSpecs.forEach(({ side, uz, label }, idx) => {
      const unitGroup = new THREE.Group();
      const wallOuterX = side * (HALL_W / 2);
      const ux = side * (HALL_W / 2 + 3.4);

      // 1. Raised Reinforced Concrete Ground Pad (40cm above plaza to protect from dust/water)
      const pad = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.4, 5.8), padMat);
      pad.position.set(ux, 0.24, uz);
      pad.receiveShadow = true;
      pad.castShadow = true;
      unitGroup.add(pad);

      // 2. Steel Anti-Vibration Isolation Curb
      const curb = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.24, 5.0), frameMat);
      curb.position.set(ux, 0.56, uz);
      unitGroup.add(curb);

      // 3. Commercial 380V T3 Package Unit Cabinet
      const cabinet = new THREE.Mesh(new THREE.BoxGeometry(2.85, 1.95, 4.7), bodyMat);
      cabinet.position.set(ux, 0.68 + 0.975, uz);
      cabinet.castShadow = true;
      cabinet.receiveShadow = true;
      unitGroup.add(cabinet);
      this.addCadEdge(cabinet, 0x38bdf8, unitGroup);

      // Top Beveled Cap
      const cap = new THREE.Mesh(new THREE.BoxGeometry(2.96, 0.12, 4.82), frameMat);
      cap.position.set(ux, 2.69, uz);
      unitGroup.add(cap);

      // Side Condenser Louver Grilles (facing outward away from wall for unobstructed hot air intake!)
      const grille = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 3.2), louverMat);
      grille.position.set(ux + side * 1.44, 1.65, uz);
      unitGroup.add(grille);

      // Twin Top Vertical-Discharge Axial Condenser Fans (exhaust hot air upward!)
      [-1.05, 1.05].forEach((fz) => {
        const shroud = new THREE.Mesh(
          new THREE.CylinderGeometry(0.58, 0.62, 0.28, 20, 1, true),
          frameMat,
        );
        shroud.position.set(ux, 2.86, uz + fz);
        unitGroup.add(shroud);

        const fanHub = new THREE.Group();
        fanHub.position.set(ux, 2.83, uz + fz);
        const hubCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 12), fanBladeMat);
        fanHub.add(hubCenter);
        for (let b = 0; b < 4; b++) {
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.03, 0.15), fanBladeMat);
          blade.rotation.y = (b * Math.PI) / 4;
          fanHub.add(blade);
        }
        unitGroup.add(fanHub);
        this.fanBlades.push(fanHub);
      });

      // 380V 3-Phase Disconnect Switch & Electrical Panel
      const elecBox = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.9, 0.24), panelMat);
      elecBox.position.set(ux + side * 0.6, 1.65, uz + 2.42);
      unitGroup.add(elecBox);
      const redHandle = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.22, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35 }),
      );
      redHandle.position.set(ux + side * 0.6, 1.72, uz + 2.55);
      unitGroup.add(redHandle);

      // Protective Architectural Louver Fence Frame (low open-top guard around ground unit)
      const fenceOutX = ux + side * 2.2;
      [-2.8, 2.8].forEach((pz) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.4, 0.14), screenPostMat);
        post.position.set(fenceOutX, 1.24, uz + pz);
        unitGroup.add(post);
      });
      const railTop = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 5.6), screenPostMat);
      railTop.position.set(fenceOutX, 2.38, uz);
      const railMid = railTop.clone();
      railMid.position.y = 1.25;
      unitGroup.add(railTop, railMid);

      // --- EXTERNAL VERTICAL INSULATED SUPPLY RISER DUCT (Aluminum Cladding, Blue-Coded) ---
      const riserX = wallOuterX + side * 0.85;
      const supplyZ = uz + 1.15;
      const riserStartY = 1.65;
      const riserHeight = plenumY - riserStartY;

      // Horizontal exit collar from unit to vertical riser
      const supplyExit = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.72, 1.05), claddingSupplyMat);
      supplyExit.position.set(wallOuterX + side * 1.55, riserStartY, supplyZ);
      supplyExit.castShadow = true;
      unitGroup.add(supplyExit);

      // Vertical Supply Riser climbing outside wall from Ground Floor up to First Floor Plenum!
      const supplyRiser = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, riserHeight + 0.38, 1.15),
        claddingSupplyMat,
      );
      supplyRiser.position.set(riserX, riserStartY + riserHeight / 2, supplyZ);
      supplyRiser.castShadow = true;
      unitGroup.add(supplyRiser);
      this.addCadEdge(supplyRiser, 0x38bdf8, unitGroup);

      // Blue Supply Identification Band on Riser
      const supplyBand = new THREE.Mesh(
        new THREE.BoxGeometry(0.98, 0.16, 1.2),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.3,
        }),
      );
      supplyBand.position.set(riserX, FLOOR1_Y + 0.5, supplyZ);
      unitGroup.add(supplyBand);

      // Horizontal 90° Wall Penetration Elbow entering First-Floor Ceiling Plenum
      const supplyWallPen = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.46, 1.1), claddingSupplyMat);
      supplyWallPen.position.set(wallOuterX + side * 0.25, plenumY, supplyZ);
      unitGroup.add(supplyWallPen);

      // --- EXTERNAL VERTICAL INSULATED RETURN RISER DUCT (Amber-Coded) ---
      const returnZ = uz - 1.15;
      const returnExit = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.68, 0.98), claddingReturnMat);
      returnExit.position.set(wallOuterX + side * 1.55, riserStartY, returnZ);
      returnExit.castShadow = true;
      unitGroup.add(returnExit);

      const returnRiser = new THREE.Mesh(
        new THREE.BoxGeometry(0.86, riserHeight + 0.34, 1.05),
        claddingReturnMat,
      );
      returnRiser.position.set(riserX, riserStartY + riserHeight / 2, returnZ);
      returnRiser.castShadow = true;
      unitGroup.add(returnRiser);
      this.addCadEdge(returnRiser, 0xf59e0b, unitGroup);

      const returnBand = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 0.16, 1.1),
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xb45309,
          emissiveIntensity: 0.3,
        }),
      );
      returnBand.position.set(riserX, FLOOR1_Y + 0.5, returnZ);
      unitGroup.add(returnBand);

      const returnWallPen = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.44, 1.0), claddingReturnMat);
      returnWallPen.position.set(wallOuterX + side * 0.25, plenumY, returnZ);
      unitGroup.add(returnWallPen);

      this.registerInspectable(unitGroup, {
        id: `ground-rtu-${idx + 1}`,
        titleAr: label,
        specAr: `${this.options.nominalUnitTons} طن T3 (قاعدة أرضية + صاعد دكت رأسي مغلف كلادينج) · ${this.options.cfmPerUnit.toLocaleString('en-US')} CFM · كهرباء 380V (قاطع ${this.options.unitBreakerA}A)`,
        category: 'rtu',
      });

      this.groundUnitsGroup.add(unitGroup);
    });

    this.scene.add(this.groundUnitsGroup);
  }

  private buildCeilingAndDuctwork() {
    const ceilingY = FLOOR1_Y + 3.3;
    const gypsumMat = new THREE.MeshStandardMaterial({
      color: 0xf4f1ea,
      roughness: 0.88,
      metalness: 0.02,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
    });
    const gypsumPlane = new THREE.Mesh(
      new THREE.BoxGeometry(HALL_W - 0.8, 0.06, HALL_L - 0.8),
      gypsumMat,
    );
    gypsumPlane.position.y = ceilingY;
    this.ceilingGroup.add(gypsumPlane);

    const coveLightMat = new THREE.MeshStandardMaterial({
      color: 0xfff3d1,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.75,
    });
    const coveNorth = new THREE.Mesh(new THREE.BoxGeometry(HALL_W - 4, 0.05, 0.2), coveLightMat);
    coveNorth.position.set(0, ceilingY - 0.04, -HALL_L / 2 + 2.2);
    const coveSouth = coveNorth.clone();
    coveSouth.position.z = HALL_L / 2 - 2.2;
    this.ceilingGroup.add(coveNorth, coveSouth);
    this.scene.add(this.ceilingGroup);

    const ductY = FLOOR1_Y + 3.66;
    const supplyMat = new THREE.MeshStandardMaterial({
      map: this.textures.galvanizedSteel,
      color: 0xbfe3f7,
      roughness: 0.26,
      metalness: 0.78,
    });
    const returnMat = new THREE.MeshStandardMaterial({
      map: this.textures.galvanizedSteel,
      color: 0xf7d6a1,
      roughness: 0.34,
      metalness: 0.68,
    });
    const flangeMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.38,
      metalness: 0.82,
    });
    const diffuserMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.35,
      metalness: 0.25,
    });

    const zones: { zx: number; zz: number; side: -1 | 1 }[] = [
      { zx: -6.25, zz: -10, side: -1 },
      { zx: 6.25, zz: -10, side: 1 },
      { zx: -6.25, zz: 10, side: -1 },
      { zx: 6.25, zz: 10, side: 1 },
    ];

    const diffuserCoords: [number, number][] = [];

    zones.forEach(({ zx, zz, side }, zIdx) => {
      const zoneGroup = new THREE.Group();
      const wallInnerX = side * (HALL_W / 2 - 0.35);

      // Horizontal Supply Feeder Duct running directly from the External Side Wall Riser Penetration!
      const supplyHeaderSpan = Math.abs(wallInnerX - (zx - side * 3.1));
      const supplyHeaderCenterX = (wallInnerX + (zx - side * 3.1)) / 2;
      const header = new THREE.Mesh(
        new THREE.BoxGeometry(supplyHeaderSpan, 0.42, 0.96),
        supplyMat,
      );
      header.position.set(supplyHeaderCenterX, ductY, zz + 1.15);
      zoneGroup.add(header);
      this.addCadEdge(header, 0x38bdf8, zoneGroup);

      // Twin Longitudinal Main Supply Trunks fed from the side-entry header
      [-3.1, 3.1].forEach((offsetX) => {
        const tx = zx + offsetX;

        const mainSeg = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.4, 9.2), supplyMat);
        mainSeg.position.set(tx, ductY, zz + 0.2);
        zoneGroup.add(mainSeg);
        this.addCadEdge(mainSeg, 0x38bdf8, zoneGroup);

        const endSeg = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.32, 8.2), supplyMat);
        endSeg.position.set(tx, ductY + 0.02, zz - 5.2);
        zoneGroup.add(endSeg);
        this.addCadEdge(endSeg, 0x38bdf8, zoneGroup);

        const southSeg = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.32, 4.6), supplyMat);
        southSeg.position.set(tx, ductY + 0.02, zz + 6.4);
        zoneGroup.add(southSeg);
        this.addCadEdge(southSeg, 0x38bdf8, zoneGroup);

        for (let fz = -7; fz <= 7; fz += 3.5) {
          const flange = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.45, 0.08), flangeMat);
          flange.position.set(tx, ductY, zz + fz);
          zoneGroup.add(flange);
        }

        const rowOffsetsZ = [-7.2, -2.4, 2.4, 7.2];
        rowOffsetsZ.forEach((rz) => {
          [-1.25, 1.25].forEach((branchSide) => {
            const dx = tx + branchSide;
            const dz = zz + rz;
            diffuserCoords.push([dx, dz]);

            const takeoff = new THREE.Mesh(
              new THREE.BoxGeometry(Math.abs(branchSide), 0.24, 0.3),
              supplyMat,
            );
            takeoff.position.set(tx + branchSide / 2, ductY - 0.04, dz);
            zoneGroup.add(takeoff);
            this.addCadEdge(takeoff, 0x7dd3fc, zoneGroup);

            const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.32, 10), flangeMat);
            neck.position.set(dx, ductY - 0.2, dz);
            zoneGroup.add(neck);
          });
        });
      });

      this.registerInspectable(zoneGroup, {
        id: `supply-zone-${zIdx + 1}`,
        titleAr: `شبكة دكت التغذية صاج مجلفن GI — المنطقة ${zIdx + 1}`,
        specAr: `مغذاة من الصاعد الخارجي الجانبي · خطوط مزدوجة ${this.options.mainDuctSizeLabel} · 16 دفيوزر 60×60 سم · ${this.options.cfmPerUnit.toLocaleString('en-US')} CFM`,
        category: 'supply',
      });
      this.ductworkGroup.add(zoneGroup);

      // Return Air Trunk connected directly back to the External Side Wall Return Riser!
      const returnGroup = new THREE.Group();
      const retMain = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.38, 15.2), returnMat);
      retMain.position.set(zx, ductY + 0.03, zz - 0.8);
      returnGroup.add(retMain);
      this.addCadEdge(retMain, 0xf59e0b, returnGroup);

      const retCrossSpan = Math.abs(wallInnerX - zx);
      const retCross = new THREE.Mesh(new THREE.BoxGeometry(retCrossSpan, 0.38, 0.92), returnMat);
      retCross.position.set((wallInnerX + zx) / 2, ductY + 0.03, zz - 1.15);
      returnGroup.add(retCross);
      this.addCadEdge(retCross, 0xf59e0b, returnGroup);

      [-5.5, 0, 5.5].forEach((rz) => {
        const retGrille = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.25, 0.85), returnMat);
        retGrille.position.set(zx, ductY - 0.18, zz + rz);
        returnGroup.add(retGrille);
      });

      this.registerInspectable(returnGroup, {
        id: `return-zone-${zIdx + 1}`,
        titleAr: `خط وصاعد الهواء الراجع المعزول صوتياً — المنطقة ${zIdx + 1}`,
        specAr: `مقاس ${this.options.returnDuctSizeLabel} · يعود للوحدة الأرضية عبر الصاعد الجانبي · تبطين صوتي 25 مم (<38 NC)`,
        category: 'return',
      });
      this.ductworkGroup.add(returnGroup);
    });

    const diffGeo = new THREE.BoxGeometry(0.68, 0.08, 0.68);
    const diffInstanced = new THREE.InstancedMesh(diffGeo, diffuserMat, diffuserCoords.length);
    diffuserCoords.forEach(([dx, dz], i) => {
      _dummy.position.set(dx, ductY - 0.35, dz);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      diffInstanced.setMatrixAt(i, _dummy.matrix);
    });
    diffInstanced.instanceMatrix.needsUpdate = true;
    diffInstanced.computeBoundingSphere();
    this.ductworkGroup.add(diffInstanced);

    this.airflowOrigins = new Float32Array(this.airflowCount * 3);
    this.airflowPositions = new Float32Array(this.airflowCount * 3);
    this.airflowSpeeds = new Float32Array(this.airflowCount);

    for (let i = 0; i < this.airflowCount; i++) {
      const [dx, dz] = diffuserCoords[i % diffuserCoords.length];
      const ox = dx + (Math.random() - 0.5) * 1.4;
      const oz = dz + (Math.random() - 0.5) * 1.4;
      const oy = ductY - 0.4;
      this.airflowOrigins[i * 3] = ox;
      this.airflowOrigins[i * 3 + 1] = oy;
      this.airflowOrigins[i * 3 + 2] = oz;

      const phase = Math.random();
      this.airflowPositions[i * 3] = ox;
      this.airflowPositions[i * 3 + 1] = oy - phase * 2.7;
      this.airflowPositions[i * 3 + 2] = oz;
      this.airflowSpeeds[i] = 0.55 + Math.random() * 0.55;
    }

    this.scene.add(this.ductworkGroup);
  }

  private buildWeddingHallInterior() {
    // Authentic Coptic Church Sanctuary Interior (25m x 40m x 4m, seating 1,000 worshippers)
    const sanctuaryGroup = new THREE.Group();
    const marbleStageMat = new THREE.MeshStandardMaterial({
      color: 0xf4efe6,
      roughness: 0.25,
      metalness: 0.1,
    });
    const darkOakMat = new THREE.MeshStandardMaterial({
      color: 0x5c361d,
      roughness: 0.58,
      metalness: 0.08,
    });
    const pewWoodMat = new THREE.MeshStandardMaterial({
      color: 0x6f4324,
      roughness: 0.55,
      metalness: 0.06,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4a348,
      roughness: 0.22,
      metalness: 0.88,
    });
    const iconGoldMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      emissive: 0xb45309,
      emissiveIntensity: 0.28,
      roughness: 0.35,
      metalness: 0.65,
    });
    const crimsonCarpetMat = new THREE.MeshStandardMaterial({
      color: 0x7f1d1d,
      roughness: 0.88,
      metalness: 0.02,
    });

    // Raised Marble Chancel / Deacons Choir Platform (خورس الشمامسة)
    const chancel = new THREE.Mesh(new THREE.BoxGeometry(19.5, 0.34, 5.2), marbleStageMat);
    chancel.position.set(0, FLOOR1_Y + 0.19, -HALL_L / 2 + 3.2);
    chancel.receiveShadow = true;
    sanctuaryGroup.add(chancel);

    // Carved Wooden Iconostasis Screen (حامل الأيقونات والهيكل) across front end
    const screenZ = -HALL_L / 2 + 2.2;
    const screenMain = new THREE.Mesh(new THREE.BoxGeometry(18.6, 3.1, 0.32), darkOakMat);
    screenMain.position.set(0, FLOOR1_Y + 1.88, screenZ);
    sanctuaryGroup.add(screenMain);

    // Three Arched Sanctuary Portals (الباب الملوكي الأوسط + بابان جانبيان) + Golden Icons
    [-5.2, 0, 5.2].forEach((px, idx) => {
      const archR = idx === 1 ? 1.45 : 1.05;
      const arch = new THREE.Mesh(new THREE.TorusGeometry(archR, 0.14, 10, 24, Math.PI), goldMat);
      arch.position.set(px, FLOOR1_Y + 2.1, screenZ + 0.2);
      sanctuaryGroup.add(arch);

      const curtain = new THREE.Mesh(
        new THREE.BoxGeometry(archR * 1.75, 2.2, 0.12),
        crimsonCarpetMat,
      );
      curtain.position.set(px, FLOOR1_Y + 1.35, screenZ + 0.16);
      sanctuaryGroup.add(curtain);
    });

    // Golden Icon Panels flanking the sanctuary doors
    [-8.0, -2.7, 2.7, 8.0].forEach((ix) => {
      const iconPanel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.85, 0.08), iconGoldMat);
      iconPanel.position.set(ix, FLOOR1_Y + 2.0, screenZ + 0.18);
      sanctuaryGroup.add(iconPanel);
    });

    // Golden Cross crowning the central Royal Door of the Iconostasis
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.95, 0.12), goldMat);
    crossV.position.set(0, FLOOR1_Y + 3.62, screenZ + 0.2);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.12), goldMat);
    crossH.position.set(0, FLOOR1_Y + 3.74, screenZ + 0.2);
    sanctuaryGroup.add(crossV, crossH);

    // Central Marble Processional Aisle + Crimson Carpet Runner
    const runner = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.025, HALL_L - 8.5), crimsonCarpetMat);
    runner.position.set(0, FLOOR1_Y + 0.055, 2.6);
    sanctuaryGroup.add(runner);

    this.registerInspectable(sanctuaryGroup, {
      id: 'church-sanctuary',
      titleAr: 'الهيكل وحامل الأيقونات وخورس الشمامسة',
      specAr: 'مزود بتهوية هادئة جداً (<35 NC) ومروحة سحب عادم لطرد البخور مع الحفاظ على ثبات درجة الحرارة 22°C',
      category: 'interior',
    });
    this.interiorGroup.add(sanctuaryGroup);

    // Rows of Oak Wooden Church Pews (InstancedMesh: 4 columns × 18 rows = 72 long pews seating 1,000 people!)
    const pewColumnsX = [-9.2, -4.4, 4.4, 9.2];
    const pewRowsCount = 18;
    const totalPews = pewColumnsX.length * pewRowsCount;

    const pewSeatGeo = new THREE.BoxGeometry(3.8, 0.46, 0.52);
    const pewBackGeo = new THREE.BoxGeometry(3.8, 0.52, 0.12);
    const seatInst = new THREE.InstancedMesh(pewSeatGeo, pewWoodMat, totalPews);
    const backInst = new THREE.InstancedMesh(pewBackGeo, darkOakMat, totalPews);

    let pIdx = 0;
    for (let r = 0; r < pewRowsCount; r++) {
      const rz = -12.0 + r * 1.62;
      for (let c = 0; c < pewColumnsX.length; c++) {
        const px = pewColumnsX[c];
        _dummy.position.set(px, FLOOR1_Y + 0.27, rz);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(1, 1, 1);
        _dummy.updateMatrix();
        seatInst.setMatrixAt(pIdx, _dummy.matrix);

        _dummy.position.set(px, FLOOR1_Y + 0.68, rz + 0.24);
        _dummy.updateMatrix();
        backInst.setMatrixAt(pIdx, _dummy.matrix);
        pIdx++;
      }
    }

    seatInst.instanceMatrix.needsUpdate = true;
    seatInst.computeBoundingSphere();
    backInst.instanceMatrix.needsUpdate = true;
    backInst.computeBoundingSphere();
    this.interiorGroup.add(seatInst, backInst);

    // Brass Church Chandeliers aligned symmetrically between HVAC duct runs
    const chandMat = new THREE.MeshStandardMaterial({
      color: 0xfff8e7,
      emissive: 0xfde68a,
      emissiveIntensity: 0.85,
      roughness: 0.15,
      metalness: 0.6,
    });
    const chandCoords: [number, number][] = [
      [0, -10], [0, 0], [0, 10],
      [-6.8, -6], [-6.8, 4], [-6.8, 13],
      [6.8, -6], [6.8, 4], [6.8, 13],
    ];
    chandCoords.forEach(([cx, cz]) => {
      const ch = new THREE.Group();
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.08, 8, 20), chandMat);
      ring1.rotation.x = Math.PI / 2;
      ring1.position.y = FLOOR1_Y + 2.9;
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 8, 16), chandMat);
      ring2.rotation.x = Math.PI / 2;
      ring2.position.y = FLOOR1_Y + 2.7;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 8), goldMat);
      rod.position.y = FLOOR1_Y + 3.1;
      ch.add(ring1, ring2, rod);
      ch.position.set(cx, 0, cz);
      this.interiorGroup.add(ch);
    });

    this.scene.add(this.interiorGroup);
  }

  private buildAirflowParticles() {
    if (!this.airflowPositions) return;

    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = 64;
    dotCanvas.height = 64;
    const ctx = dotCanvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(186, 230, 253, 1)');
    grad.addColorStop(0.45, 'rgba(56, 189, 248, 0.75)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const dotTex = new THREE.CanvasTexture(dotCanvas);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.airflowPositions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.42,
      map: dotTex,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.airflowPoints = new THREE.Points(geo, mat);
    this.airflowGroup.add(this.airflowPoints);
    this.scene.add(this.airflowGroup);
  }

  private buildCadOverlay() {
    const gridMain = new THREE.GridHelper(110, 55, 0x0ea5e9, 0x1e293b);
    gridMain.position.y = 0.05;
    this.cadGridGroup.add(gridMain);

    const boxPts = [
      new THREE.Vector3(-HALL_W / 2 - 5.5, 0.1, -HALL_L / 2 - 1.5),
      new THREE.Vector3(HALL_W / 2 + 5.5, 0.1, -HALL_L / 2 - 1.5),
      new THREE.Vector3(HALL_W / 2 + 5.5, 0.1, HALL_L / 2 + 1.5),
      new THREE.Vector3(-HALL_W / 2 - 5.5, 0.1, HALL_L / 2 + 1.5),
    ];
    const borderGeo = new THREE.BufferGeometry().setFromPoints(boxPts);
    const borderLoop = new THREE.LineLoop(
      borderGeo,
      new THREE.LineBasicMaterial({ color: 0x38bdf8 }),
    );
    this.cadGridGroup.add(borderLoop);

    this.cadGridGroup.visible = false;
    this.scene.add(this.cadGridGroup);
  }

  private bindEvents() {
    this.resizeObserver = new ResizeObserver(() => {
      if (this.disposed) return;
      const w = Math.max(1, this.container.clientWidth);
      const h = Math.max(1, this.container.clientHeight);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
    this.resizeObserver.observe(this.container);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.callbacks.onWebglError?.();
    });

    let pointerDownX = 0;
    let pointerDownY = 0;
    canvas.addEventListener('pointerdown', (e) => {
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
    });

    canvas.addEventListener('pointerup', (e) => {
      const dist = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
      if (dist > 6) return;

      const rect = canvas.getBoundingClientRect();
      _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(_pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.inspectables, true);

      if (this.selectedHighlightMesh) {
        const mat = this.selectedHighlightMesh.material as THREE.MeshStandardMaterial;
        if (mat && mat.emissive) mat.emissive.copy(this.selectedOriginalEmissive);
        this.selectedHighlightMesh = null;
      }

      if (hits.length > 0) {
        const hitMesh = hits[0].object as THREE.Mesh;
        const info = hitMesh.userData.inspectInfo as InspectableComponentInfo | undefined;
        if (info) {
          const mat = hitMesh.material as THREE.MeshStandardMaterial;
          if (mat && mat.emissive) {
            this.selectedOriginalEmissive.copy(mat.emissive);
            mat.emissive.setHex(0x0ea5e9);
            this.selectedHighlightMesh = hitMesh;
          }
          this.callbacks.onSelectPart?.(info);
          return;
        }
      }
      this.callbacks.onSelectPart?.(null);
    });
  }

  public applyCameraPreset(presetId: CameraPresetId, immediate = false) {
    this.videoTourActive = false;
    this.callbacks.onVideoTourChange?.(false);

    const preset = CAMERA_PRESETS[presetId];
    _camTargetPos.set(...preset.pos);
    _camTargetLook.set(...preset.target);
    this.targetRoofLift = preset.lift;
    this.targetXray = preset.xray;

    if (immediate) {
      this.camera.position.copy(_camTargetPos);
      this.controls.target.copy(_camTargetLook);
      this.currentRoofLift = preset.lift;
      this.upperFloorGroup.position.y = preset.lift;
      this.ceilingGroup.position.y = preset.lift * 0.4;
      this.ceilingGroup.visible = preset.lift < 1.2;
      this.controls.update();
      this.cameraTransitionActive = false;
    } else {
      this.cameraTransitionActive = true;
    }
  }

  public setCadMode(enabled: boolean) {
    this.cadMode = enabled;
    this.cadGridGroup.visible = enabled;
    this.siteGroup.visible = !enabled;
    this.cadEdges.forEach((edge) => {
      edge.visible = enabled;
    });
    const bgHex = enabled ? 0x05090f : 0x0d1520;
    this.scene.background = new THREE.Color(bgHex);
    this.scene.fog = new THREE.FogExp2(bgHex, enabled ? 0.0028 : 0.0058);
    if (enabled && this.targetRoofLift < 4) {
      this.targetRoofLift = 8.5;
      this.targetXray = true;
    }
  }

  public setVideoTour(active: boolean) {
    this.videoTourActive = active;
    if (active) {
      this.cameraTransitionActive = false;
    }
  }

  public setRoofLift(meters: number) {
    this.targetRoofLift = Math.max(0, Math.min(14, meters));
    this.targetXray = meters > 1.2;
  }

  public setLayerVisibility(layers: {
    ducts: boolean;
    airflow: boolean;
    interior: boolean;
    upperFloor: boolean;
  }) {
    this.ductworkGroup.visible = layers.ducts;
    this.showAirflow = layers.airflow;
    this.airflowGroup.visible = layers.airflow;
    this.interiorGroup.visible = layers.interior;
    this.upperFloorGroup.visible = layers.upperFloor;
  }

  public updateEngineeringSpecs(options: HallSceneOptions) {
    this.options = options;
    this.inspectables.forEach((obj) => {
      obj.traverse((child) => {
        const info = child.userData.inspectInfo as InspectableComponentInfo | undefined;
        if (!info) return;
        if (info.category === 'rtu') {
          info.specAr = `${options.nominalUnitTons} طن T3 (قاعدة أرضية + صاعد دكت رأسي مغلف كلادينج) · ${options.cfmPerUnit.toLocaleString('en-US')} CFM · كهرباء 380V (قاطع ${options.unitBreakerA}A)`;
        } else if (info.category === 'supply') {
          info.specAr = `مغذاة من الصاعد الخارجي الجانبي · خطوط مزدوجة ${options.mainDuctSizeLabel} · 16 دفيوزر 60×60 سم · ${options.cfmPerUnit.toLocaleString('en-US')} CFM`;
        } else if (info.category === 'return') {
          info.specAr = `مقاس ${options.returnDuctSizeLabel} · يعود للوحدة الأرضية عبر الصاعد الجانبي · تبطين صوتي 25 مم (<38 NC)`;
        }
      });
    });
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = () => {
    if (this.disposed) return;

    const now = performance.now();
    const dt = Math.min(0.08, (now - this.lastTime) / 1000);
    this.lastTime = now;

    // 28-Second Cinematic Video Tour showcasing Ground-Mounted Units, Risers, Cutaway Ductwork & Hall Interior
    if (this.videoTourActive) {
      this.videoTourTime = (this.videoTourTime + dt) % 28;
      const t = this.videoTourTime;
      if (t < 7) {
        const ang = (t / 7) * Math.PI * 0.72 + 0.5;
        _camTargetPos.set(Math.cos(ang) * 48, 22, Math.sin(ang) * 48);
        _camTargetLook.set(0, FLOOR1_Y + 2.4, 0);
        this.targetRoofLift = 0;
        this.targetXray = false;
      } else if (t < 15) {
        const p = (t - 7) / 8;
        const ang = 1.85 + p * Math.PI * 0.85;
        _camTargetPos.set(Math.cos(ang) * 38, 26 + Math.sin(p * Math.PI) * 5, Math.sin(ang) * 38);
        _camTargetLook.set(0, FLOOR1_Y + 2.4, 0);
        this.targetRoofLift = 9.0;
        this.targetXray = true;
      } else if (t < 21) {
        const p = (t - 15) / 6;
        _camTargetPos.set(Math.sin(p * Math.PI) * 4.2, FLOOR1_Y + 2.2, 15.5 - p * 22);
        _camTargetLook.set(0, FLOOR1_Y + 1.9, -18);
        this.targetRoofLift = 0;
        this.targetXray = false;
      } else {
        // Phase 4: Ground-Level 380V Units & Vertical Clad Riser Ducts Pan
        const p = (t - 21) / 7;
        _camTargetPos.set(HALL_W / 2 + 15.5, 6.2 + Math.sin(p * Math.PI) * 2.5, 19 - p * 34);
        _camTargetLook.set(HALL_W / 2 + 1.8, 3.8, 8 - p * 18);
        this.targetRoofLift = 0;
        this.targetXray = false;
      }

      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camTargetPos.x, 2.6, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camTargetPos.y, 2.6, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camTargetPos.z, 2.6, dt);
      this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, _camTargetLook.x, 3.0, dt);
      this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, _camTargetLook.y, 3.0, dt);
      this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, _camTargetLook.z, 3.0, dt);
    }

    // 1. Smoothly damp Second Floor lift cutaway
    this.currentRoofLift = THREE.MathUtils.damp(this.currentRoofLift, this.targetRoofLift, 5.5, dt);
    this.upperFloorGroup.position.y = this.currentRoofLift;
    this.ceilingGroup.position.y = this.currentRoofLift * 0.4;
    this.ceilingGroup.visible =
      !this.cadMode && this.currentRoofLift < 1.8 && this.upperFloorGroup.visible;

    // 2. Smoothly damp wall translucency in X-Ray / AutoCAD mode
    const desiredOpacity = this.cadMode ? 0.14 : this.targetXray ? 0.34 : 1.0;
    this.currentWallOpacity = THREE.MathUtils.damp(this.currentWallOpacity, desiredOpacity, 6, dt);
    this.wallMaterials.forEach((m) => {
      m.opacity = this.currentWallOpacity;
      m.depthWrite = this.currentWallOpacity > 0.85;
    });

    // 3. Smooth damped camera preset transitions
    if (this.cameraTransitionActive) {
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camTargetPos.x, 4.5, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camTargetPos.y, 4.5, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camTargetPos.z, 4.5, dt);

      this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, _camTargetLook.x, 5.0, dt);
      this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, _camTargetLook.y, 5.0, dt);
      this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, _camTargetLook.z, 5.0, dt);

      if (
        this.camera.position.distanceTo(_camTargetPos) < 0.08 &&
        this.controls.target.distanceTo(_camTargetLook) < 0.08
      ) {
        this.cameraTransitionActive = false;
      }
    }

    // 4. Spin ground-level condenser fans
    for (let i = 0; i < this.fanBlades.length; i++) {
      this.fanBlades[i].rotation.y += dt * 7.5;
    }

    // 5. Animate cool air streamlines descending from 64 diffusers
    if (
      this.showAirflow &&
      this.airflowPoints &&
      this.airflowPositions &&
      this.airflowOrigins &&
      this.airflowSpeeds
    ) {
      const posAttr = this.airflowPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < this.airflowCount; i++) {
        const idx = i * 3;
        const speed = this.airflowSpeeds[i];
        let y = this.airflowPositions[idx + 1] - speed * dt * 1.15;
        const spread = (this.airflowOrigins[idx + 1] - y) * 0.25;
        if (y < FLOOR1_Y + 0.5) {
          y = this.airflowOrigins[idx + 1];
          this.airflowPositions[idx] = this.airflowOrigins[idx];
          this.airflowPositions[idx + 2] = this.airflowOrigins[idx + 2];
        } else {
          const angle = i * 1.618;
          this.airflowPositions[idx] = this.airflowOrigins[idx] + Math.cos(angle) * spread;
          this.airflowPositions[idx + 2] = this.airflowOrigins[idx + 2] + Math.sin(angle) * spread;
        }
        this.airflowPositions[idx + 1] = y;
      }
      posAttr.needsUpdate = true;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.resizeObserver?.disconnect();
    this.controls?.dispose();
    this.textures?.dispose();

    this.scene?.traverse((obj) => {
      if (
        (obj as THREE.Mesh).isMesh ||
        (obj as THREE.Points).isPoints ||
        (obj as THREE.LineSegments).isLineSegments
      ) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.parentNode?.removeChild(this.renderer.domElement);
    }
  }
}
