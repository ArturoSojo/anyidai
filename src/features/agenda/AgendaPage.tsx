"use client"
import { useEffect, useMemo, useState } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, where, serverTimestamp, getDocs
} from 'firebase/firestore'
import { db } from '../../lib/firebase'

// Picker de clientes
import { CustomerPicker } from "../../components/CustomerPicker"
import type { CustomerLite } from "../../components/CustomerPicker"

import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Badge } from "../../components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Textarea } from "../../components/ui/textarea"
import { Calendar as CalendarIcon, Clock, Plus, Search, Edit, Trash2, User, Phone } from 'lucide-react'

type Estado = 'Programada' | 'Confirmada' | 'En Proceso' | 'Completada' | 'Cancelada'

export interface CitaDoc {
  id?: string
  cliente: string
  telefono: string
  servicio: string        // etiqueta visible (nombre servicio/combo)
  fecha: string           // YYYY-MM-DD
  hora: string            // HH:mm
  estado: Estado
  notas?: string | null
  precio?: number | null
  start?: string | null
  end?: string | null
  createdAt?: any
  updatedAt?: any
}

// Tipos mínimos para poblar el selector
type ServiceDoc = {
  id: string
  name: string
  price: number
  active?: boolean
}
type ComboDoc = {
  id: string
  name: string
  priceFinal: number
  active?: boolean
}

/** Elimina propiedades undefined (Firestore no las acepta) */
function sanitize<T extends Record<string, any>>(obj: T): T {
  const out: any = Array.isArray(obj) ? [] : {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    if (v && typeof v === 'object' && !(v instanceof Date)) out[k] = sanitize(v as any)
    else out[k] = v
  }
  return out
}

/** Construye ISO a partir de fecha (YYYY-MM-DD) y hora (HH:mm) */
function toISO(fecha?: string, hora?: string) {
  if (!fecha || !hora) return null
  const iso = new Date(`${fecha}T${hora}:00`)
  return isNaN(iso.getTime()) ? null : iso.toISOString()
}

export default function AgendaPage() {
  const [citas, setCitas] = useState<CitaDoc[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editing, setEditing] = useState<CitaDoc | null>(null)
  const [formData, setFormData] = useState<Partial<CitaDoc>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  // Cliente seleccionado (select2)
  const [clienteSel, setClienteSel] = useState<CustomerLite | null>(null)

  // ====== Servicios y Combos (para el selector) ======
  const [services, setServices] = useState<ServiceDoc[]>([])
  const [combos, setCombos] = useState<ComboDoc[]>([])

  useEffect(() => {
    const loadCatalogs = async () => {
      // services
      const sSnap = await getDocs(collection(db, 'services'))
      const sRows = sSnap.docs.map(d => {
        const data = d.data() as any
        return {
          id: d.id,
          name: data.name || '',
          price: Number(data.price || 0),
          active: data.active !== false,
        } as ServiceDoc
      })
      setServices(sRows)

      // combos
      const cSnap = await getDocs(collection(db, 'combos'))
      const cRows = cSnap.docs.map(d => {
        const data = d.data() as any
        return {
          id: d.id,
          name: data.name || '',
          priceFinal: Number(data.priceFinal || 0),
          active: data.active !== false,
        } as ComboDoc
      })
      setCombos(cRows)
    }
    loadCatalogs()
  }, [])

  // Suscripción en vivo a las citas del día
  useEffect(() => {
    const q = query(collection(db, 'appointments'), where('fecha', '==', selectedDate))
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as CitaDoc) }))
      rows.sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
      setCitas(rows)
    })
    return () => unsub()
  }, [selectedDate])

  // Al abrir modal, setear defaults y preseleccionar cliente si edita
  useEffect(() => {
    if (!isAddModalOpen) return
    if (editing) {
      setClienteSel(
        editing.cliente
          ? { id: editing.id || 'editing', nombre: editing.cliente, telefono: editing.telefono }
          : null
      )
    } else {
      setClienteSel(null)
      setFormData((prev) => ({
        ...prev,
        fecha: prev.fecha || selectedDate,
        estado: prev.estado || 'Programada',
        precio: prev.precio ?? 0,
      }))
    }
  }, [isAddModalOpen, editing, selectedDate])

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return citas.filter(c =>
      (!term ||
        c.cliente?.toLowerCase().includes(term) ||
        c.servicio?.toLowerCase().includes(term)) &&
      c.fecha === selectedDate
    )
  }, [citas, searchTerm, selectedDate])

  const getEstadoColor = (estado: Estado) => {
    switch (estado) {
      case 'Confirmada': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'Programada': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'En Proceso': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'Completada': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case 'Cancelada': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const openNewModal = () => {
    setEditing(null)
    setFormData({ fecha: selectedDate, estado: 'Programada', precio: 0 })
    setIsAddModalOpen(true)
  }

  const openEditModal = (c: CitaDoc) => {
    setEditing(c)
    setFormData(c)
    setIsAddModalOpen(true)
  }

  // Valor seleccionado del Select a partir del nombre guardado
const selectedServiceOption = useMemo(() => {
  const name = (formData.servicio || '').toString().trim()
  if (!name) return ''
  const svc = services.find(s => s.name === name && s.active !== false)
  if (svc) return `S|${svc.id}`
  const cmb = combos.find(c =>
    (name === c.name || name === `${c.name} (Combo)`) && c.active !== false
  )
  if (cmb) return `C|${cmb.id}`
  return ''
}, [formData.servicio, services, combos])


  const handleSelectServicio = (value: string) => {
    // value viene como "S|<id>" o "C|<id>"
    if (!value) return
    const kind = value.slice(0, 1)
    const id = value.slice(2)

    if (kind === 'S') {
      const s = services.find(x => x.id === id)
      if (s) {
        setFormData(f => ({
          ...f,
          servicio: s.name,
          precio: s.price,
        }))
      }
    } else if (kind === 'C') {
      const c = combos.find(x => x.id === id)
      if (c) {
        setFormData(f => ({
          ...f,
          servicio: `${c.name} (Combo)`,
          precio: c.priceFinal,
        }))
      }
    }
  }

  const handleSave = async () => {
    const base: CitaDoc = {
      cliente: formData.cliente?.trim() || '',
      telefono: formData.telefono?.trim() || '',
      servicio: formData.servicio || '',
      fecha: formData.fecha || selectedDate,
      hora: formData.hora || '',
      estado: (formData.estado as Estado) || 'Programada',
      notas: formData.notas ?? null,
      precio: typeof formData.precio === 'number'
        ? formData.precio
        : formData.precio ? Number(formData.precio) : 0,
      start: toISO(formData.fecha || selectedDate, formData.hora || ''),
      end: formData.end ?? null,
      updatedAt: serverTimestamp(),
    }

    if (!base.cliente || !base.servicio || !base.hora) {
      alert('Cliente, servicio y hora son obligatorios.')
      return
    }

    const payload = sanitize(base)
    const savedDate = base.fecha

    if (editing?.id) {
      await updateDoc(doc(db, 'appointments', editing.id), payload as Record<string, any>)
    } else {
      await addDoc(collection(db, 'appointments'), {
        ...payload,
        createdAt: serverTimestamp(),
      })
    }
    setSelectedDate(savedDate)
    setIsAddModalOpen(false)
    setEditing(null)
    setFormData({})
    setClienteSel(null)
  }

  const updateEstado = async (id: string | undefined, nuevo: Estado) => {
    if (!id) return
    await updateDoc(doc(db, 'appointments', id), sanitize({
      estado: nuevo,
      updatedAt: serverTimestamp(),
    }))
  }

  const handleDelete = async (id: string | undefined) => {
    if (!id) return
    if (!confirm('¿Eliminar esta cita definitivamente?')) return
    await deleteDoc(doc(db, 'appointments', id))
  }

  // métricas simples del día
  const stats = {
    total: filtered.length,
    confirmadas: filtered.filter(c => c.estado === 'Confirmada').length,
    enProceso: filtered.filter(c => c.estado === 'En Proceso').length,
    ingresos: filtered.reduce((s, c) => s + (c.precio || 0), 0),
  }

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex gap-4 items-center">
          <div>
            <Label htmlFor="fecha">Fecha</Label>
            <Input
              id="fecha"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar citas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>

        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewModal}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cita
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Cita' : 'Nueva Cita'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Picker de clientes */}
              <div>
                <Label>Cliente</Label>
                <CustomerPicker
                  value={clienteSel}
                  onSelect={(c) => {
                    setClienteSel(c)
                    setFormData({
                      ...formData,
                      cliente: c.nombre,
                      telefono: c.telefono || formData.telefono || '',
                    })
                  }}
                  placeholder="Buscar por nombre, teléfono o email"
                />
              </div>

              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono || ''}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>

              {/* Servicios + Combos desde Firestore */}
              <div>
                <Label htmlFor="servicio">Servicio / Combo</Label>
                <Select
                  value={selectedServiceOption}
                  onValueChange={handleSelectServicio}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar servicio o combo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem disabled value="separator-1">— Servicios —</SelectItem>
                    {services
                      .filter(s => s.active !== false)
                      .map(s => (
                        <SelectItem key={s.id} value={`S|${s.id}`}>
                          {s.name} — ${s.price}
                        </SelectItem>
                      ))}
                    <SelectItem disabled value="separator-2">— Combos —</SelectItem>
                    {combos
                      .filter(c => c.active !== false)
                      .map(c => (
                        <SelectItem key={c.id} value={`C|${c.id}`}>
                          {c.name} (Combo) — ${c.priceFinal}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {/* Si por alguna razón quieres permitir escribir un nombre libre: */}
                {/* <Input className="mt-2" placeholder="o escribe un concepto" value={formData.servicio || ''} onChange={(e)=>setFormData({...formData, servicio:e.target.value})}/> */}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fecha2">Fecha</Label>
                  <Input
                    id="fecha2"
                    type="date"
                    value={formData.fecha || selectedDate}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="hora">Hora</Label>
                  <Input
                    id="hora"
                    type="time"
                    value={formData.hora || ''}
                    onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="precio">Precio</Label>
                <Input
                  id="precio"
                  type="number"
                  value={formData.precio ?? ''}
                  onChange={(e) => setFormData({ ...formData, precio: Number(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  value={formData.notas || ''}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  {editing ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <CalendarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Citas Hoy</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confirmadas</p>
                <p className="text-2xl font-bold">{stats.confirmadas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En Proceso</p>
                <p className="text-2xl font-bold">{stats.enProceso}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ingresos Hoy</p>
                <p className="text-2xl font-bold">
                  ${stats.ingresos.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de citas */}
      <Card>
        <CardHeader>
          <CardTitle>Citas del día - {new Date(selectedDate).toLocaleDateString()}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay citas programadas para esta fecha
              </p>
            ) : (
              filtered
                .sort((a, b) => a.hora.localeCompare(b.hora))
                .map((cita) => (
                  <div key={cita.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold">{cita.hora}</div>
                        <Badge className={getEstadoColor(cita.estado)}>
                          {cita.estado}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{cita.cliente}</span>
                        </div>
                        {cita.telefono && (
                          <div className="flex items-center gap-2 mb-1">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{cita.telefono}</span>
                          </div>
                        )}
                        <div className="text-sm">
                          <span className="font-medium">{cita.servicio}</span>
                          {typeof cita.precio === 'number' && (
                            <>
                              <span className="mx-2">•</span>
                              <span className="text-green-600 font-semibold">
                                ${cita.precio.toLocaleString()}
                              </span>
                            </>
                          )}
                        </div>
                        {cita.notas && (
                          <p className="text-sm text-muted-foreground mt-1">{cita.notas}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={cita.estado}
                        onValueChange={(value) => updateEstado(cita.id, value as Estado)}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Programada">Programada</SelectItem>
                          <SelectItem value="Confirmada">Confirmada</SelectItem>
                          <SelectItem value="En Proceso">En Proceso</SelectItem>
                          <SelectItem value="Completada">Completada</SelectItem>
                          <SelectItem value="Cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button variant="ghost" size="sm" onClick={() => openEditModal(cita)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(cita.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
