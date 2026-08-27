'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api/client'

interface ExperimentConfig {
  name: string
  variants: string[]
  traffic?: number
}

const experiments: Record<string, ExperimentConfig> = {}

export function useExperiment(experimentName: string) {
  const [variant, setVariant] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const token = localStorage.getItem('auth-storage')
          ? JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.accessToken
          : null
        if (!token) {
          if (!cancelled) setVariant('control')
          return
        }

        const res = await api.get('/experiments/variant', {
          params: { name: experimentName },
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!cancelled) {
          setVariant(res.data.data?.variant || 'control')
        }
      } catch {
        if (!cancelled) {
          setVariant('control')
          setError('Experiment not available')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [experimentName])

  const trackEvent = async (eventType: string, metadata?: Record<string, unknown>) => {
    try {
      await api.post('/experiments/track', {
        name: experimentName,
        event: eventType,
        metadata: metadata || {},
      })
    } catch {}
  }

  return { variant, loading, error, trackEvent }
}

export function registerExperiment(config: ExperimentConfig) {
  experiments[config.name] = config
}
