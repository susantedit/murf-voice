'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion } from 'motion/react';
import { useSessionContext, useSessionMessages } from '@livekit/components-react';
import type { ReceivedMessage } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { SessionSummary } from '@/components/app/session-summary';
import { VidyaLearningRoom } from '@/components/app/vidya-learning-room';
import { WelcomeView } from '@/components/app/welcome-view';

const MotionWelcomeView = motion.create(WelcomeView);
const MotionLearningRoom = motion.create(VidyaLearningRoom);
const MotionSessionSummary = motion.create(SessionSummary);

const VIEW_MOTION_PROPS = {
  variants: {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: { duration: 0.5, ease: 'linear' },
};

interface ViewControllerProps {
  appConfig: AppConfig;
  onStartCall?: () => void;
  onEndCall?: () => void;
}

export function ViewController({ appConfig, onStartCall, onEndCall }: ViewControllerProps) {
  const { isConnected, start, end } = useSessionContext();
  const session = useSessionContext();
  const { messages } = useSessionMessages(session);
  const { resolvedTheme } = useTheme();

  // ── Session summary state ──────────────────────────────────────────────
  const [showSummary, setShowSummary] = useState(false);
  const [capturedMessages, setCapturedMessages] = useState<ReceivedMessage[]>([]);

  // Track the previous connection state to detect true → false transition.
  const wasConnected = useRef(false);

  useEffect(() => {
    if (wasConnected.current && !isConnected) {
      // Transition: connected → disconnected — show summary
      setCapturedMessages([...messages]);
      setShowSummary(true);
    }
    wasConnected.current = isConnected;
  }, [isConnected, messages]);

  const handleStart = onStartCall ?? start;
  const handleEnd = onEndCall ?? end;

  const handleContinue = () => {
    setShowSummary(false);
    setCapturedMessages([]);
  };

  return (
    <AnimatePresence mode="wait">
      {/* Active session — Vidya Learning Room */}
      {isConnected && (
        <MotionLearningRoom
          key="learning-room"
          {...VIEW_MOTION_PROPS}
          audioVisualizerType={appConfig.audioVisualizerType}
          audioVisualizerColor={
            resolvedTheme === 'dark'
              ? appConfig.audioVisualizerColorDark
              : appConfig.audioVisualizerColor
          }
          audioVisualizerColorShift={appConfig.audioVisualizerColorShift}
          audioVisualizerBarCount={appConfig.audioVisualizerBarCount}
          audioVisualizerGridRowCount={appConfig.audioVisualizerGridRowCount}
          audioVisualizerGridColumnCount={appConfig.audioVisualizerGridColumnCount}
          audioVisualizerRadialBarCount={appConfig.audioVisualizerRadialBarCount}
          audioVisualizerRadialRadius={appConfig.audioVisualizerRadialRadius}
          audioVisualizerWaveLineWidth={appConfig.audioVisualizerWaveLineWidth}
          onDisconnect={handleEnd}
          className="fixed inset-0"
        />
      )}

      {/* Session summary — shown after disconnect */}
      {!isConnected && showSummary && (
        <MotionSessionSummary
          key="session-summary"
          {...VIEW_MOTION_PROPS}
          messages={capturedMessages}
          onContinue={handleContinue}
        />
      )}

      {/* Welcome / Ready view */}
      {!isConnected && !showSummary && (
        <MotionWelcomeView
          key="welcome"
          {...VIEW_MOTION_PROPS}
          startButtonText={appConfig.startButtonText}
          onStartCall={handleStart}
        />
      )}
    </AnimatePresence>
  );
}
