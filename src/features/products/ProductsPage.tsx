import { useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore'
import { useForm } from 'react-hook-form'
import { db } from '../../lib/firebase'

type Product = {
  id?: string
  sku: string
  name: string
  price: number
  stock: number
  minStock: number
}

export default function ProductsPage() {
  const [rows, setRows] = useState<Product[]>([])
  const { register, handleSubmit, reset } = useForm<Product>()

  const load = async () => {
    const snap = await getDocs(collection(db, 'products'))
    setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Product) })))
  }

  useEffect(() => {
    load()
  }, [])

  const onSubmit = async (data: Product) => {
    const payload = {
      ...data,
      price: Number(data.price),
      stock: Number(data.stock),
      minStock: Number(data.minStock),
    }

    if (data.id) {
      const { id: _id, ...rest } = payload
      await updateDoc(doc(db, 'products', data.id), rest)
    } else {
      await addDoc(collection(db, 'products'), payload)
    }

    reset({ sku: '', name: '', price: 0, stock: 0, minStock: 0 })
    load()
  }

  const edit = (p: Product) => reset(p)
  const del = async (id?: string) => {
    if (!id) return
    await deleteDoc(doc(db, 'products', id))
    load()
  }

  return (
    <div>
      <h2>Productos</h2>
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8, alignItems: 'end' }}
      >
        <input type="hidden" {...register('id')} />
        <input placeholder="SKU" {...register('sku', { required: true })} />
        <input placeholder="Nombre" {...register('name', { required: true })} />
        <input type="number" step="0.01" placeholder="Precio" {...register('price', { valueAsNumber: true })} />
        <input type="number" placeholder="Stock" {...register('stock', { valueAsNumber: true })} />
        <input type="number" placeholder="Stock mínimo" {...register('minStock', { valueAsNumber: true })} />
        <button type="submit">Guardar</button>
      </form>

      <table style={{ width: '100%', marginTop: 12 }}>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Nombre</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Min</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.sku}</td>
              <td>{r.name}</td>
              <td>{r.price}</td>
              <td>{r.stock}</td>
              <td>{r.minStock}</td>
              <td>
                <button onClick={() => edit(r)}>Editar</button>
                <button onClick={() => del(r?.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
