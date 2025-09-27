import { useEffect, useState } from 'react'
import { addDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'

type Appt = {
  id?: string
  customerName: string
  serviceName: string
  start: string
  end: string
}

export default function AgendaPage() {
  const [rows, setRows] = useState<Appt[]>([])
  const [form, setForm] = useState<Appt>({ customerName: '', serviceName: '', start: '', end: '' })

  const load = async () => {
    const snap = await getDocs(collection(db, 'appointments'))
    setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Appt) })))
  }

  useEffect(() => {
    load()
  }, [])

  const create = async () => {
    await addDoc(collection(db, 'appointments'), form)
    setForm({ customerName: '', serviceName: '', start: '', end: '' })
    load()
  }

  return (
    <div>
      <h2>Agenda</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
        <input
          value={form.customerName}
          placeholder="Cliente"
          onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
        />
        <input
          value={form.serviceName}
          placeholder="Servicio"
          onChange={(e) => setForm((f) => ({ ...f, serviceName: e.target.value }))}
        />
        <input
          type="datetime-local"
          value={form.start}
          onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
        />
        <input
          type="datetime-local"
          value={form.end}
          onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
        />
        <button onClick={create}>Crear</button>
      </div>

      <table style={{ width: '100%', marginTop: 12 }}>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Servicio</th>
            <th>Inicio</th>
            <th>Fin</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.customerName}</td>
              <td>{r.serviceName}</td>
              <td>{r.start}</td>
              <td>{r.end}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
