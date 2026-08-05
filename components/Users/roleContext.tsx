"use client"

import { createContext, useContext } from "react"

type SessionUser = {
  id: number
  role: "admin" | "user" | "accounts"
}

const AuthContext = createContext<SessionUser | null>(null)

export const AuthProvider = ({
  user,
  role,
  children,
}: {
  user: SessionUser | null
  role: "admin" | "user" | "accounts"
  children: React.ReactNode
}) => {
  return (
    <AuthContext.Provider value={user}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}