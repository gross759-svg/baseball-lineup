import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'

const KEY = (gameId) => ['pitching', gameId]

export function usePitching(gameId) {
  return useQuery({
    queryKey: KEY(gameId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pitching_log')
        .select('*')
        .eq('game_id', gameId)
      if (error) throw error
      return data
    },
    enabled: !!gameId,
  })
}

/** Per-inning live entry */
export function useUpsertPitch(gameId) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ playerId, inning, pitchCount }) => {
      const { data, error } = await supabase
        .from('pitching_log')
        .upsert(
          { game_id: gameId, player_id: playerId, inning, pitch_count: pitchCount },
          { onConflict: 'game_id,player_id,inning' }
        )
        .select()
        .single()
      if (error) throw error
      return data
    },

    onMutate: async ({ playerId, inning, pitchCount }) => {
      await qc.cancelQueries({ queryKey: KEY(gameId) })
      const previous = qc.getQueryData(KEY(gameId))

      qc.setQueryData(KEY(gameId), (old = []) => {
        const filtered = old.filter(
          (p) => !(p.player_id === playerId && p.inning === inning)
        )
        return [
          ...filtered,
          { id: `opt-${Date.now()}`, game_id: gameId, player_id: playerId, inning, pitch_count: pitchCount },
        ]
      })

      return { previous }
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) qc.setQueryData(KEY(gameId), ctx.previous)
    },

    onSettled: () => qc.invalidateQueries({ queryKey: KEY(gameId) }),
  })
}

/** Post-game bulk entry: inning = 0 */
export function useBulkPitch(gameId) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (entries) => {
      // entries: [{ playerId, pitchCount }]
      const rows = entries
        .filter(e => e.pitchCount > 0)
        .map(e => ({
          game_id: gameId,
          player_id: e.playerId,
          inning: 0,
          pitch_count: e.pitchCount,
        }))
      if (!rows.length) return []
      const { data, error } = await supabase
        .from('pitching_log')
        .upsert(rows, { onConflict: 'game_id,player_id,inning' })
        .select()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(gameId) }),
  })
}

/** Compute total pitches per player for a game from the log */
export function pitchTotals(log = []) {
  const totals = {}
  for (const row of log) {
    if (!totals[row.player_id]) totals[row.player_id] = 0
    // inning=0 is a bulk override; if it exists, prefer it over per-inning sum
    if (row.inning === 0) {
      totals[row.player_id] = row.pitch_count
    } else if (totals[row.player_id] !== undefined && !log.some(r => r.player_id === row.player_id && r.inning === 0)) {
      totals[row.player_id] += row.pitch_count
    }
  }
  // Recalculate properly: if bulk entry exists, use it; else sum per-inning
  const result = {}
  const playerIds = [...new Set(log.map(r => r.player_id))]
  for (const pid of playerIds) {
    const playerLog = log.filter(r => r.player_id === pid)
    const bulk = playerLog.find(r => r.inning === 0)
    if (bulk) {
      result[pid] = bulk.pitch_count
    } else {
      result[pid] = playerLog.reduce((sum, r) => sum + r.pitch_count, 0)
    }
  }
  return result
}
