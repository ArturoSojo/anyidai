import { collection, getCountFromServer, query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'

type Counts = {
  customers?: number
  services?: number
  products?: number
  ticketsHoy?: number
}

export default function Dashboard() {
  const [counts, setCounts] = useState<Counts>({})

  useEffect(() => {
    ;(async () => {
      const todayISO = new Date().toISOString().slice(0, 10)
      const customersRef = collection(db, 'customers')
      const servicesRef = collection(db, 'services')
      const productsRef = collection(db, 'products')
      const ticketsRef = collection(db, 'tickets')
      const c1 = await getCountFromServer(customersRef)
      const c2 = await getCountFromServer(servicesRef)
      const c3 = await getCountFromServer(productsRef)
      const c4 = await getCountFromServer(query(ticketsRef, where('date', '==', todayISO)))
      setCounts({
        customers: c1.data().count,
        services: c2.data().count,
        products: c3.data().count,
        ticketsHoy: c4.data().count,
      })
    })()
  }, [])

  return (
    <div>
      <h2>Dashboard</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <Card title="Clientes" value={counts.customers} />
        <Card title="Servicios" value={counts.services} />
        <Card title="Productos" value={counts.products} />
        <Card title="Tickets hoy" value={counts.ticketsHoy} />
      </div>
    </div>
  )
}

function Card({ title, value }: { title: string; value?: number }) {
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value ?? '—'}</div>
    </div>
  )
}
