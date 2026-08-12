export interface CallRecord {
  id: number;
  user_id: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  topic?: string;
  performance?: string;
  status: 'answered' | 'missed' | 'failed';
}

export interface ScheduleConfig {
  user_id: string;
  preferred_time: string; // "HH:MM"
  sip_uri: string; // "sip:username@domain"
}

export interface CallStatusEvent {
  type: 'call_status';
  status: 'READY' | 'CONNECTING' | 'CALLING' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'CALL ENDED';
}
