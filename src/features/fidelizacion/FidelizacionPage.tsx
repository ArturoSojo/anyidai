// src/features/fidelizacion/FidelizacionPage.tsx
"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "../../lib/firebase"

import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Badge } from "../../components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog"
import { Textarea } from "../../components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Progress } from "../../components/ui/progress"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Heart,
  Gift,
  Crown,
  Star,
  Award,
  Target
} from "lucide-react"

/* ===================== Tipos ===================== */

type Nivel = "Bronce" | "Plata" | "Oro" | "Platino"

type ClienteDoc = {
  id?: string
  nombre?: string
  email?: string
  telefono?: string
  puntos?: number
  nivel?: Nivel
  totalGastado?: number
  visitas?: number
  fechaRegistro?: string // YYYY-MM-DD
}

type Cliente = {
  id: string
  nombre: string
  email: string
  telefono: string
  puntos: number
  nivel: Nivel
  totalGastado: number
  visitas: number
  fechaRegistro: string
}

type CampanaEstado = "Activa" | "Programada" | "Finalizada" | "Borrador"
type CampanaTipo = "Email" | "SMS" | "Push"

type Campana = {
  id?: string
  nombre: string
  descripcion: string
  tipo: CampanaTipo
  estado: CampanaEstado
  fechaInicio: string
  fechaFin: string
  clientesObjetivo: number
  clientesAlcanzados: number
  tasa_apertura?: number | null
  tasa_conversion?: number | null
  createdAt?: any
  updatedAt?: any
}

type RecompensaTipo = "Descuento" | "Producto Gratis" | "Servicio Gratis" | "Regalo"

type Recompensa = {
  id?: string
  nombre: string
  descripcion: string
  puntosRequeridos: number
  tipo: RecompensaTipo
  valor: number
  activa: boolean
  canjeados: number
  createdAt?: any
  updatedAt?: any
}

/* ===================== Utils ===================== */

// Quita undefined (Firestore no lo acepta)
function sanitize<T extends Record<string, any>>(obj: T): T {
  const out: any = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    if (v && typeof v === "object" && !(v instanceof Date)) out[k] = sanitize(v as any)
    else out[k] = v
  }
  return out
}

function nivelColor(nivel: Nivel) {
  switch (nivel) {
    case "Platino": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
    case "Oro":     return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    case "Plata":   return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    case "Bronce":  return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
    default:        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
  }
}
function estadoColor(estado: CampanaEstado) {
  switch (estado) {
    case "Activa":     return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    case "Programada": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
    case "Finalizada": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    case "Borrador":   return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    default:           return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
  }
}

/* ===================== Page ===================== */

export default function FidelizacionPage() {
  // Clientes (solo lectura en vivo)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [search, setSearch] = useState("")

  // Campañas
  const [campanas, setCampanas] = useState<Campana[]>([])
  const [isCampanaModalOpen, setIsCampanaModalOpen] = useState(false)
  const [campanaEdit, setCampanaEdit] = useState<Campana | null>(null)
  const [campanaForm, setCampanaForm] = useState<Partial<Campana>>({})

  // Recompensas
  const [recompensas, setRecompensas] = useState<Recompensa[]>([])
  const [isRecompensaModalOpen, setIsRecompensaModalOpen] = useState(false)
  const [recompensaEdit, setRecompensaEdit] = useState<Recompensa | null>(null)
  const [recompensaForm, setRecompensaForm] = useState<Partial<Recompensa>>({})

  /* ---------- Suscripciones ---------- */

  useEffect(() => {
    // customers -> clientes
    const unsub1 = onSnapshot(collection(db, "customers"), (snap) => {
      const rows = snap.docs.map((d) => {
        const c = d.data() as ClienteDoc
        const mapped: Cliente = {
          id: d.id,
          nombre: c.nombre ?? "Sin nombre",
          email: c.email ?? "",
          telefono: c.telefono ?? "",
          puntos: typeof c.puntos === "number" ? c.puntos : 0,
          nivel: (c.nivel as Nivel) ?? "Bronce",
          totalGastado: typeof c.totalGastado === "number" ? c.totalGastado : 0,
          visitas: typeof c.visitas === "number" ? c.visitas : 0,
          fechaRegistro: c.fechaRegistro ?? (new Date().toISOString().slice(0,10)),
        }
        return mapped
      })
      setClientes(rows)
    })

    // campaigns
    const unsub2 = onSnapshot(collection(db, "campaigns"), (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Campana) }))
      setCampanas(rows)
    })

    // rewards
    const unsub3 = onSnapshot(collection(db, "rewards"), (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Recompensa) }))
      setRecompensas(rows)
    })

    return () => { unsub1(); unsub2(); unsub3() }
  }, [])

  /* ---------- Derivados ---------- */

  const filteredClientes = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return clientes
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term)
    )
  }, [clientes, search])

  const totalPuntosOtorgados = clientes.reduce((sum, c) => sum + c.puntos, 0)
  const promedioVisitas = clientes.length
    ? clientes.reduce((sum, c) => sum + c.visitas, 0) / clientes.length
    : 0

  /* ---------- Campañas: CRUD ---------- */

  const openCampanaModal = (c?: Campana) => {
    if (c?.id) {
      setCampanaEdit(c)
      setCampanaForm(c)
    } else {
      setCampanaEdit(null)
      setCampanaForm({
        tipo: "Email",
        estado: "Borrador",
        clientesObjetivo: 0,
        clientesAlcanzados: 0,
      })
    }
    setIsCampanaModalOpen(true)
  }

  const saveCampana = async () => {
    const payload: Campana = {
      nombre: campanaForm.nombre?.trim() || "",
      descripcion: campanaForm.descripcion?.trim() || "",
      tipo: (campanaForm.tipo as CampanaTipo) || "Email",
      estado: (campanaForm.estado as CampanaEstado) || "Borrador",
      fechaInicio: campanaForm.fechaInicio || "",
      fechaFin: campanaForm.fechaFin || "",
      clientesObjetivo: Number(campanaForm.clientesObjetivo || 0),
      clientesAlcanzados: Number(campanaForm.clientesAlcanzados || 0),
      tasa_apertura: campanaForm.tasa_apertura ?? null,
      tasa_conversion: campanaForm.tasa_conversion ?? null,
      updatedAt: serverTimestamp(),
    }

    const data = sanitize(payload)

    if (campanaEdit?.id) {
      await updateDoc(doc(db, "campaigns", campanaEdit.id), data as any)
    } else {
      await addDoc(collection(db, "campaigns"), {
        ...data,
        createdAt: serverTimestamp(),
      })
    }

    setIsCampanaModalOpen(false)
    setCampanaEdit(null)
    setCampanaForm({})
  }

  const deleteCampana = async (id?: string) => {
    if (!id) return
    if (!confirm("¿Eliminar la campaña definitivamente?")) return
    await deleteDoc(doc(db, "campaigns", id))
  }

  /* ---------- Recompensas: CRUD ---------- */

  const openRecompensaModal = (r?: Recompensa) => {
    if (r?.id) {
      setRecompensaEdit(r)
      setRecompensaForm(r)
    } else {
      setRecompensaEdit(null)
      setRecompensaForm({
        tipo: "Descuento",
        puntosRequeridos: 0,
        valor: 0,
        activa: true,
        canjeados: 0,
      })
    }
    setIsRecompensaModalOpen(true)
  }

  const saveRecompensa = async () => {
    const payload: Recompensa = {
      nombre: recompensaForm.nombre?.trim() || "",
      descripcion: recompensaForm.descripcion?.trim() || "",
      tipo: (recompensaForm.tipo as RecompensaTipo) || "Descuento",
      puntosRequeridos: Number(recompensaForm.puntosRequeridos || 0),
      valor: Number(recompensaForm.valor || 0),
      activa: recompensaForm.activa ?? true,
      canjeados: Number(recompensaForm.canjeados || 0),
      updatedAt: serverTimestamp(),
    }

    const data = sanitize(payload)

    if (recompensaEdit?.id) {
      await updateDoc(doc(db, "rewards", recompensaEdit.id), data as any)
    } else {
      await addDoc(collection(db, "rewards"), {
        ...data,
        createdAt: serverTimestamp(),
      })
    }

    setIsRecompensaModalOpen(false)
    setRecompensaEdit(null)
    setRecompensaForm({})
  }

  const deleteRecompensa = async (id?: string) => {
    if (!id) return
    if (!confirm("¿Eliminar la recompensa definitivamente?")) return
    await deleteDoc(doc(db, "rewards", id))
  }

  const toggleActivaRecompensa = async (r: Recompensa) => {
    if (!r.id) return
    await updateDoc(doc(db, "rewards", r.id), sanitize({
      activa: !r.activa,
      updatedAt: serverTimestamp(),
    }) as any)
  }

  /* ===================== UI ===================== */

  return (
    <div className="space-y-6">
      <Tabs defaultValue="clientes" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="clientes">Clientes Leales</TabsTrigger>
          <TabsTrigger value="recompensas">Recompensas</TabsTrigger>
          <TabsTrigger value="campanas">Campañas</TabsTrigger>
        </TabsList>

        {/* ===================== CLIENTES ===================== */}
        <TabsContent value="clientes" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar clientes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Crown className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clientes Leales</p>
                    <p className="text-2xl font-bold">{clientes.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Puntos Totales</p>
                    <p className="text-2xl font-bold">{totalPuntosOtorgados.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Heart className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Promedio Visitas</p>
                    <p className="text-2xl font-bold">{promedioVisitas.toFixed(1)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Award className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clientes VIP</p>
                    <p className="text-2xl font-bold">
                      {clientes.filter((c) => c.nivel === "Platino" || c.nivel === "Oro").length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Grid de clientes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClientes.map((cliente) => (
              <Card key={cliente.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{cliente.nombre}</CardTitle>
                      <Badge className={nivelColor(cliente.nivel)}>{cliente.nivel}</Badge>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-bold">{cliente.puntos}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <p className="text-muted-foreground">Email: {cliente.email || "—"}</p>
                      <p className="text-muted-foreground">Teléfono: {cliente.telefono || "—"}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Gastado</p>
                        <p className="font-semibold">${cliente.totalGastado.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Visitas</p>
                        <p className="font-semibold">{cliente.visitas}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Progreso al siguiente nivel</p>
                      <Progress value={65} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">Proyección simulada</p>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Cliente desde: {new Date(cliente.fechaRegistro).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ===================== RECOMPENSAS ===================== */}
        <TabsContent value="recompensas" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isRecompensaModalOpen} onOpenChange={setIsRecompensaModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openRecompensaModal()}>
                  <Plus className="h-4 w-4 mr-2" />
                  {recompensaEdit ? "Editar Recompensa" : "Nueva Recompensa"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{recompensaEdit ? "Editar Recompensa" : "Nueva Recompensa"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="r-nombre">Nombre</Label>
                    <Input
                      id="r-nombre"
                      value={recompensaForm.nombre || ""}
                      onChange={(e) => setRecompensaForm({ ...recompensaForm, nombre: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="r-desc">Descripción</Label>
                    <Textarea
                      id="r-desc"
                      value={recompensaForm.descripcion || ""}
                      onChange={(e) => setRecompensaForm({ ...recompensaForm, descripcion: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select
                      value={(recompensaForm.tipo as RecompensaTipo) || "Descuento"}
                      onValueChange={(v) => setRecompensaForm({ ...recompensaForm, tipo: v as RecompensaTipo })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Descuento">Descuento</SelectItem>
                        <SelectItem value="Producto Gratis">Producto Gratis</SelectItem>
                        <SelectItem value="Servicio Gratis">Servicio Gratis</SelectItem>
                        <SelectItem value="Regalo">Regalo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="r-puntos">Puntos Requeridos</Label>
                      <Input
                        id="r-puntos"
                        type="number"
                        value={recompensaForm.puntosRequeridos ?? ""}
                        onChange={(e) =>
                          setRecompensaForm({ ...recompensaForm, puntosRequeridos: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="r-valor">Valor ($)</Label>
                      <Input
                        id="r-valor"
                        type="number"
                        value={recompensaForm.valor ?? ""}
                        onChange={(e) =>
                          setRecompensaForm({ ...recompensaForm, valor: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsRecompensaModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={saveRecompensa}>
                      {recompensaEdit ? "Actualizar" : "Crear"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recompensas.map((r) => (
              <Card key={r.id} className={!r.activa ? "opacity-60" : ""}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{r.nombre}</CardTitle>
                      <Badge variant="outline">{r.tipo}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Gift className="h-4 w-4 text-orange-500" />
                      <span className="font-bold">{r.puntosRequeridos}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">{r.descripcion}</p>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Valor:</span>
                      <span className="font-semibold">${r.valor}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Canjeados:</span>
                      <span className="font-semibold">{r.canjeados}</span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openRecompensaModal(r)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleActivaRecompensa(r)}>
                        {r.activa ? "🔴" : "🟢"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRecompensa(r.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ===================== CAMPAÑAS ===================== */}
        <TabsContent value="campanas" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isCampanaModalOpen} onOpenChange={setIsCampanaModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openCampanaModal()}>
                  <Plus className="h-4 w-4 mr-2" />
                  {campanaEdit ? "Editar Campaña" : "Nueva Campaña"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{campanaEdit ? "Editar Campaña" : "Nueva Campaña"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="c-nombre">Nombre</Label>
                    <Input
                      id="c-nombre"
                      value={campanaForm.nombre || ""}
                      onChange={(e) => setCampanaForm({ ...campanaForm, nombre: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="c-desc">Descripción</Label>
                    <Textarea
                      id="c-desc"
                      value={campanaForm.descripcion || ""}
                      onChange={(e) => setCampanaForm({ ...campanaForm, descripcion: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select
                      value={(campanaForm.tipo as CampanaTipo) || "Email"}
                      onValueChange={(v) => setCampanaForm({ ...campanaForm, tipo: v as CampanaTipo })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Email">Email</SelectItem>
                        <SelectItem value="SMS">SMS</SelectItem>
                        <SelectItem value="Push">Push</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="c-inicio">Fecha Inicio</Label>
                      <Input
                        id="c-inicio"
                        type="date"
                        value={campanaForm.fechaInicio || ""}
                        onChange={(e) => setCampanaForm({ ...campanaForm, fechaInicio: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="c-fin">Fecha Fin</Label>
                      <Input
                        id="c-fin"
                        type="date"
                        value={campanaForm.fechaFin || ""}
                        onChange={(e) => setCampanaForm({ ...campanaForm, fechaFin: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="c-obj">Clientes Objetivo</Label>
                      <Input
                        id="c-obj"
                        type="number"
                        value={campanaForm.clientesObjetivo ?? ""}
                        onChange={(e) =>
                          setCampanaForm({ ...campanaForm, clientesObjetivo: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="c-alc">Alcanzados</Label>
                      <Input
                        id="c-alc"
                        type="number"
                        value={campanaForm.clientesAlcanzados ?? ""}
                        onChange={(e) =>
                          setCampanaForm({ ...campanaForm, clientesAlcanzados: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsCampanaModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={saveCampana}>
                      {campanaEdit ? "Actualizar" : "Crear"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {campanas.map((c) => {
              const progreso = c.clientesObjetivo > 0
                ? Math.min(100, (c.clientesAlcanzados / c.clientesObjetivo) * 100)
                : 0
              return (
                <Card key={c.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{c.nombre}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">{c.tipo}</Badge>
                          <Badge className={estadoColor(c.estado)}>{c.estado}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">{c.descripcion}</p>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Inicio:</p>
                          <p className="font-medium">{c.fechaInicio || "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Fin:</p>
                          <p className="font-medium">{c.fechaFin || "—"}</p>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-muted-foreground">Progreso</span>
                          <span className="text-sm font-medium">
                            {c.clientesAlcanzados}/{c.clientesObjetivo}
                          </span>
                        </div>
                        <Progress value={progreso} className="h-2" />
                      </div>

                      {(c.tasa_apertura ?? null) !== null || (c.tasa_conversion ?? null) !== null ? (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Tasa Apertura:</p>
                            <p className="font-semibold text-green-600">
                              {c.tasa_apertura ?? 0}%
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Conversión:</p>
                            <p className="font-semibold text-blue-600">
                              {c.tasa_conversion ?? 0}%
                            </p>
                          </div>
                        </div>
                      ) : null}

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => openCampanaModal(c)}>
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => alert("Vista de resultados próximamente 😉")}
                        >
                          <Target className="h-3 w-3 mr-1" />
                          Ver Resultados
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCampana(c.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
