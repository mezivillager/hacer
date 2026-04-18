import { useEffect, useState } from 'react'

const KEY = 'helpBarCollapsed'

export function useHelpBarCollapsed(): [boolean, (v: boolean) => void] {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(KEY) === 'true'
  })
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(KEY, String(collapsed))
  }, [collapsed])
  return [collapsed, setCollapsed]
}
