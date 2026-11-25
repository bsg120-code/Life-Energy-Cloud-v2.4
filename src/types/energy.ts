export type ScreenTab = 'timer' | 'receiving' | 'dashboard' | 'network' | 'gift';

export type QuantumModeId = 'superconducting' | 'resonance' | 'burst';

export interface EnergySource {
  id: string;
  name: string;
  sub: string;
  icon: string;
  color: string;
  isContinuous?: boolean;
  isCustom?: boolean;
  unit?: 'min' | 'hour';
  min?: number;
  max?: number;
  step?: number;
  initialSeconds: number;
  remainingSeconds: number;
  elapsedSeconds: number;
  totalSupplied: number;
  active: boolean;
  quickButtons: Array<{
    label: string;
    deltaSeconds: number;
  }>;
}

export interface DeviceNode {
  id: string;
  name: string;
  sub: string;
  icon: string;
  online: boolean;
  syncPercent: number;
  isDesktop?: boolean;
  specs?: Array<{
    label: string;
    tone: 'green' | 'cyan';
  }>;
}

export interface ChatSource {
  title: string;
  uri: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  sources?: ChatSource[];
  modelUsed?: string;
  timestamp: string;
}

export const INITIAL_HOURLY_DATA: number[] = [
  35, 45, 20, 65, 80, 55, 90, 75, 40, 85, 95, 110,
];

export const INITIAL_SOURCES: EnergySource[] = [
  {
    id: 'basic',
    name: '기본 충전 (Basic Charge)',
    sub: '1x 일상 활력 • 30분 기본 밸런스 회복',
    icon: '⚡',
    color: '#10b981',
    unit: 'min',
    min: 1,
    max: 120,
    step: 1,
    initialSeconds: 30 * 60,
    remainingSeconds: 30 * 60,
    elapsedSeconds: 0,
    totalSupplied: 1200,
    active: false,
    quickButtons: [
      { label: '-1분', deltaSeconds: -60 },
      { label: '+1분', deltaSeconds: 60 },
      { label: '+5분', deltaSeconds: 300 },
    ],
  },
  {
    id: 'pork',
    name: '돼지고기 (Pork Precision)',
    sub: '22분 정밀 타이머 • 최적 심부 조리 및 활력 보충',
    icon: '🥓',
    color: '#f43f5e',
    unit: 'min',
    min: 1,
    max: 120,
    step: 1,
    initialSeconds: 22 * 60,
    remainingSeconds: 22 * 60,
    elapsedSeconds: 0,
    totalSupplied: 1320,
    active: false,
    quickButtons: [
      { label: '-1분', deltaSeconds: -60 },
      { label: '+1분', deltaSeconds: 60 },
      { label: '+5분', deltaSeconds: 300 },
    ],
  },
  {
    id: 'beef',
    name: '소고기 (Beef Master)',
    sub: '41분 정밀 타이머 • 프리미엄 숙성 & 균일 열순환',
    icon: '🥩',
    color: '#8b5cf6',
    unit: 'min',
    min: 1,
    max: 120,
    step: 1,
    initialSeconds: 41 * 60,
    remainingSeconds: 41 * 60,
    elapsedSeconds: 0,
    totalSupplied: 2460,
    active: false,
    quickButtons: [
      { label: '-1분', deltaSeconds: -60 },
      { label: '+1분', deltaSeconds: 60 },
      { label: '+5분', deltaSeconds: 300 },
    ],
  },
  {
    id: 'rest',
    name: '빠른 휴식 (Quick Rest)',
    sub: '1.5x 파워 냅 • 15분 급속 생체 리셋',
    icon: '🌙',
    color: '#f59e0b',
    unit: 'min',
    min: 1,
    max: 120,
    step: 1,
    initialSeconds: 15 * 60,
    remainingSeconds: 15 * 60,
    elapsedSeconds: 0,
    totalSupplied: 900,
    active: false,
    quickButtons: [
      { label: '-1분', deltaSeconds: -60 },
      { label: '+1분', deltaSeconds: 60 },
      { label: '+5분', deltaSeconds: 300 },
    ],
  },
  {
    id: 'solid',
    name: '고형체 (Solid Body Timer)',
    sub: '8시간 정밀 안정화 • 고밀도 바이오 고형체 숙성 및 충전',
    icon: '💎',
    color: '#ec4899',
    unit: 'hour',
    min: 1,
    max: 24,
    step: 1,
    initialSeconds: 8 * 3600,
    remainingSeconds: 8 * 3600,
    elapsedSeconds: 0,
    totalSupplied: 28800,
    active: false,
    quickButtons: [
      { label: '-30분', deltaSeconds: -1800 },
      { label: '+1시간', deltaSeconds: 3600 },
      { label: '+2시간', deltaSeconds: 7200 },
    ],
  },
  {
    id: 'liquid',
    name: '액상 (Liquid Phase Timer)',
    sub: '72시간 초장기 안정화 • 액상 추출 및 고농도 용해 반응',
    icon: '💧',
    color: '#06b6d4',
    unit: 'hour',
    min: 1,
    max: 120,
    step: 1,
    initialSeconds: 72 * 3600,
    remainingSeconds: 72 * 3600,
    elapsedSeconds: 0,
    totalSupplied: 86400,
    active: false,
    quickButtons: [
      { label: '-1시간', deltaSeconds: -3600 },
      { label: '+1시간', deltaSeconds: 3600 },
      { label: '+6시간', deltaSeconds: 21600 },
    ],
  },
  {
    id: 'bio_continuous',
    name: '생체에너지충전 (Bio Energy Stream)',
    sub: '연속 공급 모드 • 정지 전까지 무제한 실시간 스트림',
    icon: '🧬',
    color: '#00f2fe',
    isContinuous: true,
    initialSeconds: 0,
    remainingSeconds: 0,
    elapsedSeconds: 0,
    totalSupplied: 1800,
    active: false,
    quickButtons: [],
  },
  {
    id: 'custom',
    name: '고객설정 (Custom Timer)',
    sub: '사용자 맞춤 시·분·초 정밀 설정 • 커스텀 에너지 공급',
    icon: '🎛️',
    color: '#38bdf8',
    isCustom: true,
    unit: 'min',
    min: 1,
    max: 180,
    step: 1,
    initialSeconds: 45 * 60,
    remainingSeconds: 45 * 60,
    elapsedSeconds: 0,
    totalSupplied: 0,
    active: false,
    quickButtons: [
      { label: '-5분', deltaSeconds: -300 },
      { label: '+5분', deltaSeconds: 300 },
      { label: '+15분', deltaSeconds: 900 },
    ],
  },
];

export const INITIAL_DEVICES: DeviceNode[] = [
  {
    id: 'desktop-pc',
    name: '에너지 디바이스 연결 PC',
    sub: 'USB 고속 직결 및 클라우드 실시간 제어',
    icon: '🖥️',
    online: true,
    syncPercent: 100,
    isDesktop: true,
    specs: [
      { label: '⚡ HW 직결', tone: 'green' },
      { label: '🔌 COM3', tone: 'cyan' },
      { label: '🌐 LAN 1Gbps', tone: 'cyan' },
      { label: '● 지연 2ms', tone: 'green' },
    ],
  },
  {
    id: 'smart-band',
    name: 'Smart Band Pro',
    sub: '심박 & 체온 센서 • 배터리 88%',
    icon: '⌚',
    online: true,
    syncPercent: 99,
  },
  {
    id: 'eeg-headset',
    name: 'EEG Bio-Headset',
    sub: '알파/세타 뇌파 트래커 • 배터리 94%',
    icon: '🧠',
    online: true,
    syncPercent: 99,
  },
  {
    id: 'home-hub',
    name: 'Home Energy Hub',
    sub: '공간 조도 및 바이오 사운드 조절기',
    icon: '🏠',
    online: true,
    syncPercent: 99,
  },
  {
    id: 'workstation',
    name: 'Workstation Client',
    sub: '집중 모드 동기화 앱 • 온디바이스',
    icon: '💻',
    online: true,
    syncPercent: 99,
  },
];

export const QUANTUM_MODES: Record<
  QuantumModeId,
  {
    label: string;
    stateBadge: string;
    rate: string;
    entanglement: string;
    density: string;
    efficiency: string;
  }
> = {
  superconducting: {
    label: '초전도 방출',
    stateBadge: 'COHERENT SUPERCONDUCTIVITY',
    rate: '4.912 PFLOPS/e',
    entanglement: '99.98 %',
    density: '5.42 × 10¹⁴ eV',
    efficiency: '99.4 %',
  },
  resonance: {
    label: '공명 포집',
    stateBadge: 'HARMONIC ENTANGLEMENT',
    rate: '3.120 PFLOPS/e',
    entanglement: '97.45 %',
    density: '3.80 × 10¹⁴ eV',
    efficiency: '95.8 %',
  },
  burst: {
    label: '양자 펄스',
    stateBadge: 'HIGH-ENERGY PULSED BURST',
    rate: '8.730 PFLOPS/e',
    entanglement: '94.10 %',
    density: '7.65 × 10¹⁴ eV',
    efficiency: '93.2 %',
  },
};
