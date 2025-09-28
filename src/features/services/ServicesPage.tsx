"use client"
import { useEffect, useMemo, useState } from "react"
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore"
import { db } from "../../lib/firebase"

import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Badge } from "../../components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog"
import { Textarea } from "../../components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Plus, Search, Edit, Trash2, Scissors, Sparkles, Clock, DollarSign, Package } from "lucide-react"

// ===== Tipos =====
type ServiceDoc = {
  id?: string
  name: string
  category?: string
  description?: string
  durationMin: number
  price: number
  active?: boolean
  products?: string[]
}

type ComboDoc = {
  id?: string
  name: string
  description?: string
  serviceIds: string[]          // IDs de servicios (Firestore)
  serviceNames: string[]        // cache de nombres para mostrar
  discount: number              // %
  priceOriginal: number
  priceFinal: number
  active?: boolean
}

const categorias = ["Cabello", "Facial", "Masajes", "Manos", "Pies", "Depilación"]

// Firestore no acepta undefined
const sanitize = <T extends Record<string, any>>(obj: T): T => {
  const out: any = {}
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined) return
    if (Array.isArray(v)) out[k] = v
    else if (v && typeof v === "object") out[k] = sanitize(v as any)
    else out[k] = v
  })
  return out
}

export default function ServicesPage() {
  // ======= Servicios (Firestore) =======
  const [servicios, setServicios] = useState<ServiceDoc[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<ServiceDoc | null>(null)
  const [serviceFormData, setServiceFormData] = useState<Partial<ServiceDoc>>({})

  const loadServices = async () => {
    const snap = await getDocs(collection(db, "services"))
    const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ServiceDoc) }))
    setServicios(rows)
  }

  useEffect(() => {
    loadServices()
  }, [])

  const handleSaveService = async () => {
    const payload = sanitize({
      name: serviceFormData.name?.trim() || "",
      category: serviceFormData.category || "",
      description: serviceFormData.description || "",
      durationMin:
        typeof serviceFormData.durationMin === "number"
          ? serviceFormData.durationMin
          : Number(serviceFormData.durationMin || 0),
      price:
        typeof serviceFormData.price === "number"
          ? serviceFormData.price
          : Number(serviceFormData.price || 0),
      active: serviceFormData.active ?? true,
      products: serviceFormData.products ?? [],
    })

    if (!payload.name) {
      alert("El nombre del servicio es obligatorio.")
      return
    }

    if (editingService?.id) {
      await updateDoc(doc(db, "services", editingService.id), payload as any)
    } else {
      await addDoc(collection(db, "services"), payload as any)
    }

    setIsServiceModalOpen(false)
    setEditingService(null)
    setServiceFormData({})
    loadServices()
  }

  const openEditServiceModal = (s: ServiceDoc) => {
    setEditingService(s)
    setServiceFormData({
      name: s.name,
      category: s.category,
      description: s.description,
      durationMin: s.durationMin,
      price: s.price,
      active: s.active ?? true,
      products: s.products ?? [],
    })
    setIsServiceModalOpen(true)
  }

  const toggleServiceStatus = async (id?: string, curr?: boolean) => {
    if (!id) return
    await updateDoc(doc(db, "services", id), sanitize({ active: !curr }))
    loadServices()
  }

  const deleteService = async (id?: string) => {
    if (!id) return
    if (!confirm("¿Eliminar este servicio definitivamente?")) return
    await deleteDoc(doc(db, "services", id))
    loadServices()
  }

  const filteredServicios = useMemo(
    () =>
      servicios.filter(
        (s) =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.category || "").toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [servicios, searchTerm]
  )

  // ======= Combos (Firestore) =======
  const [combos, setCombos] = useState<ComboDoc[]>([])
  const [isComboModalOpen, setIsComboModalOpen] = useState(false)
  const [editingCombo, setEditingCombo] = useState<ComboDoc | null>(null)
  const [comboFormData, setComboFormData] = useState<Partial<ComboDoc>>({})

  const loadCombos = async () => {
    const snap = await getDocs(collection(db, "combos"))
    const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ComboDoc) }))
    setCombos(rows)
  }

  useEffect(() => {
    loadCombos()
  }, [])

  const openNewComboModal = () => {
    setEditingCombo(null)
    setComboFormData({ active: true, discount: 0, serviceIds: [], serviceNames: [] })
    setIsComboModalOpen(true)
  }

  const openEditComboModal = (combo: ComboDoc) => {
    setEditingCombo(combo)
    setComboFormData(combo)
    setIsComboModalOpen(true)
  }

  const calcPricesFromSelection = (serviceIds: string[] = []) => {
    const selected = servicios.filter((s) => serviceIds.includes(s.id!))
    const priceOriginal = selected.reduce((sum, s) => sum + (s.price || 0), 0)
    const names = selected.map((s) => s.name)
    return { priceOriginal, names }
  }

  const handleSaveCombo = async () => {
    const ids = comboFormData.serviceIds || []
    const { priceOriginal, names } = calcPricesFromSelection(ids)
    const discount = comboFormData.discount || 0
    const priceFinal = Math.round(priceOriginal * (1 - discount / 100))

    const payload = sanitize({
      name: comboFormData.name?.trim() || "",
      description: comboFormData.description || "",
      serviceIds: ids,
      serviceNames: names,
      discount,
      priceOriginal,
      priceFinal,
      active: comboFormData.active ?? true,
    }) as ComboDoc

    if (!payload.name) {
      alert("El nombre del combo es obligatorio.")
      return
    }
    if (!payload.serviceIds.length) {
      alert("Selecciona al menos un servicio.")
      return
    }

    if (editingCombo?.id) {
      await updateDoc(doc(db, "combos", editingCombo.id), payload as any)
    } else {
      await addDoc(collection(db, "combos"), payload as any)
    }

    setIsComboModalOpen(false)
    setEditingCombo(null)
    setComboFormData({})
    loadCombos()
  }

  const toggleComboStatus = async (id?: string, curr?: boolean) => {
    if (!id) return
    await updateDoc(doc(db, "combos", id), sanitize({ active: !curr }))
    loadCombos()
  }

  const deleteCombo = async (id?: string) => {
    if (!id) return
    if (!confirm("¿Eliminar este combo definitivamente?")) return
    await deleteDoc(doc(db, "combos", id))
    loadCombos()
  }

  // ======= Métricas rápidas =======
  const precioPromedio =
    servicios.length > 0 ? Math.round(servicios.reduce((sum, s) => sum + (s.price || 0), 0) / servicios.length) : 0
  const duracionPromedio =
    servicios.length > 0
      ? Math.round(servicios.reduce((sum, s) => sum + (s.durationMin || 0), 0) / servicios.length)
      : 0

  return (
    <div className="space-y-6">
      <Tabs defaultValue="servicios" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="servicios">Servicios</TabsTrigger>
          <TabsTrigger value="combos">Combos</TabsTrigger>
        </TabsList>

        {/* ======= SERVICIOS ======= */}
        <TabsContent value="servicios" className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar servicios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setServiceFormData({ active: true })
                    setEditingService(null)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Servicio
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingService ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input
                      id="nombre"
                      value={serviceFormData.name || ""}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="categoria">Categoría</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={serviceFormData.category || ""}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, category: e.target.value })}
                    >
                      <option value="">Seleccionar categoría</option>
                      {categorias.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea
                      id="descripcion"
                      value={serviceFormData.description || ""}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="duracion">Duración (min)</Label>
                      <Input
                        id="duracion"
                        type="number"
                        value={serviceFormData.durationMin ?? ""}
                        onChange={(e) =>
                          setServiceFormData({ ...serviceFormData, durationMin: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="precio">Precio</Label>
                      <Input
                        id="precio"
                        type="number"
                        value={serviceFormData.price ?? ""}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, price: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsServiceModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveService}>{editingService ? "Actualizar" : "Crear"}</Button>
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
                    <Scissors className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Servicios</p>
                    <p className="text-2xl font-bold">{servicios.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Sparkles className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Activos</p>
                    <p className="text-2xl font-bold">{servicios.filter((s) => s.active !== false).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Precio Promedio</p>
                    <p className="text-2xl font-bold">${precioPromedio}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duración Promedio</p>
                    <p className="text-2xl font-bold">{duracionPromedio}m</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServicios.map((s) => (
              <Card key={s.id} className={s.active === false ? "opacity-60" : ""}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{s.name}</CardTitle>
                      <Badge variant="outline">{s.category || "Sin categoría"}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditServiceModal(s)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleServiceStatus(s.id, s.active)}>
                        {s.active === false ? "🟢" : "🔴"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteService(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {s.description && <p className="text-sm text-muted-foreground mb-4">{s.description}</p>}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{s.durationMin} minutos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-lg font-semibold">${s.price}</span>
                    </div>
                    {(s.products?.length || 0) > 0 && (
                      <div className="flex items-start gap-2">
                        <Package className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Productos:</p>
                          {s.products!.map((p, i) => (
                            <Badge key={i} variant="secondary" className="text-xs mr-1 mb-1">
                              {p}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ======= COMBOS (Firestore) ======= */}
        <TabsContent value="combos" className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar combos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Dialog open={isComboModalOpen} onOpenChange={setIsComboModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNewComboModal}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Combo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingCombo ? "Editar Combo" : "Nuevo Combo"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nombreCombo">Nombre</Label>
                    <Input
                      id="nombreCombo"
                      value={comboFormData.name || ""}
                      onChange={(e) => setComboFormData({ ...comboFormData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="descCombo">Descripción</Label>
                    <Textarea
                      id="descCombo"
                      value={comboFormData.description || ""}
                      onChange={(e) => setComboFormData({ ...comboFormData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Servicios Incluidos</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {servicios
                        .filter((s) => s.active !== false)
                        .map((s) => (
                          <label key={s.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={(comboFormData.serviceIds || []).includes(s.id!)}
                              onChange={(e) => {
                                const curr = comboFormData.serviceIds || []
                                setComboFormData({
                                  ...comboFormData,
                                  serviceIds: e.target.checked ? [...curr, s.id!] : curr.filter((x) => x !== s.id),
                                })
                              }}
                            />
                            <span className="text-sm">
                              {s.name} – ${s.price}
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="descuento">Descuento (%)</Label>
                    <Input
                      id="descuento"
                      type="number"
                      min="0"
                      max="100"
                      value={comboFormData.discount ?? ""}
                      onChange={(e) => setComboFormData({ ...comboFormData, discount: Number(e.target.value) })}
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsComboModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveCombo}>{editingCombo ? "Actualizar" : "Crear"}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Combos Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {combos
              .filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((combo) => (
                <Card key={combo.id} className={combo.active === false ? "opacity-60" : ""}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{combo.name}</CardTitle>
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          {combo.discount}% OFF
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditComboModal(combo)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleComboStatus(combo.id, combo.active)}>
                          {combo.active === false ? "🟢" : "🔴"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteCombo(combo.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {combo.description && <p className="text-sm text-muted-foreground mb-4">{combo.description}</p>}

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-2">Servicios incluidos:</p>
                        {(combo.serviceNames?.length ? combo.serviceNames : combo.serviceIds)
                          .map((sid) => {
                            const name =
                              combo.serviceNames?.length
                                ? (sid as string)
                                : servicios.find((s) => s.id === sid)?.name || "Servicio"
                            return name
                          })
                          .map((nombre, i) => (
                            <Badge key={i} variant="outline" className="mr-1 mb-1">
                              {nombre}
                            </Badge>
                          ))}
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground line-through">
                            Precio individual: ${combo.priceOriginal}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold text-green-600">
                            Precio combo: ${combo.priceFinal}
                          </span>
                          <span className="text-sm text-green-600 font-medium">
                            Ahorras: ${combo.priceOriginal - combo.priceFinal}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
