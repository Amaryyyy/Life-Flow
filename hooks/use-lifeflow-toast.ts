"use client"

import { useCallback, useRef, useState } from 'react'

export function useToast() {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')
  const [icon, setIcon] = useState('\u2726')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const showToast = useCallback((msg: string, toastIcon = '\u2726') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setMessage(msg)
    setIcon(toastIcon)
    setVisible(true)
    timeoutRef.current = setTimeout(() => setVisible(false), 2800)
  }, [])

  return { visible, message, icon, showToast }
}
