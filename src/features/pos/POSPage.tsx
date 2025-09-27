import { useEffect, useState } from 'react'
import { addDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'

type Item = {
  kind: 'SERVICE' | 'PRODUCT'
  id: string
  name: string
  price: number
}

type CartItem = Item & { qty: number }

export default function POSPage() {
  const [catalog, setCatalog] = useState<Item[]>([])
  const [cart, setCart] = useState<CartItem[]>([])

  useEffect(() => {
    ;(async () => {
      const servicesSnap = await getDocs(collection(db, 'services'))
      const productsSnap = await getDocs(collection(db, 'products'))
      const services = servicesSnap.docs.map(
        (d) => ({ kind: 'SERVICE', id: d.id, name: d.data().name, price: d.data().price }) as Item,
      )
      const products = productsSnap.docs.map(
        (d) => ({ kind: 'PRODUCT', id: d.id, name: d.data().name, price: d.data().price }) as Item,
      )
      setCatalog([...services, ...products])
    })()
  }, [])

  const add = (item: Item) =>
    setCart((prev) => {
      const index = prev.findIndex((x) => x.id === item.id && x.kind === item.kind)
      if (index >= 0) {
        const copy = [...prev]
        copy[index].qty += 1
        return copy
      }
      return [...prev, { ...item, qty: 1 }]
    })

  const total = cart.reduce((sum, it) => sum + it.price * it.qty, 0)

  const pay = async () => {
    await addDoc(collection(db, 'tickets'), {
      items: cart.map(({ kind, id, name, price, qty }) => ({ kind, refId: id, name, price, qty })),
      total,
      date: new Date().toISOString().slice(0, 10),
      createdAt: Date.now(),
      status: 'PAID',
    })
    alert('Ticket guardado!')
    setCart([])
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div>
        <h3>Catálogo</h3>
        <ul>
          {catalog.map((c) => (
            <li key={c.kind + c.id}>
              {c.name} — {c.price.toFixed(2)} <button onClick={() => add(c)}>Añadir</button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3>Carrito</h3>
        <ul>
          {cart.map((c) => (
            <li key={c.kind + c.id}>
              {c.name} x {c.qty} — {(c.price * c.qty).toFixed(2)}
            </li>
          ))}
        </ul>
        <h2>Total: {total.toFixed(2)}</h2>
        <button disabled={!cart.length} onClick={pay}>
          Cobrar
        </button>
      </div>
    </div>
  )
}
