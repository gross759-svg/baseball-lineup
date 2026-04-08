import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'

export function usePlayers(teamId) {
  return useQuery({
    queryKey: ['players', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamId)
        .eq('active', true)
        .order('name')
      if (error) throw error
      return data
    },
    enabled: !!teamId,
  })
}

export function useAddPlayer(teamId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (player) => {
      const { data, error } = await supabase
        .from('players')
        .insert({ ...player, team_id: teamId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['players', teamId] }),
  })
}

export function useUpdatePlayer(teamId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('players')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['players', teamId] }),
  })
}

export function useDeletePlayer(teamId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      // Soft-delete: set active = false
      const { error } = await supabase
        .from('players')
        .update({ active: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['players', teamId] }),
  })
}
