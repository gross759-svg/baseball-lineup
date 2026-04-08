import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'

const KEY = (gameId) => ['lineup', gameId]

export function useLineup(gameId) {
  return useQuery({
    queryKey: KEY(gameId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lineup_assignments')
        .select('*')
        .eq('game_id', gameId)
      if (error) throw error
      return data
    },
    enabled: !!gameId,
  })
}

/**
 * Upsert a single assignment (or clear it if position === null).
 * Optimistic update: reflects instantly in the cache.
 */
export function useUpsertAssignment(gameId) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ playerId, inning, position }) => {
      if (position === null) {
        // Delete the assignment
        const { error } = await supabase
          .from('lineup_assignments')
          .delete()
          .eq('game_id', gameId)
          .eq('player_id', playerId)
          .eq('inning', inning)
        if (error) throw error
        return null
      }
      const { data, error } = await supabase
        .from('lineup_assignments')
        .upsert(
          { game_id: gameId, player_id: playerId, inning, position },
          { onConflict: 'game_id,player_id,inning' }
        )
        .select()
        .single()
      if (error) throw error
      return data
    },

    onMutate: async ({ playerId, inning, position }) => {
      await qc.cancelQueries({ queryKey: KEY(gameId) })
      const previous = qc.getQueryData(KEY(gameId))

      qc.setQueryData(KEY(gameId), (old = []) => {
        const filtered = old.filter(
          (a) => !(a.player_id === playerId && a.inning === inning)
        )
        if (position === null) return filtered
        return [
          ...filtered,
          { id: `opt-${Date.now()}`, game_id: gameId, player_id: playerId, inning, position },
        ]
      })

      return { previous }
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(KEY(gameId), ctx.previous)
      }
    },

    onSettled: () => qc.invalidateQueries({ queryKey: KEY(gameId) }),
  })
}

/**
 * Remove the last inning: deletes its assignments + pitching entries, decrements game.innings.
 */
export function useRemoveInning(gameId, teamId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (inning) => {
      await supabase.from('lineup_assignments').delete()
        .eq('game_id', gameId).eq('inning', inning)
      await supabase.from('pitching_log').delete()
        .eq('game_id', gameId).eq('inning', inning)
      const { data, error } = await supabase
        .from('games').update({ innings: inning - 1 })
        .eq('id', gameId).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: KEY(gameId) })
      qc.invalidateQueries({ queryKey: ['pitching', gameId] })
      qc.invalidateQueries({ queryKey: ['games', teamId] })
      qc.setQueryData(['game', gameId], data)
    },
  })
}

/**
 * Accept a full array of suggested assignments for an inning.
 * Optimistic batch update.
 */
export function useAcceptSuggestion(gameId) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ inning, suggestions }) => {
      // Delete existing assignments for this inning first
      await supabase
        .from('lineup_assignments')
        .delete()
        .eq('game_id', gameId)
        .eq('inning', inning)

      if (!suggestions.length) return []

      const rows = suggestions.map(s => ({
        game_id: gameId,
        player_id: s.player_id,
        inning: s.inning,
        position: s.position,
      }))

      const { data, error } = await supabase
        .from('lineup_assignments')
        .insert(rows)
        .select()
      if (error) throw error
      return data
    },

    onMutate: async ({ inning, suggestions }) => {
      await qc.cancelQueries({ queryKey: KEY(gameId) })
      const previous = qc.getQueryData(KEY(gameId))

      qc.setQueryData(KEY(gameId), (old = []) => {
        const kept = old.filter((a) => a.inning !== inning)
        const newRows = suggestions.map((s, i) => ({
          id: `opt-sug-${i}-${Date.now()}`,
          game_id: gameId,
          player_id: s.player_id,
          inning: s.inning,
          position: s.position,
        }))
        return [...kept, ...newRows]
      })

      return { previous }
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(KEY(gameId), ctx.previous)
      }
    },

    onSettled: () => qc.invalidateQueries({ queryKey: KEY(gameId) }),
  })
}
