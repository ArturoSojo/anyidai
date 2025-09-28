"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Progress } from "../components/ui/progress"
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  Users,
  Calendar,
  DollarSign,
  Scissors,
  TrendingUp,
  Clock,
  Package,
  AlertTriangle,
  Star,
  Award,
  Target,
} from "lucide-react"

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  
} from "firebase/firestore"
import { db } from "../lib/firebase"
import type { DocumentData } from "firebase/firestore"
// ================== Ajusta nombres si hace falta ==================
const COLL_SALES = "sales"
const COLL_APPTS = "appointments"
const COLL_PRODUCTS = "products"

// ============== Tipos esperados (flexibles) ==============
type SaleItem = {
  type: "producto" | "servicio"
  name: string
  unitPrice?: number
  qty?: number
  subtotal?: number
  staffName?: string | null
}

type SaleDoc = {
  id?: string
  date: string // YYYY-MM-DD
  time?: string // HH:mm (opcional)
  createdAt?: Timestamp
  items?: SaleItem[]
  totals?: { total?: number }
  customer?: { id?: string; nombre?: string | null }
}

type ApptDoc = {
  id?: string
  fecha: string // YYYY-MM-DD
  hora: string // HH:mm
  cliente: string
  servicio: string
  estado?: string
  staffName?: string
  duracion?: number
}

type ProductDoc = {
  id?: string
  name: string
  stock?: number
  stockMin?: number
  price?: number
  cost?: number
  supplier?: string
  expiryDate?: string // YYYY-MM-DD
}

// ================== Utils ==================
const todayStr = () => new Date().toISOString().slice(0, 10)
const toHourLabel = (d?: Timestamp, fallback?: string) => {
  if (fallback) return fallback
  if (!d) return ""
  const date = d.toDate()
  const hh = String(date.getHours()).padStart(2, "0")
  const mm = String(date.getMinutes()).padStart(2, "0")
  return `${hh}:00` // redondeamos por hora
}
const fmtMoney = (n: number) => `$${n.toLocaleString()}`

function addMinutes(hhmm: string, minutes: number) {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10))
  const d = new Date()
  d.setHours(h, m, 0, 0)
  d.setMinutes(d.getMinutes() + minutes)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function withinNextHours(hhmm: string, hours = 4) {
  const now = new Date()
  const target = new Date()
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10))
  target.setHours(h, m, 0, 0)
  const diff = (target.getTime() - now.getTime()) / (1000 * 60 * 60)
  return diff >= -0.5 && diff <= hours // incluye las que están empezando
}

// ================== Dashboard ==================
export function Dashboard() {
  const [ventasHoy, setVentasHoy] = useState<SaleDoc[]>([])
  const [citasHoy, setCitasHoy] = useState<ApptDoc[]>([])
  const [productos, setProductos] = useState<ProductDoc[]>([])

  const [loading, setLoading] = useState(true)

  const fecha = todayStr()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // Ventas de hoy
        const qSales = query(
          collection(db, COLL_SALES),
          where("date", "==", fecha),
          orderBy("date", "asc")
        )
        const snapSales = await getDocs(qSales)
        const sales = snapSales.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as SaleDoc[]
        setVentasHoy(sales)

        // Citas de hoy
        const qAppts = query(
          collection(db, COLL_APPTS),
          where("fecha", "==", fecha)
          // sin orderBy para evitar índice si no lo tienes
        )
        const snapAppts = await getDocs(qAppts)
        const appts = snapAppts.docs
          .map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as ApptDoc[]
        // ordenar por hora en memoria
        appts.sort((a, b) => (a.hora || "").localeCompare(b.hora || ""))
        setCitasHoy(appts)

        // Productos (para alertas)
        try {
          const qProducts = query(collection(db, COLL_PRODUCTS))
          const snapProducts = await getDocs(qProducts)
          const prods = snapProducts.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as ProductDoc[]
          setProductos(prods)
        } catch {
          setProductos([])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [fecha])

  // ================= KPIs =================
  const totalVentasHoy = useMemo(
    () => ventasHoy.reduce((s, v) => s + (v.totals?.total || 0), 0),
    [ventasHoy]
  )

  const clientesUnicosHoy = useMemo(() => {
    const ids = new Set<string>()
    ventasHoy.forEach((v) => {
      const k = v.customer?.id || v.customer?.nombre || ""
      if (k) ids.add(k)
    })
    return ids.size
  }, [ventasHoy])

  const totalCitasHoy = citasHoy.length
  const citasPendientes = citasHoy.filter((c) => c.estado !== "Completada" && c.estado !== "Cancelada").length

  const ticketPromedio = ventasHoy.length ? Math.round(totalVentasHoy / ventasHoy.length) : 0

  // Ocupación (heurística simple: citas confirmadas / total slots estimados)
  const confirmadas = citasHoy.filter((c) => c.estado === "Confirmada" || c.estado === "En Proceso").length
  const ocupacionPromedio = Math.min(100, Math.round((confirmadas / Math.max(1, totalCitasHoy)) * 100))

  // ============= Serie: Ventas por hora (hoy) =============
  const serieVentasHora = useMemo(() => {
    const bucket: Record<string, number> = {}
    ventasHoy.forEach((v) => {
      const h = toHourLabel(v.createdAt, v.time) || "12:00"
      bucket[h] = (bucket[h] || 0) + (v.totals?.total || 0)
    })
    // ordenar horas asc
    const hours = Object.keys(bucket).sort()
    return hours.map((h) => ({ hora: h, ventas: bucket[h] }))
  }, [ventasHoy])

  // ============= Servicios populares (hoy) =============
  const serviciosPopulares = useMemo(() => {
    const map: Record<string, { cantidad: number; ingresos: number }> = {}
    ventasHoy.forEach((v) => {
      (v.items || []).forEach((it) => {
        if (it.type === "servicio") {
          map[it.name] ||= { cantidad: 0, ingresos: 0 }
          map[it.name].cantidad += it.qty || 0
          map[it.name].ingresos += it.subtotal || 0
        }
      })
    })
    const arr = Object.entries(map).map(([servicio, v]) => ({
      servicio,
      cantidad: v.cantidad,
      ingresos: v.ingresos,
    }))
    arr.sort((a, b) => b.cantidad - a.cantidad)
    // Colores fijos
    const colors = ["#EC407A", "#7B1FA2", "#1976D2", "#00BCD4", "#F8D7DA", "#00C49F", "#FFBB28"]
    return arr.slice(0, 6).map((x, i) => ({ ...x, color: colors[i % colors.length] }))
  }, [ventasHoy])

  // ============= Próximas citas (siguientes 4h) =============
  const proximasCitas = useMemo(
    () =>
      citasHoy.filter((c) => withinNextHours(c.hora, 4)).slice(0, 6).map((c) => ({
        hora: c.hora,
        cliente: c.cliente,
        servicio: c.servicio,
        barbero: c.staffName || "Equipo",
        duracion: c.duracion || 30,
        estado: c.estado || "Programada",
      })),
    [citasHoy]
  )

  // ============= Alertas (stock bajo / vencimientos 30 días) =============
  const hoy = fecha
  const soon = (d?: string) => {
    if (!d) return false
    const dt = new Date(d + "T00:00:00").getTime()
    const limit = new Date().getTime() + 30 * 24 * 60 * 60 * 1000
    return dt <= limit
  }
  const alertas = useMemo(() => {
    const arr: { tipo: string; mensaje: string; prioridad: "alta" | "media" | "baja" }[] = []
    productos.forEach((p) => {
      const stock = p.stock ?? 0
      const min = p.stockMin ?? 0
      if (stock <= min && min > 0) {
        arr.push({
          tipo: "stock",
          mensaje: `${p.name}: solo ${stock} (mín ${min})`,
          prioridad: stock === 0 ? "alta" : "media",
        })
      }
      if (soon(p.expiryDate)) {
        arr.push({
          tipo: "vencimiento",
          mensaje: `${p.name}: próximo a vencer (${p.expiryDate})`,
          prioridad: "baja",
        })
      }
    })
    return arr.slice(0, 6)
  }, [productos, hoy])

  // (Opcional) Rendimiento equipo si vienes marcando staffName en items de ventas
  const equipoBarberos = useMemo(() => {
    const map: Record<
      string,
      { nombre: string; ventasHoy: number; citasHoy: number; calificacion: number; especialidad: string }
    > = {}
    // ventas por staff
    ventasHoy.forEach((v) =>
      (v.items || []).forEach((it) => {
        const staff = it.staffName || "Equipo"
        map[staff] ||= { nombre: staff, ventasHoy: 0, citasHoy: 0, calificacion: 4.8, especialidad: "Servicios" }
        map[staff].ventasHoy += it.subtotal || 0
      })
    )
    // citas por staff
    citasHoy.forEach((c) => {
      const staff = c.staffName || "Equipo"
      map[staff] ||= { nombre: staff, ventasHoy: 0, citasHoy: 0, calificacion: 4.8, especialidad: "Servicios" }
      map[staff].citasHoy += 1
    })
    const arr = Object.values(map)
    arr.sort((a, b) => b.ventasHoy - a.ventasHoy)
    return arr.slice(0, 5)
  }, [ventasHoy, citasHoy])

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case "alta":
        return "bg-red-100 text-red-800 border-red-200"
      case "media":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "baja":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  // ============== UI ==============
  return (
    <div>
      {/* Header con saludo */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-pink-500 rounded-xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">¡Buen día! 👋</h1>
            <p className="text-purple-100">Resumen de hoy</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-purple-100">Hoy</p>
            <p className="text-xl font-semibold">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-pink-600">Ventas de Hoy</p>
                <p className="text-2xl font-bold text-pink-800">{fmtMoney(totalVentasHoy)}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  <span className="text-xs text-green-600">al instante</span>
                </div>
              </div>
              <div className="p-3 bg-pink-200 rounded-full">
                <DollarSign className="h-6 w-6 text-pink-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Clientes Atendidos</p>
                <p className="text-2xl font-bold text-purple-800">{clientesUnicosHoy}</p>
                <div className="flex items-center mt-1">
                  <Users className="h-3 w-3 mr-1 text-purple-600" />
                  <span className="text-xs text-purple-700">únicos</span>
                </div>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Citas de Hoy</p>
                <p className="text-2xl font-bold text-blue-800">{totalCitasHoy}</p>
                <p className="text-xs text-blue-600">{citasPendientes} pendientes</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cyan-600">Ocupación</p>
                <p className="text-2xl font-bold text-cyan-800">{ocupacionPromedio}%</p>
                <Progress value={ocupacionPromedio} className="mt-2 h-2" />
              </div>
              <div className="p-3 bg-cyan-200 rounded-full">
                <Target className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Ventas del Día (línea por hora) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Ventas del Día
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={serieVentasHora}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hora" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip
                  formatter={(value: any, name) => [fmtMoney(Number(value)), "Ventas"]}
                  labelStyle={{ color: "#333" }}
                />
                <Line type="monotone" dataKey="ventas" stroke="#7B1FA2" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Servicios Populares (hoy) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5 text-pink-600" />
              Servicios de Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={serviciosPopulares}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="cantidad"
                  label={({ cantidad }: any) => `${cantidad}`}
                >
                  {serviciosPopulares.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any, _n: any, p: any) => [`${value} servicios`, p?.payload?.servicio]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Rendimiento del Equipo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-cyan-600" />
              Rendimiento del Equipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {equipoBarberos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay datos del equipo hoy.</p>
              ) : (
                equipoBarberos.map((b, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-semibold">
                        {b.nombre
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium">{b.nombre}</p>
                        <p className="text-sm text-gray-600">{b.especialidad}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 mb-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        <span className="text-sm font-medium">{b.calificacion.toFixed(1)}</span>
                      </div>
                      <p className="text-sm font-semibold text-green-600">{fmtMoney(b.ventasHoy)}</p>
                      <p className="text-xs text-gray-500">{b.citasHoy} citas</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Próximas Citas (4h) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Próximas Citas (4h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {proximasCitas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin citas próximas</p>
              ) : (
                proximasCitas.map((cita, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-sm font-semibold text-blue-600">{cita.hora}</p>
                        <p className="text-xs text-gray-500">{cita.duracion}min</p>
                      </div>
                      <div>
                        <p className="font-medium">{cita.cliente}</p>
                        <p className="text-sm text-gray-600">{cita.servicio}</p>
                        <p className="text-xs text-purple-600">con {cita.barbero}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      Confirmada
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas y Notificaciones */}
      {alertas.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Alertas y Notificaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alertas.map((a, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${getPrioridadColor(a.prioridad)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5" />
                        <p className="text-sm">{a.mensaje}</p>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {a.prioridad}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Métricas rápidas del día */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
        <Card>
          <CardContent className="p-6 text-center">
            <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Ventas Hoy</p>
            <p className="text-xl font-bold">{fmtMoney(totalVentasHoy)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Ticket Promedio</p>
            <p className="text-xl font-bold">{fmtMoney(ticketPromedio)}</p>
            <p className="text-xs text-blue-600">por venta</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Star className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Clientes Únicos</p>
            <p className="text-xl font-bold">{clientesUnicosHoy}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Package className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Alertas</p>
            <p className="text-xl font-bold">{alertas.length}</p>
            <p className="text-xs text-orange-600">inventario / vencimientos</p>
          </CardContent>
        </Card>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground mt-4">Cargando datos de hoy…</p>
      )}
    </div>
  )
}
