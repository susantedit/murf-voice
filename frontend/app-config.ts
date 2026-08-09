export interface AppConfig {
  pageTitle: string;
  pageDescription: string;
  companyName: string;

  supportsChatInput: boolean;
  supportsVideoInput: boolean;
  supportsScreenShare: boolean;
  isPreConnectBufferEnabled: boolean;

  logo: string;
  startButtonText: string;
  accent?: string;
  logoDark?: string;
  accentDark?: string;

  audioVisualizerType?: 'bar' | 'wave' | 'grid' | 'radial' | 'aura';
  audioVisualizerColor?: `#${string}`;
  audioVisualizerColorDark?: `#${string}`;
  audioVisualizerColorShift?: number;
  audioVisualizerBarCount?: number;
  audioVisualizerGridRowCount?: number;
  audioVisualizerGridColumnCount?: number;
  audioVisualizerRadialBarCount?: number;
  audioVisualizerRadialRadius?: number;
  audioVisualizerWaveLineWidth?: number;

  // agent dispatch configuration
  agentName?: string;

  // LiveKit Cloud Sandbox configuration
  sandboxId?: string;
}

export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: 'Vidya',
  pageTitle: 'Vidya — Your Voice Learning Assistant',
  pageDescription:
    'Learn, practice, and revise with Vidya — a friendly AI voice tutor powered by Murf Falcon.',

  supportsChatInput: true,
  supportsVideoInput: false,
  supportsScreenShare: false,
  isPreConnectBufferEnabled: true,

  logo: '/murf-logo.svg',
  logoDark: '/murf-logo-dark.svg',
  accent: '#6366F1',
  accentDark: '#818cf8',
  startButtonText: 'Start Learning',

  // Wave visualizer — clean, educational feel
  audioVisualizerType: 'aura',
  audioVisualizerColor: '#6366F1',
  audioVisualizerColorDark: '#818cf8',
  audioVisualizerColorShift: 0.4,

  // agent dispatch
  agentName: process.env.AGENT_NAME ?? undefined,

  sandboxId: undefined,
};
