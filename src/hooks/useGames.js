import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'

export function useGames(teamId) {
  return useQuery({
    queryKey: ['games', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('team_id', teamId)
        .order('date', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!teamId,
  })
}

export function useGame(gameId) {
  return useQuery({
    queryKey: ['game', gameId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!gameId,
  })
}

export function useAddGame(teamId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (game) => {
      const { data, error } = await supabase
        .from('games')
        .insert({ ...game, team_id: teamId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['games', teamId] }),
  })
}

export function useUpdateGame(teamId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('games')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['games', teamId] })
      qc.setQueryData(['game', data.id], data)
    },
  })
}

export function useDeleteGame(teamId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('games').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['games', teamId] }),
  })
}
