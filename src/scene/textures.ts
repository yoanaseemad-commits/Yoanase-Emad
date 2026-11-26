import * as THREE from 'three';

export interface ProceduralTextures {
  concreteWall: THREE.CanvasTexture;
  marbleFloor: THREE.CanvasTexture;
  galvanizedSteel: THREE.CanvasTexture;
  louverGrille: THREE.CanvasTexture;
  pavingPlaza: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextures {
  // 1. Architectural Concrete Texture
  const concreteCanvas = document.createElement('canvas');
  concreteCanvas.width = 512;
  concreteCanvas.height = 512;
  const cCtx = concreteCanvas.getContext('2d')!;
  cCtx.fillStyle = '#CFCBC4';
  cCtx.fillRect(0, 0, 512, 512);
  // Subtle travertine/architectural formwork grain
  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const shade = 195 + Math.floor(Math.random() * 24 - 12);
    cCtx.fillStyle = `rgba(${shade}, ${shade - 3}, ${shade - 8}, 0.25)`;
    cCtx.fillRect(x, y, 2 + Math.random() * 4, 1 + Math.random() * 2);
  }
  // Architectural panel joints
  cCtx.strokeStyle = 'rgba(110, 105, 98, 0.22)';
  cCtx.lineWidth = 2;
  for (let y = 128; y < 512; y += 128) {
    cCtx.beginPath();
    cCtx.moveTo(0, y);
    cCtx.lineTo(512, y);
    cCtx.stroke();
  }
  for (let x = 256; x < 512; x += 256) {
    cCtx.beginPath();
    cCtx.moveTo(x, 0);
    cCtx.lineTo(x, 512);
    cCtx.stroke();
  }
  const concreteWall = new THREE.CanvasTexture(concreteCanvas);
  concreteWall.colorSpace = THREE.SRGBColorSpace;
  concreteWall.wrapS = THREE.RepeatWrapping;
  concreteWall.wrapT = THREE.RepeatWrapping;
  concreteWall.repeat.set(6, 2);
  concreteWall.anisotropy = maxAnisotropy;

  // 2. Polished Cream Marble Floor Texture
  const marbleCanvas = document.createElement('canvas');
  marbleCanvas.width = 512;
  marbleCanvas.height = 512;
  const mCtx = marbleCanvas.getContext('2d')!;
  mCtx.fillStyle = '#EFE9DD';
  mCtx.fillRect(0, 0, 512, 512);
  // Soft veining
  mCtx.strokeStyle = 'rgba(195, 180, 155, 0.35)';
  for (let v = 0; v < 18; v++) {
    mCtx.lineWidth = 0.8 + Math.random() * 1.8;
    mCtx.beginPath();
    let x = Math.random() * 512;
    let y = Math.random() * 512;
    mCtx.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      x += (Math.random() - 0.3) * 90;
      y += (Math.random() - 0.5) * 70;
      mCtx.lineTo(x, y);
    }
    mCtx.stroke();
  }
  // Marble tile grid
  mCtx.strokeStyle = 'rgba(165, 152, 130, 0.28)';
  mCtx.lineWidth = 1.5;
  for (let i = 0; i <= 512; i += 128) {
    mCtx.beginPath();
    mCtx.moveTo(i, 0);
    mCtx.lineTo(i, 512);
    mCtx.stroke();
    mCtx.beginPath();
    mCtx.moveTo(0, i);
    mCtx.lineTo(512, i);
    mCtx.stroke();
  }
  const marbleFloor = new THREE.CanvasTexture(marbleCanvas);
  marbleFloor.colorSpace = THREE.SRGBColorSpace;
  marbleFloor.wrapS = THREE.RepeatWrapping;
  marbleFloor.wrapT = THREE.RepeatWrapping;
  marbleFloor.repeat.set(8, 12);
  marbleFloor.anisotropy = maxAnisotropy;

  // 3. Galvanized Sheet-Metal Duct Texture (standing flange seams + spangle)
  const ductCanvas = document.createElement('canvas');
  ductCanvas.width = 256;
  ductCanvas.height = 256;
  const dCtx = ductCanvas.getContext('2d')!;
  dCtx.fillStyle = '#C4CDD6';
  dCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i++) {
    const shade = 185 + Math.floor(Math.random() * 35);
    dCtx.fillStyle = `rgba(${shade}, ${shade + 4}, ${shade + 9}, 0.22)`;
    dCtx.fillRect(Math.random() * 256, Math.random() * 256, 4, 4);
  }
  // Cross-break X crease & flange seams
  dCtx.strokeStyle = 'rgba(70, 82, 96, 0.35)';
  dCtx.lineWidth = 3;
  dCtx.strokeRect(2, 2, 252, 252);
  dCtx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  dCtx.lineWidth = 1;
  dCtx.beginPath();
  dCtx.moveTo(0, 0);
  dCtx.lineTo(256, 256);
  dCtx.moveTo(256, 0);
  dCtx.lineTo(0, 256);
  dCtx.stroke();
  const galvanizedSteel = new THREE.CanvasTexture(ductCanvas);
  galvanizedSteel.colorSpace = THREE.SRGBColorSpace;
  galvanizedSteel.wrapS = THREE.RepeatWrapping;
  galvanizedSteel.wrapT = THREE.RepeatWrapping;
  galvanizedSteel.repeat.set(4, 1);
  galvanizedSteel.anisotropy = maxAnisotropy;

  // 4. Condenser Louver Grille Texture for 380V RTUs
  const louverCanvas = document.createElement('canvas');
  louverCanvas.width = 256;
  louverCanvas.height = 256;
  const lCtx = louverCanvas.getContext('2d')!;
  lCtx.fillStyle = '#1E2730';
  lCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 12) {
    lCtx.fillStyle = '#4B5763';
    lCtx.fillRect(0, y, 256, 5);
    lCtx.fillStyle = '#6E7C8A';
    lCtx.fillRect(0, y, 256, 1.5);
  }
  const louverGrille = new THREE.CanvasTexture(louverCanvas);
  louverGrille.colorSpace = THREE.SRGBColorSpace;
  louverGrille.wrapS = THREE.RepeatWrapping;
  louverGrille.wrapT = THREE.RepeatWrapping;
  louverGrille.anisotropy = maxAnisotropy;

  // 5. Outdoor Concrete Plaza & Landscaping Paving
  const plazaCanvas = document.createElement('canvas');
  plazaCanvas.width = 512;
  plazaCanvas.height = 512;
  const pCtx = plazaCanvas.getContext('2d')!;
  pCtx.fillStyle = '#252E38';
  pCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3000; i++) {
    const shade = 34 + Math.floor(Math.random() * 14);
    pCtx.fillStyle = `rgba(${shade}, ${shade + 6}, ${shade + 14}, 0.3)`;
    pCtx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
  }
  pCtx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
  pCtx.lineWidth = 1;
  for (let i = 0; i <= 512; i += 64) {
    pCtx.beginPath();
    pCtx.moveTo(i, 0);
    pCtx.lineTo(i, 512);
    pCtx.stroke();
    pCtx.beginPath();
    pCtx.moveTo(0, i);
    pCtx.lineTo(512, i);
    pCtx.stroke();
  }
  const pavingPlaza = new THREE.CanvasTexture(plazaCanvas);
  pavingPlaza.colorSpace = THREE.SRGBColorSpace;
  pavingPlaza.wrapS = THREE.RepeatWrapping;
  pavingPlaza.wrapT = THREE.RepeatWrapping;
  pavingPlaza.repeat.set(22, 22);
  pavingPlaza.anisotropy = maxAnisotropy;

  // 6. Soft Radial Contact Shadow Map
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 256;
  const sCtx = shadowCanvas.getContext('2d')!;
  const grad = sCtx.createRadialGradient(128, 128, 25, 128, 128, 124);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.62)');
  grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.28)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 256, 256);
  const contactShadow = new THREE.CanvasTexture(shadowCanvas);

  return {
    concreteWall,
    marbleFloor,
    galvanizedSteel,
    louverGrille,
    pavingPlaza,
    contactShadow,
    dispose: () => {
      concreteWall.dispose();
      marbleFloor.dispose();
      galvanizedSteel.dispose();
      louverGrille.dispose();
      pavingPlaza.dispose();
      contactShadow.dispose();
    },
  };
}
