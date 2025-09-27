import { useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore'
import { useForm } from 'react-hook-form'
import { db } from '../../lib/firebase'

type Service = {
  id?: string
  name: string
  durationMin: number
  price: number
}

export default function ServicesPage() {
  const [rows, setRows] = useState<Service[]>([])
  const { register, handleSubmit, reset } = useForm<Service>()

  const load = async () => {
    const snap = await getDocs(collection(db, 'services'))
    setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Service) })))
  }

  useEffect(() => {
    load()
  }, [])

  const onSubmit = async (data: Service) => {
    const payload = {
      ...data,
      durationMin: Number(data.durationMin),
      price: Number(data.price),
    }

    if (data.id) {
      const { id: _id, ...rest } = payload
      await updateDoc(doc(db, 'services', data.id), rest)
    } else {
      await addDoc(collection(db, 'services'), payload)
    }

    reset({ name: '', durationMin: 30, price: 0 })
    load()
  }

  const edit = (s: Service) => reset(s)
  const del = async (id?: string) => {
    if (!id) return
    await deleteDoc(doc(db, 'services', id))
    load()
  }

  return (
    <div>
      <h2>Servicios</h2>
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, alignItems: 'end' }}
      >
        <input type="hidden" {...register('id')} />
        <input placeholder="Nombre" {...register('name', { required: true })} />
        <input type="number" placeholder="Minutos" {...register('durationMin', { valueAsNumber: true })} />
        <input type="number" step="0.01" placeholder="Precio" {...register('price', { valueAsNumber: true })} />
        <button type="submit">Guardar</button>
      </form>

      <table style={{ width: '100%', marginTop: 12 }}>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Min</th>
            <th>Precio</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{r.durationMin}</td>
              <td>{r.price}</td>
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
