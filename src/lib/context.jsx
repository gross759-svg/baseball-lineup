import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)
export const TeamContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

export function useTeam() {
  return useContext(TeamContext)
}
