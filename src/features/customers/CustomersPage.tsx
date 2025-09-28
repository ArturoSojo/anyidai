"use client"
import React, { useEffect, useMemo, useState } from "react"
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, updateDoc
} from "firebase/firestore"
import { db } from "../../lib/firebase"

import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Badge } from "../../components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
import { Textarea } from "../../components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import {
  Plus, Search, Edit, Trash2, Users, Star, Heart, Phone, Mail, Calendar, Crown, TrendingUp, UserPlus
} from "lucide-react"

type Nivel = "Nuevo" | "Regular" | "VIP" | "Platino"

export interface Cliente {
  id?: string
  nombre: string
  telefono: string
  email?: string
  cumpleanos?: string // YYYY-MM-DD
  direccion?: string
  notas?: string
  fechaRegistro?: string // YYYY-MM-DD
  ultimaVisita?: string // YYYY-MM-DD
  totalGastado: number
  visitas: number
  puntos: number
  nivel: Nivel
  serviciosFavoritos: string[]
  barberoPreferido?: string
  noShow: number
  activo: boolean
  consentimientos?: {
    marketing?: boolean
    whatsapp?: boolean
    sms?: boolean
  }
  createdAt?: any
  updatedAt?: any
}

const NIVEL_OPCIONES: Nivel[] = ["Nuevo", "Regular", "VIP", "Platino"]

export default function CustomersPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterLevel, setFilterLevel] = useState<string>("todos")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Cliente | null>(null)
  const [formData, setFormData] = useState<Partial<Cliente>>({})

  // ======= Firestore: live subscribe =======
  useEffect(() => {
    const q = query(collection(db, "customers"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Cliente) }))
      setClientes(rows)
    })
    return () => unsub()
  }, [])

  // ======= Helpers UI =======
  const filteredClientes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return clientes.filter((c) => {
      const matchesSearch =
        !term ||
        c.nombre?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.telefono?.includes(searchTerm)

      const matchesLevel = filterLevel === "todos" || c.nivel === (filterLevel as Nivel)
      return matchesSearch && matchesLevel && c.activo !== false
    })
  }, [clientes, searchTerm, filterLevel])

  const getNivelColor = (nivel: Nivel) => {
    switch (nivel) {
      case "Platino": return "bg-gradient-to-r from-purple-500 to-purple-600 text-white"
      case "VIP": return "bg-gradient-to-r from-yellow-400 to-yellow-500 text-black"
      case "Regular": return "bg-gradient-to-r from-blue-400 to-blue-500 text-white"
      case "Nuevo": return "bg-gradient-to-r from-green-400 to-green-500 text-white"
      default: return "bg-gray-100 text-gray-800"
    }
  }
  const getNivelIcon = (nivel: Nivel) => {
    switch (nivel) {
      case "Platino": return <Crown className="h-3 w-3" />
      case "VIP": return <Star className="h-3 w-3" />
      case "Regular": return <Heart className="h-3 w-3" />
      case "Nuevo": return <UserPlus className="h-3 w-3" />
      default: return null
    }
  }
  const calcularCambio = (actual: number, anterior: number) =>
    anterior ? (((actual - anterior) / anterior) * 100).toFixed(1) : "0.0"

  // ======= CRUD =======
  const resetForm = () => {
    setFormData({})
    setEditingClient(null)
  }

  const openEditModal = (cliente: Cliente) => {
    setEditingClient(cliente)
    setFormData(cliente)
    setIsModalOpen(true)
  }

  function sanitize<T extends Record<string, any>>(obj: T): T {
    const out: any = Array.isArray(obj) ? [] : {}
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue                         // omitir undefined
      if (v && typeof v === "object" && !(v instanceof Date)) {
        out[k] = sanitize(v as any)                         // limpiar anidados (p.ej. consentimientos)
      } else {
        out[k] = v
      }
    }
    return out
  }

  const handleSave = async () => {
    const base: Cliente = {
      nombre: formData.nombre?.trim() || "",
      telefono: formData.telefono?.trim() || "",
      email: formData.email?.trim() || undefined,
      cumpleanos: formData.cumpleanos || undefined,
      direccion: formData.direccion || undefined,
      notas: formData.notas || undefined,
      fechaRegistro: formData.fechaRegistro || new Date().toISOString().split("T")[0],
      ultimaVisita: formData.ultimaVisita || new Date().toISOString().split("T")[0],
      totalGastado: formData.totalGastado ?? 0,
      visitas: formData.visitas ?? 0,
      puntos: formData.puntos ?? 0,
      nivel: (formData.nivel as any) || "Nuevo",
      serviciosFavoritos: formData.serviciosFavoritos ?? [],
      barberoPreferido: formData.barberoPreferido || undefined,
      noShow: formData.noShow ?? 0,
      activo: formData.activo ?? true,
      consentimientos: {
        marketing: formData.consentimientos?.marketing ?? false,
        whatsapp: formData.consentimientos?.whatsapp ?? false,
        sms: formData.consentimientos?.sms ?? false,
      },
      updatedAt: serverTimestamp(),
    }

    const payload = sanitize(base)

    if (editingClient?.id) {
      await updateDoc(doc(db, "customers", editingClient.id), payload as Record<string, any>)
    } else {
      await addDoc(collection(db, "customers"), {
        ...payload,
        createdAt: serverTimestamp(),
      })
    }

    setIsModalOpen(false)
    resetForm()
  }

  const toggleClientStatus = async (id?: string, currentActive?: boolean) => {
    if (!id) return
    await updateDoc(doc(db, "customers", id), { activo: !currentActive, updatedAt: serverTimestamp() })
  }

  const hardDelete = async (id?: string) => {
    if (!id) return
    if (!confirm("¿Eliminar cliente definitivamente? Esta acción no se puede deshacer.")) return
    await deleteDoc(doc(db, "customers", id))
  }

  // ======= Stats simples =======
  const activos = clientes.filter((c) => c.activo !== false)
  const statsData = {
    total: activos.length,
    nuevos: activos.filter((c) => c.nivel === "Nuevo").length,
    regulares: activos.filter((c) => c.nivel === "Regular").length,
    vip: activos.filter((c) => c.nivel === "VIP" || c.nivel === "Platino").length,
    promedioPuntos: activos.length ? Math.round(activos.reduce((s, c) => s + (c.puntos || 0), 0) / activos.length) : 0,
    promedioGasto: activos.length ? Math.round(activos.reduce((s, c) => s + (c.totalGastado || 0), 0) / activos.length) : 0,
  }

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header de acciones */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            className="px-3 py-2 border rounded-md bg-white"
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
          >
            <option value="todos">Todos los niveles</option>
            {NIVEL_OPCIONES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              onClick={() => { resetForm(); setIsModalOpen(true) }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingClient ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="basico" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basico">Información Básica</TabsTrigger>
                <TabsTrigger value="preferencias">Preferencias</TabsTrigger>
                <TabsTrigger value="consentimientos">Consentimientos</TabsTrigger>
              </TabsList>

              <TabsContent value="basico" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nombre">Nombre Completo *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre || ""}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefono">Teléfono *</Label>
                    <Input
                      id="telefono"
                      value={formData.telefono || ""}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      placeholder="+52 555 000 0000"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cumpleanos">Fecha de Nacimiento</Label>
                    <Input
                      id="cumpleanos"
                      type="date"
                      value={formData.cumpleanos || ""}
                      onChange={(e) => setFormData({ ...formData, cumpleanos: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    value={formData.direccion || ""}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="preferencias" className="space-y-4">
                <div>
                  <Label htmlFor="barberoPreferido">Barbero/Estilista Preferido</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={formData.barberoPreferido || ""}
                    onChange={(e) => setFormData({ ...formData, barberoPreferido: e.target.value })}
                  >
                    <option value="">Sin preferencia</option>
                    <option value="Carlos Méndez">Carlos Méndez</option>
                    <option value="Ana Rivera">Ana Rivera</option>
                    <option value="Luis Torres">Luis Torres</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="notas">Notas y Preferencias</Label>
                  <Textarea
                    id="notas"
                    value={formData.notas || ""}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    placeholder="Alergias, preferencias de estilo, observaciones especiales..."
                    rows={4}
                  />
                </div>
              </TabsContent>

              <TabsContent value="consentimientos" className="space-y-4">
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.consentimientos?.marketing || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          consentimientos: { ...formData.consentimientos, marketing: e.target.checked },
                        })
                      }
                    />
                    <span className="text-sm">Acepto recibir promociones y ofertas por email</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.consentimientos?.whatsapp || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          consentimientos: { ...formData.consentimientos, whatsapp: e.target.checked },
                        })
                      }
                    />
                    <span className="text-sm">Acepto recibir recordatorios por WhatsApp</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.consentimientos?.sms || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          consentimientos: { ...formData.consentimientos, sms: e.target.checked },
                        })
                      }
                    />
                    <span className="text-sm">Acepto recibir notificaciones por SMS</span>
                  </label>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Política de Privacidad:</strong> Tus datos están protegidos. Puedes modificar estos
                    consentimientos en cualquier momento.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 justify-end mt-6">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {editingClient ? "Actualizar" : "Crear Cliente"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-800">{statsData.total}</p>
            <p className="text-sm text-blue-600">Total Clientes</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4 text-center">
            <UserPlus className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-800">{statsData.nuevos}</p>
            <p className="text-sm text-green-600">Nuevos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4 text-center">
            <Heart className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-800">{statsData.regulares}</p>
            <p className="text-sm text-blue-600">Regulares</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4 text-center">
            <Crown className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-800">{statsData.vip}</p>
            <p className="text-sm text-purple-600">VIP/Platino</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardContent className="p-4 text-center">
            <Star className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-800">{statsData.promedioPuntos}</p>
            <p className="text-sm text-yellow-600">Puntos Promedio</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-50 to-pink-100">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-pink-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-pink-800">${statsData.promedioGasto}</p>
            <p className="text-sm text-pink-600">Gasto Promedio</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes ({filteredClientes.length})</CardTitle>
        </CardHeader>
        <CardContent className="w-full max-w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Estadísticas</TableHead>
                <TableHead>Última Visita</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClientes.map((c) => (
                <TableRow key={c.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div>
                      <p className="font-medium">{c.nombre}</p>
                      {c.barberoPreferido && (
                        <p className="text-sm text-gray-500">Pref: {c.barberoPreferido}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3" />
                        {c.telefono}
                      </div>
                      {c.email && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Mail className="h-3 w-3" />
                          {c.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getNivelColor(c.nivel)}>
                      <div className="flex items-center gap-1">
                        {getNivelIcon(c.nivel)}
                        {c.nivel}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">{(c.visitas ?? 0)} visitas</p>
                      <p className="text-sm text-gray-500">{(c.puntos ?? 0)} pts</p>
                      <p className="text-sm text-gray-500">${(c.totalGastado ?? 0).toLocaleString()} gastado</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3" />
                      {c.ultimaVisita ? new Date(c.ultimaVisita).toLocaleDateString() : "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(c)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleClientStatus(c.id, c.activo)}
                        className={c.activo ? "text-red-600" : "text-green-600"}
                        title={c.activo ? "Desactivar" : "Activar"}
                      >
                        {c.activo ? <Trash2 className="h-4 w-4" /> : "🔄"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => hardDelete(c.id)}
                        className="text-red-700"
                        title="Eliminar definitivamente"
                      >
                        🗑️
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredClientes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    No hay clientes para mostrar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
