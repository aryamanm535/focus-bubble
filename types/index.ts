export interface Profile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  school_or_job: string | null
  streak_days: number
  total_focus_minutes: number
  created_at: string
}

export interface Room {
  id: string
  name: string
  description: string | null
  environment: string
  is_public: boolean
  access_key: string | null
  host_id: string
  focus_duration: number
  break_duration: number
  timer_state: TimerState
  media_mode: 'none' | 'audio' | 'video'
  created_at: string
  participant_count?: number
}

export interface TimerState {
  status: 'idle' | 'focus' | 'break'
  started_at: string | null
  ends_at: string | null
  round: number
}

export interface PresenceUser {
  userId: string
  displayName: string
  avatarUrl: string | null
  status: 'active' | 'away' | 'break'
  task: string | null
  joinedAt: string
  online_at?: string
}

export interface Reaction {
  id: string
  emoji: string
  label: string
  fromUser: string
  timestamp: number
}

export interface FocusSession {
  id: string
  user_id: string
  room_id: string | null
  task: string | null
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
}
