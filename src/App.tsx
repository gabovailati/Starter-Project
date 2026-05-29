import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'

const STARS: { x: number; y: number; delay: number }[] = [
  { x: 5, y: 8, delay: 0 }, { x: 15, y: 3, delay: 0.4 }, { x: 28, y: 12, delay: 0.9 },
  { x: 42, y: 5, delay: 0.2 }, { x: 55, y: 15, delay: 0.7 }, { x: 68, y: 4, delay: 1.1 },
  { x: 78, y: 9, delay: 0.5 }, { x: 90, y: 6, delay: 0.3 }, { x: 20, y: 22, delay: 1.3 },
  { x: 35, y: 28, delay: 0.6 }, { x: 50, y: 18, delay: 0.1 }, { x: 62, y: 25, delay: 0.8 },
  { x: 75, y: 30, delay: 1.5 }, { x: 88, y: 20, delay: 0.4 }, { x: 8, y: 35, delay: 1.0 },
]

type Direction = 'ltr' | 'rtl'

type Train = {
  id: number
  emoji: string
  lane: number
  direction: Direction
  durationMs: number
  startedAt: number
}

type Puff = {
  id: number
  x: number
  y: number
  char: string
}

const TRAIN_EMOJIS = ['🚂', '🚃', '🚅', '🚋', '🚄']
const PUFF_CHARS = ['·', '°', '・', '∘']
const LANE_COUNT = 5
const DISPATCH_THROTTLE_MS = 120
const PUFF_COUNT = 4
const MIN_DURATION_MS = 4500
const MAX_DURATION_MS = 7500

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function App() {
  const [trains, setTrains] = useState<Train[]>([])
  const [puffs, setPuffs] = useState<Puff[]>([])
  const [count, setCount] = useState(0)
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem('wtc:muted') === '1'
  })
  const [hasDispatched, setHasDispatched] = useState(false)
  const [nightMode, setNightMode] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem('wtc:night') === '1'
  })
  const [milestone, setMilestone] = useState<number | null>(null)

  const nextIdRef = useRef(1)
  const lastDispatchRef = useRef(0)
  const lastLaneRef = useRef(-1)
  const lastDirRef = useRef<Direction>('rtl')
  const chooRef = useRef<HTMLAudioElement | null>(null)
  const mutedRef = useRef(muted)

  useEffect(() => {
    mutedRef.current = muted
    localStorage.setItem('wtc:muted', muted ? '1' : '0')
  }, [muted])

  useEffect(() => {
    localStorage.setItem('wtc:night', nightMode ? '1' : '0')
  }, [nightMode])

  useEffect(() => {
    if (chooRef.current) return
    const choo = new Audio('/choo-choo.mp3')
    choo.preload = 'auto'
    chooRef.current = choo
  }, [])

  useEffect(() => {
    document.title =
      count === 0
        ? 'welcome to conductor'
        : `welcome to conductor (${count})`
  }, [count])

  useEffect(() => {
    if (count > 0 && count % 10 === 0) {
      setMilestone(count)
    }
  }, [count])

  const playChoo = useCallback(() => {
    if (mutedRef.current) return
    const choo = chooRef.current
    if (!choo) return
    const node = choo.cloneNode(true) as HTMLAudioElement
    node.volume = 0.28
    node.play().catch(() => {})
  }, [])

  const removeTrain = useCallback((id: number) => {
    setTrains((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const removePuff = useCallback((id: number) => {
    setPuffs((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const dispatch = useCallback(() => {
    const now = performance.now()
    if (now - lastDispatchRef.current < DISPATCH_THROTTLE_MS) return
    lastDispatchRef.current = now

    let lane = Math.floor(Math.random() * LANE_COUNT)
    if (lane === lastLaneRef.current) lane = (lane + 1) % LANE_COUNT
    lastLaneRef.current = lane

    const direction: Direction = lastDirRef.current === 'ltr' ? 'rtl' : 'ltr'
    lastDirRef.current = direction

    const durationMs = MIN_DURATION_MS + Math.random() * (MAX_DURATION_MS - MIN_DURATION_MS)
    const train: Train = {
      id: nextIdRef.current++,
      emoji: pick(TRAIN_EMOJIS),
      lane,
      direction,
      durationMs,
      startedAt: now,
    }

    setTrains((prev) => [...prev, train])
    setCount((c) => c + 1)
    setHasDispatched(true)
    playChoo()

    const y = 10 + train.lane * 16
    for (let i = 0; i < PUFF_COUNT; i++) {
      const t = (train.durationMs / (PUFF_COUNT + 1)) * (i + 1)
      setTimeout(() => {
        const elapsed = performance.now() - train.startedAt
        const progress = Math.min(elapsed / train.durationMs, 1)
        const x =
          train.direction === 'ltr' ? -15 + 130 * progress : 115 - 130 * progress
        setPuffs((prev) => [
          ...prev,
          { id: nextIdRef.current++, x, y, char: pick(PUFF_CHARS) },
        ])
      }, t)
    }
  }, [playChoo])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        dispatch()
      } else if (e.key === 'm' || e.key === 'M') {
        setMuted((m) => !m)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch])

  return (
    <main className={nightMode ? 'night' : ''} onClick={dispatch}>
      {nightMode && (
        <div className="stars" aria-hidden>
          {STARS.map((s, i) => (
            <span
              key={i}
              className="star"
              style={{ left: `${s.x}vw`, top: `${s.y}vh`, animationDelay: `${s.delay}s` }}
            >✦</span>
          ))}
        </div>
      )}

      <div className={`hero${hasDispatched ? ' dispatched' : ''}`} aria-hidden={hasDispatched}>
        <span className="train-emoji" role="img" aria-label="train">🚂</span>
        <span className="tagline">click anywhere to dispatch a train</span>
      </div>

      {trains.map((t) => (
        <span
          key={t.id}
          className={`train ${t.direction}`}
          style={{
            top: `${10 + t.lane * 16}vh`,
            animationDuration: `${t.durationMs}ms`,
          }}
          onAnimationEnd={() => removeTrain(t.id)}
        >
          {t.emoji}
        </span>
      ))}

      {puffs.map((p) => (
        <span
          key={p.id}
          className="steam"
          style={{ left: `${p.x}vw`, top: `${p.y}vh` }}
          onAnimationEnd={() => removePuff(p.id)}
        >
          {p.char}
        </span>
      ))}

      <button
        className="night-toggle"
        onClick={(e) => {
          e.stopPropagation()
          setNightMode((n) => !n)
        }}
        aria-label={nightMode ? 'Switch to day mode' : 'Switch to night mode'}
        aria-pressed={nightMode}
      >
        {nightMode ? '☀️' : '🌙'}
      </button>

      <button
        className="mute-toggle"
        onClick={(e) => {
          e.stopPropagation()
          setMuted((m) => !m)
        }}
        aria-label={muted ? 'Unmute' : 'Mute'}
        aria-pressed={muted}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      <div className="counter" aria-live="polite">
        {count} {count === 1 ? 'train' : 'trains'} dispatched
      </div>

      {milestone !== null && (
        <div
          key={milestone}
          className="milestone"
          aria-live="assertive"
          onAnimationEnd={() => setMilestone(null)}
        >
          <div className="milestone-emojis">🎉🚂🎉</div>
          <div className="milestone-count">{milestone}</div>
          <div className="milestone-label">trains dispatched!</div>
        </div>
      )}
    </main>
  )
}

export default App
