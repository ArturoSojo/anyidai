import { useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore'
import { useForm } from 'react-hook-form'
import { db } from '../../lib/firebase'

type Customer = {
  id?: string
  name: string
  phone?: string
  email?: string
  birthday?: string
}

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([])
  const { register, handleSubmit, reset } = useForm<Customer>()

  const load = async () => {
    const snap = await getDocs(collection(db, 'customers'))
    setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Customer) })))
  }

  useEffect(() => {
    load()
  }, [])

  const onSubmit = async (data: Customer) => {
    if (data.id) {
      const { id: _id, ...rest } = data
      await updateDoc(doc(db, 'customers', data.id), rest)
    } else {
      await addDoc(collection(db, 'customers'), data)
    }
    reset({ name: '', phone: '', email: '', birthday: '' })
    load()
  }

  const edit = (c: Customer) => reset(c)
  const del = async (id?: string) => {
    if (!id) return
    await deleteDoc(doc(db, 'customers', id))
    load()
  }

  return (
    <div>
      <h2>Clientes</h2>
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, alignItems: 'end' }}
      >
        <input type="hidden" {...register('id')} />
        <input placeholder="Nombre" {...register('name', { required: true })} />
        <input placeholder="Teléfono" {...register('phone')} />
        <input placeholder="Email" {...register('email')} />
        <input type="date" placeholder="Cumpleaños" {...register('birthday')} />
        <button type="submit">Guardar</button>
      </form>

      <table style={{ width: '100%', marginTop: 12 }}>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Teléfono</th>
            <th>Email</th>
            <th>Cumpleaños</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{r.phone}</td>
              <td>{r.email}</td>
              <td>{r.birthday}</td>
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
