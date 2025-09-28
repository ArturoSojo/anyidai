"use client"

import { useEffect, useMemo, useState } from "react"
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  runTransaction,
  doc,
  serverTimestamp,
  addDoc,
} from "firebase/firestore"
import { db } from "../../lib/firebase"

import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Badge } from "../../components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog"
import { Separator } from "../../components/ui/separator"
import {
  Plus,
  Search,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  Receipt,
  Minus,
  Calculator,
} from "lucide-react"

// Picker de clientes ya usado en Agenda
import { CustomerPicker } from "../../components/CustomerPicker"
import type { CustomerLite } from "../../components/CustomerPicker"

const COLL_PRODUCTS = "products"
const COLL_SERVICES = "services"
const COLL_SALES = "sales"
const COLL_MOVS = "movements"

type ProductDoc = {
  id?: string
  nombre: string
  categoria: string
  precio: number
  stock: number
}

type ServiceDoc = {
  id?: string
  name: string
  category?: string
  price: number
  durationMin: number
}

type ItemCarrito = {
  id: string
  refId: string // id real del producto/servicio
  tipo: "producto" | "servicio"
  nombre: string
  precio: number
  cantidad: number
  total: number
}

export function POSPage() {
  // ====== Estado base ======
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState<"productos" | "servicios">("servicios")

  // Cliente (CustomerPicker)
  const [clienteSel, setClienteSel] = useState<CustomerLite | null>(null)

  // Carrito
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const totalCarrito = carrito.reduce((s, i) => s + i.total, 0)
  const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0)

  // Pago
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo")
  const [montoPagado, setMontoPagado] = useState<string>("")
  const cambio = (parseFloat(montoPagado || "0") || 0) - totalCarrito
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  // ====== Productos / Servicios (live) ======
  const [productos, setProductos] = useState<ProductDoc[]>([])
  const [servicios, setServicios] = useState<ServiceDoc[]>([])

  useEffect(() => {
    const qProd = query(collection(db, COLL_PRODUCTS), orderBy("nombre", "asc"))
    const unsubProd = onSnapshot(qProd, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ProductDoc) }))
      setProductos(rows)
    })

    const qServ = query(collection(db, COLL_SERVICES), orderBy("name", "asc"))
    const unsubServ = onSnapshot(qServ, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ServiceDoc) }))
      setServicios(rows)
    })

    return () => {
      unsubProd()
      unsubServ()
    }
  }, [])

  const productosFiltrados = useMemo(
    () =>
      productos.filter(
        (p) =>
          p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.categoria.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [productos, searchTerm]
  )

  const serviciosFiltrados = useMemo(
    () =>
      servicios.filter(
        (s) =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.category || "").toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [servicios, searchTerm]
  )

  // ====== Carrito helpers ======
  const agregarProducto = (p: ProductDoc) => {
    const itemId = `producto-${p.id}`
    setCarrito((prev) => {
      const found = prev.find((i) => i.id === itemId)
      if (found) {
        // Respetar stock
        const nuevoQty = Math.min(found.cantidad + 1, p.stock || 0)
        return prev.map((i) =>
          i.id === itemId ? { ...i, cantidad: nuevoQty, total: nuevoQty * i.precio } : i
        )
      }
      if ((p.stock || 0) <= 0) return prev
      return [
        ...prev,
        {
          id: itemId,
          refId: p.id!,
          tipo: "producto",
          nombre: p.nombre,
          precio: p.precio,
          cantidad: 1,
          total: p.precio,
        },
      ]
    })
  }

  const agregarServicio = (s: ServiceDoc) => {
    const itemId = `servicio-${s.id}`
    setCarrito((prev) => {
      const found = prev.find((i) => i.id === itemId)
      if (found) {
        const nuevoQty = found.cantidad + 1
        return prev.map((i) =>
          i.id === itemId ? { ...i, cantidad: nuevoQty, total: nuevoQty * i.precio } : i
        )
      }
      return [
        ...prev,
        {
          id: itemId,
          refId: s.id!,
          tipo: "servicio",
          nombre: s.name,
          precio: s.price,
          cantidad: 1,
          total: s.price,
        },
      ]
    })
  }

  const eliminarDelCarrito = (itemId: string) => {
    setCarrito((prev) => prev.filter((i) => i.id !== itemId))
  }

  const actualizarCantidad = (itemId: string, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) return eliminarDelCarrito(itemId)
    setCarrito((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, cantidad: nuevaCantidad, total: nuevaCantidad * i.precio } : i))
    )
  }

  // ====== Venta (sale) ======
  const procesarVenta = async () => {
    if (carrito.length === 0) return

    // Validar efectivo
    if (metodoPago === "efectivo") {
      const pagado = parseFloat(montoPagado || "0") || 0
      if (pagado < totalCarrito) {
        alert("El monto recibido es menor al total.")
        return
      }
    }

    // Prepara el documento de venta
    const saleDoc = {
      createdAt: serverTimestamp(),
      date: new Date().toISOString().split("T")[0],
      customer: clienteSel
        ? {
          id: clienteSel.id,
          nombre: clienteSel.nombre,
          telefono: clienteSel.telefono || null,
          email: clienteSel.email || null,
        }
        : null,
      payment: {
        method: metodoPago,
        amountPaid: metodoPago === "efectivo" ? parseFloat(montoPagado || "0") || 0 : totalCarrito,
        change: metodoPago === "efectivo" ? (parseFloat(montoPagado || "0") || 0) - totalCarrito : 0,
      },
      items: carrito.map((i) => ({
        refId: i.refId,
        type: i.tipo,
        name: i.nombre,
        unitPrice: i.precio,
        qty: i.cantidad,
        subtotal: i.total,
      })),
      totals: {
        subtotal: totalCarrito,
        total: totalCarrito,
      },
    }

    // 1) Crear venta
    const saleRef = await addDoc(collection(db, COLL_SALES), saleDoc)

    // 2) Descontar stock y crear movimientos para cada producto
    const productItems = carrito.filter((i) => i.tipo === "producto")
    for (const it of productItems) {
      const pRef = doc(db, COLL_PRODUCTS, it.refId)
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(pRef)
        if (!snap.exists()) throw new Error("Producto no existe")
        const prod = snap.data() as ProductDoc
        const current = prod.stock || 0
        const nuevo = current - it.cantidad
        if (nuevo < 0) throw new Error(`Stock insuficiente para ${prod.nombre}`)

        tx.update(pRef, { stock: nuevo, updatedAt: serverTimestamp() })

        const movRef = collection(db, COLL_MOVS)
        tx.set(doc(movRef), {
          productoId: it.refId,
          producto: prod.nombre,
          tipo: "Salida",
          cantidad: it.cantidad,
          motivo: `Venta POS ${saleRef.id}`,
          fecha: new Date().toISOString().split("T")[0],
          usuario: "POS",
          createdAt: serverTimestamp(),
        })
      })
    }

    // 3) Limpiar UI
    setCarrito([])
    setClienteSel(null)
    setMontoPagado("")
    setIsCheckoutOpen(false)
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Panel izquierdo - Productos/Servicios */}
      <div className="flex-1 space-y-4">
        {/* Tabs + búsqueda */}
        <div className="flex gap-4 items-center">
          <div className="flex bg-muted p-1 rounded-lg">
            <Button
              variant={activeTab === "servicios" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("servicios")}
            >
              Servicios
            </Button>
            <Button
              variant={activeTab === "productos" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("productos")}
            >
              Productos
            </Button>
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Buscar ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto max-h-[calc(100vh-12rem)]">
          {activeTab === "servicios" &&
            serviciosFiltrados.map((s) => (
              <Card key={s.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4" onClick={() => agregarServicio(s)}>
                  <div className="space-y-2">
                    <Badge variant="outline">{s.category || "Servicio"}</Badge>
                    <h3 className="font-medium">{s.name}</h3>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">${s.price}</span>
                      <span className="text-sm text-muted-foreground">{s.durationMin}min</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

          {activeTab === "productos" &&
            productosFiltrados.map((p) => (
              <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4" onClick={() => agregarProducto(p)}>
                  <div className="space-y-2">
                    <Badge variant="outline">{p.categoria}</Badge>
                    <h3 className="font-medium">{p.nombre}</h3>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">${p.precio}</span>
                      <Badge className={p.stock > 5 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                        Stock: {p.stock}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>

      {/* Panel derecho - Carrito */}
      <div className="w-96">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Carrito ({totalItems})
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col">
            {/* Cliente */}
            <div className="mb-4 space-y-2">
              <Label>Cliente</Label>
              <CustomerPicker
                value={clienteSel}
                onSelect={(c) => setClienteSel(c)}
                placeholder="Buscar por nombre, teléfono o email"
              />
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {carrito.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Carrito vacío</p>
              ) : (
                carrito.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.nombre}</p>
                      <p className="text-sm text-muted-foreground">
                        ${item.precio} x {item.cantidad}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{item.cantidad}</span>
                      <Button variant="ghost" size="sm" onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => eliminarDelCarrito(item.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totales */}
            <Separator className="my-4" />
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${totalCarrito.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg">
                <span>Total:</span>
                <span>${totalCarrito.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout */}
            <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
              <DialogTrigger asChild>
                <Button className="w-full mt-4" size="lg" disabled={carrito.length === 0}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Procesar Pago
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Procesar Pago</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Resumen */}
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Resumen de la venta</h4>
                    <div className="space-y-1 text-sm">
                      {carrito.map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <span>
                            {item.nombre} x{item.cantidad}
                          </span>
                          <span>${item.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>${totalCarrito.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Cliente */}
                  {clienteSel && (
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Cliente</h4>
                      <p className="text-sm">{clienteSel.nombre}</p>
                      {clienteSel.telefono && <p className="text-sm text-muted-foreground">{clienteSel.telefono}</p>}
                    </div>
                  )}

                  {/* Método de pago */}
                  <div>
                    <Label>Método de pago</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <Button
                        variant={metodoPago === "efectivo" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMetodoPago("efectivo")}
                      >
                        <Banknote className="h-4 w-4 mr-1" />
                        Efectivo
                      </Button>
                      <Button
                        variant={metodoPago === "tarjeta" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMetodoPago("tarjeta")}
                      >
                        <CreditCard className="h-4 w-4 mr-1" />
                        Tarjeta
                      </Button>
                      <Button
                        variant={metodoPago === "transferencia" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMetodoPago("transferencia")}
                      >
                        <Calculator className="h-4 w-4 mr-1" />
                        Transfer.
                      </Button>
                    </div>
                  </div>

                  {/* Monto recibido */}
                  {metodoPago === "efectivo" && (
                    <div>
                      <Label htmlFor="montoPagado">Monto recibido</Label>
                      <Input
                        id="montoPagado"
                        type="number"
                        step="0.01"
                        value={montoPagado}
                        onChange={(e) => setMontoPagado(e.target.value)}
                        placeholder="0.00"
                      />
                      {!!montoPagado && parseFloat(montoPagado) >= totalCarrito && (
                        <p className="text-sm text-green-600 mt-1">Cambio: ${cambio.toFixed(2)}</p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={procesarVenta}
                      disabled={metodoPago === "efectivo" ? !montoPagado || parseFloat(montoPagado) < totalCarrito : false}
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      Completar Venta
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
