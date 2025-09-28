"use client"
import React, { useEffect, useMemo, useState } from "react"
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  runTransaction,
  getDoc,
} from "firebase/firestore"
import { db } from "../../lib/firebase"

import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Badge } from "../../components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  TrendingUp,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react"

const COLL_PRODUCTS = "products"
const COLL_MOVS = "movements"

type ProductDoc = {
  id?: string
  nombre: string
  categoria: string
  stock: number
  stockMinimo: number
  precio: number
  costo: number
  proveedor: string
  fechaVencimiento?: string | null
  createdAt?: any
  updatedAt?: any
}

type MovementDoc = {
  id?: string
  productoId: string
  producto: string
  tipo: "Entrada" | "Salida"
  cantidad: number
  motivo: string
  fecha: string // YYYY-MM-DD
  usuario: string
  createdAt?: any
}

const categorias = ["Cuidado Capilar", "Cuidado Facial", "Aromaterapia", "Maquillaje", "Herramientas"]

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

export function ProductsPage() {
  // ======= Estado =======
  const [productos, setProductos] = useState<ProductDoc[]>([])
  const [movimientos, setMovimientos] = useState<MovementDoc[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isMovimientoModalOpen, setIsMovimientoModalOpen] = useState(false)

  const [editingProducto, setEditingProducto] = useState<ProductDoc | null>(null)
  const [productFormData, setProductFormData] = useState<Partial<ProductDoc>>({})

  const [movimientoFormData, setMovimientoFormData] = useState<Partial<MovementDoc>>({})

  // ======= Suscripciones tiempo real =======
  useEffect(() => {
    const qProd = query(collection(db, COLL_PRODUCTS), orderBy("nombre", "asc"))
    const unsubProd = onSnapshot(qProd, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ProductDoc) }))
      setProductos(rows)
    })

    const qMovs = query(collection(db, COLL_MOVS), orderBy("createdAt", "desc"))
    const unsubMov = onSnapshot(qMovs, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as MovementDoc) }))
      setMovimientos(rows)
    })

    return () => {
      unsubProd()
      unsubMov()
    }
  }, [])

  // ======= Productos =======
  const filteredProductos = useMemo(
    () =>
      productos.filter(
        (p) =>
          p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.categoria.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [productos, searchTerm]
  )

  const productosConAlertas = useMemo(
    () => productos.filter((p) => (p.stock ?? 0) <= (p.stockMinimo ?? 0)),
    [productos]
  )

  const openEditProductModal = (p: ProductDoc) => {
    setEditingProducto(p)
    setProductFormData({
      ...p,
      fechaVencimiento: p.fechaVencimiento || "",
    })
    setIsProductModalOpen(true)
  }

  const handleSaveProducto = async () => {
    const payload = sanitize({
      nombre: productFormData.nombre?.trim() || "",
      categoria: productFormData.categoria || "",
      stock: typeof productFormData.stock === "number" ? productFormData.stock : Number(productFormData.stock || 0),
      stockMinimo:
        typeof productFormData.stockMinimo === "number"
          ? productFormData.stockMinimo
          : Number(productFormData.stockMinimo || 0),
      precio: typeof productFormData.precio === "number" ? productFormData.precio : Number(productFormData.precio || 0),
      costo: typeof productFormData.costo === "number" ? productFormData.costo : Number(productFormData.costo || 0),
      proveedor: productFormData.proveedor || "",
      fechaVencimiento: productFormData.fechaVencimiento || null,
      updatedAt: serverTimestamp(),
    })

    if (!payload.nombre) {
      alert("El nombre es obligatorio.")
      return
    }

    if (editingProducto?.id) {
      await updateDoc(doc(db, COLL_PRODUCTS, editingProducto.id), payload as any)
    } else {
      await addDoc(collection(db, COLL_PRODUCTS), {
        ...payload,
        createdAt: serverTimestamp(),
      } as any)
    }

    setIsProductModalOpen(false)
    setEditingProducto(null)
    setProductFormData({})
  }

  const deleteProducto = async (id?: string) => {
    if (!id) return
    if (!confirm("¿Eliminar este producto? Esta acción no se puede deshacer.")) return
    await deleteDoc(doc(db, COLL_PRODUCTS, id))
  }

  // ======= Movimientos =======
  const handleSaveMovimiento = async () => {
    const productoId = movimientoFormData.productoId
    const cantidadNum =
      typeof movimientoFormData.cantidad === "number"
        ? movimientoFormData.cantidad
        : Number(movimientoFormData.cantidad || 0)
    const tipo = (movimientoFormData.tipo as MovementDoc["tipo"]) || "Entrada"

    if (!productoId) {
      alert("Selecciona un producto.")
      return
    }
    if (!cantidadNum || cantidadNum <= 0) {
      alert("La cantidad debe ser mayor a 0.")
      return
    }

    const prodRef = doc(db, COLL_PRODUCTS, productoId)
    const nowDate = new Date().toISOString().split("T")[0]

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(prodRef)
      if (!snap.exists()) throw new Error("El producto no existe.")
      const prod = snap.data() as ProductDoc
      const current = prod.stock || 0

      const nuevoStock = tipo === "Entrada" ? current + cantidadNum : current - cantidadNum
      if (nuevoStock < 0) throw new Error("No hay stock suficiente para realizar la salida.")

      // Actualiza stock
      tx.update(prodRef, {
        stock: nuevoStock,
        updatedAt: serverTimestamp(),
      })

      // Agrega movimiento
      const movRef = collection(db, COLL_MOVS)
      tx.set(doc(movRef), {
        productoId,
        producto: prod.nombre,
        tipo,
        cantidad: cantidadNum,
        motivo: movimientoFormData.motivo || "",
        fecha: nowDate,
        usuario: "Usuario Actual", // cámbialo si tienes auth
        createdAt: serverTimestamp(),
      } as MovementDoc)
    }).catch((e) => {
      alert(e.message || "Error registrando el movimiento.")
      throw e
    })

    setMovimientoFormData({})
    setIsMovimientoModalOpen(false)
  }

  // ======= Helpers =======
  const getStockColor = (stock: number, stockMinimo: number) => {
    if (stock <= stockMinimo) return "text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300"
    if (stock <= stockMinimo * 1.5) return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300"
    return "text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300"
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="productos" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="productos">Productos</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          <TabsTrigger value="alertas">Alertas</TabsTrigger>
        </TabsList>

        {/* ============== PRODUCTOS ============== */}
        <TabsContent value="productos" className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              {/* Movimiento */}
              <Dialog open={isMovimientoModalOpen} onOpenChange={setIsMovimientoModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={() => setMovimientoFormData({})}>
                    <ArrowUpCircle className="h-4 w-4 mr-2" />
                    Movimiento
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Registrar Movimiento</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="producto">Producto</Label>
                      <Select
                        value={movimientoFormData.productoId || ""}
                        onValueChange={(value) => setMovimientoFormData({ ...movimientoFormData, productoId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {productos.map((p) => (
                            <SelectItem key={p.id} value={p.id!}>
                              {p.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="tipo">Tipo</Label>
                      <Select
                        value={movimientoFormData.tipo || "Entrada"}
                        onValueChange={(value) =>
                          setMovimientoFormData({ ...movimientoFormData, tipo: value as "Entrada" | "Salida" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Entrada">Entrada</SelectItem>
                          <SelectItem value="Salida">Salida</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="cantidad">Cantidad</Label>
                      <Input
                        id="cantidad"
                        type="number"
                        value={movimientoFormData.cantidad ?? ""}
                        onChange={(e) =>
                          setMovimientoFormData({ ...movimientoFormData, cantidad: Number(e.target.value) })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="motivo">Motivo</Label>
                      <Input
                        id="motivo"
                        value={movimientoFormData.motivo || ""}
                        onChange={(e) => setMovimientoFormData({ ...movimientoFormData, motivo: e.target.value })}
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setIsMovimientoModalOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveMovimiento}>Registrar</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Producto */}
              <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setProductFormData({})
                      setEditingProducto(null)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Producto
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingProducto ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="nombre">Nombre</Label>
                      <Input
                        id="nombre"
                        value={productFormData.nombre || ""}
                        onChange={(e) => setProductFormData({ ...productFormData, nombre: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="categoria">Categoría</Label>
                      <Select
                        value={productFormData.categoria || ""}
                        onValueChange={(value) => setProductFormData({ ...productFormData, categoria: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {categorias.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="stock">Stock Actual</Label>
                        <Input
                          id="stock"
                          type="number"
                          value={productFormData.stock ?? ""}
                          onChange={(e) =>
                            setProductFormData({ ...productFormData, stock: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="stockMinimo">Stock Mínimo</Label>
                        <Input
                          id="stockMinimo"
                          type="number"
                          value={productFormData.stockMinimo ?? ""}
                          onChange={(e) =>
                            setProductFormData({ ...productFormData, stockMinimo: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="costo">Costo</Label>
                        <Input
                          id="costo"
                          type="number"
                          value={productFormData.costo ?? ""}
                          onChange={(e) =>
                            setProductFormData({ ...productFormData, costo: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="precio">Precio</Label>
                        <Input
                          id="precio"
                          type="number"
                          value={productFormData.precio ?? ""}
                          onChange={(e) =>
                            setProductFormData({ ...productFormData, precio: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="proveedor">Proveedor</Label>
                      <Input
                        id="proveedor"
                        value={productFormData.proveedor || ""}
                        onChange={(e) => setProductFormData({ ...productFormData, proveedor: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="fechaVencimiento">Fecha de Vencimiento</Label>
                      <Input
                        id="fechaVencimiento"
                        type="date"
                        value={(productFormData.fechaVencimiento as string) || ""}
                        onChange={(e) =>
                          setProductFormData({ ...productFormData, fechaVencimiento: e.target.value })
                        }
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setIsProductModalOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveProducto}>{editingProducto ? "Actualizar" : "Crear"}</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Productos</p>
                    <p className="text-2xl font-bold">{productos.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bajo Stock</p>
                    <p className="text-2xl font-bold">{productosConAlertas.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Inventario</p>
                    <p className="text-2xl font-bold">
                      $
                      {productos
                        .reduce((sum, p) => sum + (p.stock * p.costo || 0), 0)
                        .toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Categorías</p>
                    <p className="text-2xl font-bold">{categorias.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Products Table */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Productos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Precios</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProductos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="font-medium">{p.nombre}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.categoria}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge className={getStockColor(p.stock, p.stockMinimo)}>
                            {p.stock} / {p.stockMinimo}
                          </Badge>
                          {p.stock <= p.stockMinimo && (
                            <div className="flex items-center gap-1 text-red-600">
                              <AlertTriangle className="h-3 w-3" />
                              <span className="text-xs">Bajo stock</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm">Costo: ${p.costo}</p>
                          <p className="text-sm">Precio: ${p.precio}</p>
                        </div>
                      </TableCell>
                      <TableCell>{p.proveedor}</TableCell>
                      <TableCell>
                        {p.fechaVencimiento ? (
                          <span
                            className={
                              new Date(p.fechaVencimiento) <
                              new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                ? "text-red-600"
                                : "text-muted-foreground"
                            }
                          >
                            {p.fechaVencimiento}
                          </span>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Button variant="ghost" size="sm" onClick={() => openEditProductModal(p)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteProducto(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============== MOVIMIENTOS ============== */}
        <TabsContent value="movimientos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Movimientos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Usuario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientos.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.fecha}</TableCell>
                      <TableCell>{m.producto}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            m.tipo === "Entrada"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                          }
                        >
                          {m.tipo === "Entrada" ? (
                            <ArrowUpCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <ArrowDownCircle className="h-3 w-3 mr-1" />
                          )}
                          {m.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>{m.cantidad}</TableCell>
                      <TableCell>{m.motivo}</TableCell>
                      <TableCell>{m.usuario}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============== ALERTAS ============== */}
        <TabsContent value="alertas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Alertas de Inventario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productosConAlertas.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No hay alertas de inventario actualmente</p>
                ) : (
                  productosConAlertas.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800"
                    >
                      <div className="flex items-center gap-4">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="font-medium">{p.nombre}</p>
                          <p className="text-sm text-muted-foreground">
                            Stock actual: {p.stock} | Mínimo: {p.stockMinimo}
                          </p>
                          <p className="text-sm text-muted-foreground">Categoría: {p.categoria}</p>
                        </div>
                      </div>
                      <Badge variant="destructive">Crítico</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
