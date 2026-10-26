import * as THREE from 'three';
import { useMemo, type ReactNode } from 'react';
import type { ItemVisual } from '../../data/types';
import { VARIANTS } from '../../data/types';
import { Bat } from './Bat';
import { Glove } from './Glove';
import { Cap, Helmet } from './Headwear';
import { Eyewear } from './Eyewear';
import { Chain } from './Chain';
import { Wristband, ElbowGuard } from './Limb';
import { Cleats } from './Cleats';
import { labelTexture, useDisposable } from './util';

function Label({ text, y = -0.2 }: { text: string; y?: number }) {
  const res = useDisposable(() => {
    const map = labelTexture(text, { color: '#e8ecf5', width: 512, height: 96, font: 'Inter, Arial, sans-serif' });
    return { map, mat: new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false }) };
  }, [text]);
  return (
    <mesh position={[0, y, 0]} material={res.mat}>
      <planeGeometry args={[0.36, 0.0675]} />
    </mesh>
  );
}

const mannequin = new THREE.MeshStandardMaterial({ color: '#5b6070', roughness: 0.7 });

function Head({ r = 0.12 }: { r?: number }) {
  return (
    <mesh material={mannequin} receiveShadow castShadow>
      <sphereGeometry args={[r, 40, 24]} />
    </mesh>
  );
}

function Limb({ r = 0.04, h = 0.3 }: { r?: number; h?: number }) {
  return (
    <mesh material={mannequin} receiveShadow>
      <cylinderGeometry args={[r, r, h, 32]} />
    </mesh>
  );
}

interface Cell {
  key: string;
  label: string;
  node: ReactNode;
}

export interface GearPreviewProps {
  /** Show only one group: bats | gloves | head | face | neck | limbs | cleats */
  only?: string;
  highlight?: boolean;
  spacing?: number;
}

/** Dev showcase: every gear component and variant laid out in rows. */
export function GearPreview({ only, highlight = false, spacing = 0.42 }: GearPreviewProps) {
  const rows = useMemo(() => {
    const r: { name: string; cells: Cell[] }[] = [];
    const bat: ItemVisual[] = [
      { primary: '#c8955a', finish: 'wood', variant: 'classic', text: 'SLUGGER' },
      { primary: '#9aa3b5', secondary: '#e01e37', finish: 'metal', variant: 'barrel', text: 'BOOMSTICK' },
      { primary: '#2a1a12', secondary: '#c9a227', finish: 'wood', variant: 'thin', text: 'CONTACT' },
      { primary: '#e8d7b7', secondary: '#1b1b1f', finish: 'gloss', variant: 'fungo', text: 'FUNGO' },
      { primary: '#3b2a1e', secondary: '#c9ced6', finish: 'matte', variant: 'spiked', text: 'NAILED IT' },
      { primary: '#19e3ff', secondary: '#7a5cff', finish: 'glow', variant: 'neon', text: 'VOLT' },
    ];
    r.push({ name: 'bats', cells: bat.map((v, i) => ({ key: `bat${i}`, label: `bat · ${v.variant}`, node: <group position={[0, -0.32, 0]} rotation={[0, 0, 0]}><Bat visual={v} highlight={highlight} /></group> })) });
    const gloveColors = ['#a0522d', '#1c1c1f', '#c46a24', '#6b3a1e'];
    r.push({
      name: 'gloves',
      cells: VARIANTS.glove.map((v, i) => ({ key: `glove${v}`, label: `glove · ${v}`, node: <Glove visual={{ primary: gloveColors[i], secondary: i === 1 ? '#d4af37' : '#2a160a', variant: v, finish: 'leather' }} highlight={highlight} /> })),
    });
    r.push({
      name: 'head',
      cells: [
        ...VARIANTS.helmet.map((v, i) => ({ key: `helm${v}`, label: `helmet · ${v}`, node: <><Head /><Helmet visual={{ primary: ['#0b2a6b', '#b0111e', '#111111'][i], secondary: ['#f5f5f5', '#ffd23f', '#d4af37'][i], variant: v, finish: i === 2 ? 'metal' : 'gloss', text: ['NY', 'R', 'DA'][i] }} highlight={highlight} /></> })),
        ...VARIANTS.cap.map((v, i) => ({ key: `cap${v}`, label: `cap · ${v}`, node: <><Head /><Cap visual={{ primary: ['#13294b', '#0c0c0c', '#e03a3e'][i], secondary: ['#ffffff', '#ff4fd8', '#0f7d3c'][i], variant: v, text: ['B', 'LA', 'SD'][i] }} highlight={highlight} /></> })),
      ],
    });
    r.push({
      name: 'face',
      cells: [
        ...VARIANTS.eyewear.map((v, i) => ({ key: `eye${v}`, label: `eyewear · ${v}`, node: <><Head /><Eyewear visual={{ primary: ['#ff6a00', '#2e7dff', '#0a0a0a'][i], secondary: ['#121214', '#d4af37', undefined][i], variant: v }} highlight={highlight} /></> })),
        ...VARIANTS.chain.map((v, i) => ({ key: `chain${v}`, label: `chain · ${v}`, node: <group position={[0, 0.05, 0]}><group position={[0, 0.08, 0]}><Limb r={0.09} h={0.22} /></group><Chain visual={{ primary: ['#e6b422', '#f2c94c', '#f6efe6'][i], secondary: i === 2 ? undefined : '#e8e8ee', finish: i === 1 ? 'chrome' : undefined, variant: v }} highlight={highlight} /></group> })),
      ],
    });
    r.push({
      name: 'limbs',
      cells: [
        { key: 'wb1', label: 'wristband', node: <><Limb /><Wristband visual={{ primary: '#e01e37', secondary: '#ffffff', text: '23' }} highlight={highlight} /></> },
        { key: 'wb2', label: 'wristband · chrome', node: <><Limb /><Wristband visual={{ primary: '#111111', secondary: '#d4af37', finish: 'matte' }} highlight={highlight} /></> },
        { key: 'eg1', label: 'elbow guard', node: <><Limb h={0.34} /><ElbowGuard visual={{ primary: '#0b2a6b', secondary: '#e01e37', finish: 'gloss' }} highlight={highlight} /></> },
        { key: 'eg2', label: 'elbow guard · metal', node: <><Limb h={0.34} /><ElbowGuard visual={{ primary: '#c0c4cc', secondary: '#111111', finish: 'chrome' }} highlight={highlight} /></> },
      ],
    });
    r.push({
      name: 'cleats',
      cells: VARIANTS.cleats.map((v, i) => ({
        key: `cleat${v}`,
        label: `cleats · ${v}`,
        node: (
          <group position={[0, 0.05, 0]} rotation={[0.35, -0.7, 0]}>
            <group position={[0.06, 0, 0]}><Cleats side="r" visual={{ primary: ['#f5f5f5', '#101010', '#d81b60'][i], secondary: ['#0b2a6b', '#d4af37', '#ffffff'][i], variant: v, finish: i === 1 ? 'gloss' : 'matte' }} highlight={highlight} /></group>
            <group position={[-0.06, 0, 0]}><Cleats side="l" visual={{ primary: ['#f5f5f5', '#101010', '#d81b60'][i], secondary: ['#0b2a6b', '#d4af37', '#ffffff'][i], variant: v, finish: i === 1 ? 'gloss' : 'matte' }} highlight={highlight} /></group>
          </group>
        ),
      })),
    });
    if (!only) return r;
    const byRow = r.filter((x) => x.name === only);
    if (byRow.length) return byRow;
    return r.map((x) => ({ ...x, cells: x.cells.filter((c) => c.key === only) })).filter((x) => x.cells.length);
  }, [only, highlight]);

  const rowH = (name: string) => (name === 'bats' ? 1.05 : name === 'gloves' ? 0.55 : 0.5);
  let y = 0;
  const placed = rows.map((row) => {
    const h = rowH(row.name);
    const yy = y - h / 2;
    y -= h;
    return { row, y: yy };
  });
  const total = -y;

  return (
    <group position={[0, total / 2, 0]}>
      {placed.map(({ row, y: ry }) => (
        <group key={row.name} position={[0, ry, 0]}>
          {row.cells.map((c, i) => (
            <group key={c.key} position={[(i - (row.cells.length - 1) / 2) * spacing, 0, 0]}>
              {c.node}
              <Label text={c.label} y={-rowH(row.name) / 2 + 0.03} />
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}
