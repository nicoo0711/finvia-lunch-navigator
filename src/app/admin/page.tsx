'use client'

import { useState } from 'react'
import styles from './admin.module.css'

type ItemRow = { name: string; price: string; vegan: boolean; vegetarisch: boolean; glutenfrei: boolean }
type DayRow = { date: string; items: ItemRow[] }

const emptyItem = (): ItemRow => ({ name: '', price: '', vegan: false, vegetarisch: false, glutenfrei: false })
const emptyDay = (): DayRow => {
  const d = new Date()
  return { date: d.toISOString().split('T')[0], items: [emptyItem()] }
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [days, setDays] = useState<DayRow[]>([emptyDay()])
  const [status, setStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    if (password.length > 0) setAuthed(true)
  }

  function updateItem(dayIdx: number, itemIdx: number, field: keyof ItemRow, value: string | boolean) {
    setDays((prev) => {
      const next = prev.map((d, di) =>
        di === dayIdx
          ? { ...d, items: d.items.map((it, ii) => (ii === itemIdx ? { ...it, [field]: value } : it)) }
          : d
      )
      return next
    })
  }

  function addItem(dayIdx: number) {
    setDays((prev) => prev.map((d, di) => di === dayIdx ? { ...d, items: [...d.items, emptyItem()] } : d))
  }

  function removeItem(dayIdx: number, itemIdx: number) {
    setDays((prev) => prev.map((d, di) =>
      di === dayIdx ? { ...d, items: d.items.filter((_, ii) => ii !== itemIdx) } : d
    ))
  }

  function addDay() { setDays((prev) => [...prev, emptyDay()]) }
  function removeDay(idx: number) { setDays((prev) => prev.filter((_, i) => i !== idx)) }

  async function handleSave() {
    setSaving(true)
    setStatus(null)
    const payload = {
      restaurantId: 'fresh74',
      days: days.map((d) => ({
        date: d.date,
        items: d.items
          .filter((i) => i.name.trim())
          .map((i) => ({
            name: i.name.trim(),
            price: parseFloat(i.price.replace(',', '.')) || 0,
            tags: [
              ...(i.vegan ? ['vegan'] : []),
              ...(i.vegetarisch ? ['vegetarisch'] : []),
              ...(i.glutenfrei ? ['glutenfrei'] : []),
            ],
          })),
      })),
    }

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify(payload),
      })
      if (res.ok) setStatus('✓ Gespeichert!')
      else setStatus('Fehler beim Speichern – falsches Passwort?')
    } catch {
      setStatus('Netzwerkfehler')
    } finally {
      setSaving(false)
    }
  }

  if (!authed) {
    return (
      <div className={styles.loginWrap}>
        <form onSubmit={handleAuth} className={styles.loginCard}>
          <h1 className={styles.loginTitle}>Admin</h1>
          <p className={styles.loginSub}>fresh74 Wochenkarte eintragen</p>
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
          />
          <button type="submit" className={styles.btn}>Anmelden</button>
        </form>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.title}>Admin · fresh74</h1>
          <p className={styles.sub}>Wochenkarte eintragen</p>
        </div>
        <a href="/" className={styles.backLink}>← Zurück zur App</a>
      </div>

      <div className={styles.container}>
        {days.map((day, di) => (
          <div key={di} className={styles.dayCard}>
            <div className={styles.dayHeader}>
              <label className={styles.label}>Datum</label>
              <input
                type="date"
                value={day.date}
                onChange={(e) => setDays((prev) => prev.map((d, i) => i === di ? { ...d, date: e.target.value } : d))}
                className={styles.input}
              />
              {days.length > 1 && (
                <button onClick={() => removeDay(di)} className={styles.removeBtn}>Tag entfernen</button>
              )}
            </div>

            {day.items.map((item, ii) => (
              <div key={ii} className={styles.itemRow}>
                <input
                  placeholder="Gerichtsname"
                  value={item.name}
                  onChange={(e) => updateItem(di, ii, 'name', e.target.value)}
                  className={`${styles.input} ${styles.nameInput}`}
                />
                <input
                  placeholder="Preis (z.B. 9.50)"
                  value={item.price}
                  onChange={(e) => updateItem(di, ii, 'price', e.target.value)}
                  className={`${styles.input} ${styles.priceInput}`}
                />
                <div className={styles.tags}>
                  {(['vegan', 'vegetarisch', 'glutenfrei'] as const).map((tag) => (
                    <label key={tag} className={styles.tagLabel}>
                      <input
                        type="checkbox"
                        checked={item[tag]}
                        onChange={(e) => updateItem(di, ii, tag, e.target.checked)}
                      />
                      {tag}
                    </label>
                  ))}
                </div>
                <button onClick={() => removeItem(di, ii)} className={styles.removeBtn}>✕</button>
              </div>
            ))}

            <button onClick={() => addItem(di)} className={styles.addItemBtn}>+ Gericht hinzufügen</button>
          </div>
        ))}

        <button onClick={addDay} className={styles.addDayBtn}>+ Tag hinzufügen</button>

        <div className={styles.saveRow}>
          {status && <span className={styles.status}>{status}</span>}
          <button onClick={handleSave} disabled={saving} className={styles.saveBtn}>
            {saving ? 'Wird gespeichert…' : 'Wochenkarte speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
