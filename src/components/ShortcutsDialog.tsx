import { useEffect, useRef } from 'react'
import { CloseIcon } from './icons'
import './ShortcutsDialog.css'

const SECTIONS: { title: string; keys: [string[], string][] }[] = [
  {
    title: 'Grid',
    keys: [
      [['↑', '↓', '←', '→'], 'Move the focused cell'],
      [['Ctrl', '↑ / ↓'], 'First / last row'],
      [['Home', 'End'], 'First / last column'],
      [['PgUp', 'PgDn'], 'Page up / down'],
      [['Enter'], 'Open details for the focused row'],
      [['Space'], 'Select or unselect the focused row'],
      [['Shift', '↑ / ↓'], 'Extend the selection'],
      [['Ctrl', 'A'], 'Select / unselect all shown rows'],
      [['S'], 'Sort by the focused column (again to reverse)'],
      [['P'], 'Pin or unpin the focused column'],
    ],
  },
  {
    title: 'Anywhere',
    keys: [
      [['/'], 'Go to the filters'],
      [['Esc'], 'Close details, or leave the filters'],
      [['?'], 'Show this list'],
    ],
  },
  {
    title: 'Mouse',
    keys: [
      [['Click'], 'Select or unselect a row'],
      [['Shift', 'Click'], 'Select a range'],
      [['Double-click'], 'Open details'],
    ],
  },
]

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={ref}
      className="shortcuts"
      aria-labelledby="shortcuts-title"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <header className="shortcuts__header">
        <h2 id="shortcuts-title">Keyboard shortcuts</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close" autoFocus>
          <CloseIcon />
        </button>
      </header>
      <div className="shortcuts__body">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h3>{section.title}</h3>
            <dl>
              {section.keys.map(([keys, action]) => (
                <div key={action}>
                  <dt>
                    {keys.map((k) => (
                      <kbd key={k}>{k}</kbd>
                    ))}
                  </dt>
                  <dd>{action}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </dialog>
  )
}
