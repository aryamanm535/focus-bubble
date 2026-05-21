'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { PresenceUser } from '@/types'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/utils'

interface Props {
  users:       PresenceUser[]
  currentUser: string
}

function Avatar({ user, isSelf }: { user: PresenceUser; isSelf: boolean }) {
  const initials = (user.displayName || '?')
    .split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()

  const statusColor = STATUS_COLORS[user.status] ?? '#7a6a60'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{ type: 'spring', damping: 18, stiffness: 260 }}
      className="flex flex-col items-center gap-2"
    >
      {/* Avatar circle */}
      <div className="relative">
        {/* Ping ring for active users */}
        {user.status === 'active' && (
          <div className="absolute inset-0 rounded-full animate-ping-ring"
               style={{ background: statusColor, opacity: 0.3 }} />
        )}

        <div className="relative w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold"
             style={{
               background: user.avatarUrl ? 'transparent' : `${statusColor}30`,
               border: `2.5px solid ${statusColor}`,
               color: statusColor,
               fontSize: 15,
             }}>
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.displayName}
                 className="w-full h-full rounded-full object-cover" />
          ) : (
            initials
          )}
        </div>

        {/* Status dot */}
        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
             style={{ background: statusColor, borderColor: 'rgba(0,0,0,0.5)' }} />
      </div>

      {/* Name */}
      <div className="text-center max-w-[72px]">
        <p className="text-xs font-medium truncate leading-tight"
           style={{ color: isSelf ? '#fff' : 'rgba(255,255,255,0.85)' }}>
          {isSelf ? 'You' : user.displayName}
        </p>
        {user.task && (
          <p className="text-xs truncate leading-tight mt-0.5"
             style={{ color: 'rgba(255,255,255,0.4)', maxWidth: 72 }}
             title={user.task}>
            {user.task}
          </p>
        )}
        <p className="text-xs leading-tight" style={{ color: statusColor, opacity: 0.8 }}>
          {STATUS_LABELS[user.status]}
        </p>
      </div>
    </motion.div>
  )
}

export default function PresenceGrid({ users, currentUser }: Props) {
  return (
    <div className="flex flex-wrap gap-5 justify-center">
      <AnimatePresence mode="popLayout">
        {users.map((user) => (
          <Avatar key={user.userId} user={user} isSelf={user.userId === currentUser} />
        ))}
      </AnimatePresence>

      {users.length === 0 && (
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Just you so far — invite someone!
        </p>
      )}
    </div>
  )
}
