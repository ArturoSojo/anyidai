"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import {
  BarChart as RBarChart,
  Bar,
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
  Legend,
} from "recharts"
import { TrendingUp, DollarSign, Users, Calendar, Download, FileText, BarChart3 } from "lucide-react"

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore"
import type { DocumentData } from "firebase/firestore"
import { db } from "../../lib/firebase"

// ==== Colecciones ====
const COLL_SALES = "sales"
const COLL_APPTS = "appointments" // para KPI de citas

// ==== Tipos locales ====
type SaleItem = {
  refId: string
  type: "producto" | "servicio"
  name: string
  unitPrice: number
  qty: number
  subtotal: number
}

type SaleDoc = {
  id?: string
  date: string // "YYYY-MM-DD"
  createdAt?: Timestamp
  items: SaleItem[]
  totals: { subtotal: number; total: number }
  customer?: { id?: string; nombre?: string | null }
  payment?: { method: string; amountPaid?: number }
}

type DailyPoint = { dia: string; ventas: number; citas: number }
type MonthlyPoint = { mes: string; ventas: number; servicios: number; productos: number; clientes: number }

// ==== Utilidades ====
const fmtMoney = (n: number) => `$${n.toLocaleString()}`

const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map((x) => parseInt(x, 10))
  const nombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  return `${nombres[(m - 1 + 12) % 12]} ${String(y).slice(2)}`
}

// Construye mapa YYYY-MM -> valor
function groupByMonth<T>(
  rows: T[],
  getDate: (r: T) => string,
  getValue: (r: T) => number,
  byType?: (r: T) => "servicios" | "productos" | null
) {
  const acc: Record<string, { ventas: number; servicios: number; productos: number; clientes: number }> = {}
  for (const r of rows) {
    const d = getDate(r) // YYYY-MM-DD
    const ym = d.slice(0, 7) // YYYY-MM
    acc[ym] ||= { ventas: 0, servicios: 0, productos: 0, clientes: 0 }
    const v = getValue(r)
    acc[ym].ventas += v
    if (byType) {
      const t = byType(r)
      if (t === "servicios") acc[ym].servicios += v
      else if (t === "productos") acc[ym].productos += v
    }
  }
  return acc
}

function addDays(dateStr: string, delta: number) {
  const d = new Date(dateStr + "T00:00:00")
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

function diffDays(a: string, b: string) {
  const da = new Date(a + "T00:00:00").getTime()
  const db = new Date(b + "T00:00:00").getTime()
  return Math.round((db - da) / (1000 * 60 * 60 * 24))
}

function rangeDays(start: string, end: string) {
  const out: string[] = []
  const n = diffDays(start, end)
  for (let i = 0; i <= n; i++) out.push(addDays(start, i))
  return out
}

function weekdayShort(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
  return days[d.getDay()]
}

function calcChangePct(actual: number, anterior: number) {
  if (!anterior) return "—"
  return (((actual - anterior) / anterior) * 100).toFixed(1)
}

// ==== Exportar CSV simple ====
function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const val = r[h] ?? ""
          const s = typeof val === "string" ? val.replace(/"/g, '""') : String(val)
          return `"${s}"`
        })
        .join(",")
    ),
  ].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportPage() {
  // ================= Filtros =================
  const [fechaInicio, setFechaInicio] = useState<string>(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().slice(0, 10) // primer día del mes actual
  })
  const [fechaFin, setFechaFin] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [tipoReporte, setTipoReporte] = useState<"ventas" | "servicios" | "productos" | "clientes">("ventas")

  // =============== Datos Firestore ===============
  const [ventas, setVentas] = useState<SaleDoc[]>([])
  const [ventasPrev, setVentasPrev] = useState<SaleDoc[]>([]) // para comparar KPIs con periodo anterior
  const [citas, setCitas] = useState<number>(0)

  // Cargar ventas del rango actual y del rango anterior (misma longitud)
  useEffect(() => {
    const load = async () => {
      // rango actual
      const q1 = query(
        collection(db, COLL_SALES),
        where("date", ">=", fechaInicio),
        where("date", "<=", fechaFin),
        orderBy("date", "asc")
      )
      const snap1 = await getDocs(q1)
      const rows1 = snap1.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as SaleDoc[]
      setVentas(rows1)

      // rango anterior (mismos días)
      const len = Math.max(1, diffDays(fechaInicio, fechaFin) + 1)
      const prevEnd = addDays(fechaInicio, -1)
      const prevStart = addDays(prevEnd, -(len - 1))

      const q2 = query(
        collection(db, COLL_SALES),
        where("date", ">=", prevStart),
        where("date", "<=", prevEnd),
        orderBy("date", "asc")
      )
      const snap2 = await getDocs(q2)
      const rows2 = snap2.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as SaleDoc[]
      setVentasPrev(rows2)

      // Citas (opcional)
      try {
        const qa = query(
          collection(db, COLL_APPTS),
          where("fecha", ">=", fechaInicio),
          where("fecha", "<=", fechaFin),
          orderBy("fecha", "asc")
        )
        const asnap = await getDocs(qa)
        setCitas(asnap.size)
      } catch {
        // Si no existe coleccion o indices, solo ignora
        setCitas(0)
      }
    }
    load()
  }, [fechaInicio, fechaFin])

  // =============== Cálculos KPIs ===============
  const ventasTotal = useMemo(() => ventas.reduce((s, v) => s + (v.totals?.total || 0), 0), [ventas])
  const ventasAnterior = useMemo(() => ventasPrev.reduce((s, v) => s + (v.totals?.total || 0), 0), [ventasPrev])

  const totalTickets = ventas.length
  const promedioVenta = totalTickets ? Math.round(ventasTotal / totalTickets) : 0

  const clientesUnicos = useMemo(() => {
    const setIds = new Set<string>()
    for (const v of ventas) {
      const id = v.customer?.id || v.customer?.nombre || ""
      if (id) setIds.add(id)
    }
    return setIds.size
  }, [ventas])

  // =============== Series y tablas ===============
  // 1) Ventas por día (y citas)
  const ventasDiarias: DailyPoint[] = useMemo(() => {
    const map: Record<string, number> = {}
    for (const v of ventas) {
      map[v.date] = (map[v.date] || 0) + (v.totals?.total || 0)
    }
    return rangeDays(fechaInicio, fechaFin).map((d) => ({
      dia: weekdayShort(d),
      ventas: map[d] || 0,
      citas: 0, // Si quieres contar citas/día, necesitarías sumar por fecha desde appointments
    }))
  }, [ventas, fechaInicio, fechaFin])

  // 2) Mensual (ventas, por tipo)
  const mensualMap = useMemo(() => {
    // descomponemos la venta en items para diferenciar productos/servicios
    type Row = { date: string; total: number; t: "servicios" | "productos" | null }
    const rows: Row[] = []
    for (const v of ventas) {
      if (v.items?.length) {
        for (const it of v.items) {
          rows.push({
            date: v.date,
            total: it.subtotal || 0,
            t: it.type === "servicio" ? "servicios" : it.type === "producto" ? "productos" : null,
          })
        }
      } else {
        rows.push({ date: v.date, total: v.totals?.total || 0, t: null })
      }
    }
    return groupByMonth(
      rows,
      (r) => r.date,
      (r) => r.total,
      (r) => r.t
    )
  }, [ventas])

  const ventasMensuales: MonthlyPoint[] = useMemo(() => {
    const keys = Object.keys(mensualMap).sort()
    return keys.map((k) => ({
      mes: monthLabel(k),
      ventas: mensualMap[k].ventas,
      servicios: mensualMap[k].servicios,
      productos: mensualMap[k].productos,
      clientes: 0, // opcional si quieres distinct clientes por mes
    }))
  }, [mensualMap])

  // 3) Servicios más vendidos y Productos más vendidos
  const serviciosMasVendidos = useMemo(() => {
    const map: Record<string, number> = {}
    for (const v of ventas) {
      for (const it of v.items || []) {
        if (it.type === "servicio") map[it.name] = (map[it.name] || 0) + it.subtotal
      }
    }
    const arr = Object.entries(map).map(([servicio, ventas]) => ({ servicio, ventas }))
    arr.sort((a, b) => b.ventas - a.ventas)
    // Colores básicos
    const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00C49F", "#FFBB28"]
    return arr.map((x, i) => ({ ...x, color: colors[i % colors.length] }))
  }, [ventas])

  const productosVendidos = useMemo(() => {
    const count: Record<string, { cantidad: number; ingresos: number }> = {}
    for (const v of ventas) {
      for (const it of v.items || []) {
        if (it.type === "producto") {
          count[it.name] ||= { cantidad: 0, ingresos: 0 }
          count[it.name].cantidad += it.qty || 0
          count[it.name].ingresos += it.subtotal || 0
        }
      }
    }
    const arr = Object.entries(count).map(([producto, v]) => ({ producto, ...v }))
    arr.sort((a, b) => b.ingresos - a.ingresos)
    return arr
  }, [ventas])

  // 4) Top clientes por gasto
  const topClientes = useMemo(() => {
    const map: Record<string, { nombre: string; gastoTotal: number; visitas: number }> = {}
    for (const v of ventas) {
      const key = v.customer?.id || v.customer?.nombre || "Cliente"
      const nombre = v.customer?.nombre || "Cliente"
      map[key] ||= { nombre, gastoTotal: 0, visitas: 0 }
      map[key].gastoTotal += v.totals?.total || 0
      map[key].visitas += 1
    }
    const arr = Object.values(map)
    arr.sort((a, b) => b.gastoTotal - a.gastoTotal)
    return arr.slice(0, 10)
  }, [ventas])

  // =============== Exportaciones ===============
  const exportarReporte = (formato: "pdf" | "excel") => {
    if (formato === "excel") {
      // Exportamos CSV con el detalle de ventas del rango
      const rows = ventas.flatMap((v) =>
        (v.items || []).map((it) => ({
          fecha: v.date,
          cliente: v.customer?.nombre || "",
          tipo: it.type,
          item: it.name,
          cantidad: it.qty,
          precioUnit: it.unitPrice,
          subtotal: it.subtotal,
          totalVenta: v.totals?.total || 0,
          metodoPago: v.payment?.method || "",
        }))
      )
      downloadCSV(`reporte_${fechaInicio}_a_${fechaFin}.csv`, rows)
    } else {
      // PDF: puedes conectar jsPDF / react-pdf o usar print() con diseño específico
      window.print()
    }
  }

  // =============== KPIs mostrados ===============
  const kpiData = {
    ventasTotal,
    ventasAnterior,
    clientesNuevos: clientesUnicos, // si quieres "nuevos" de verdad, compara con periodo anterior
    clientesAnterior: 0, // placeholder (o calcula unique del periodo anterior)
    promedioVenta,
    promedioAnterior: ventasPrev.length ? Math.round(ventasAnterior / ventasPrev.length) : 0,
    totalCitas: citas,
    citasAnterior: 0, // podrías calcular también para el rango anterior
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Filtros de Reporte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="fechaInicio">Fecha Inicio</Label>
              <Input id="fechaInicio" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="fechaFin">Fecha Fin</Label>
              <Input id="fechaFin" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="tipoReporte">Tipo de Reporte</Label>
              <Select value={tipoReporte} onValueChange={(v) => setTipoReporte(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ventas">Ventas</SelectItem>
                  <SelectItem value="servicios">Servicios</SelectItem>
                  <SelectItem value="productos">Productos</SelectItem>
                  <SelectItem value="clientes">Clientes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => exportarReporte("pdf")}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" onClick={() => exportarReporte("excel")}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ventas Totales</p>
                <p className="text-2xl font-bold">{fmtMoney(kpiData.ventasTotal)}</p>
                <div className="flex items-center text-xs mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  <span className="text-green-500">+{calcChangePct(kpiData.ventasTotal, kpiData.ventasAnterior)}%</span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clientes Únicos</p>
                <p className="text-2xl font-bold">{kpiData.clientesNuevos}</p>
                <div className="flex items-center text-xs mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  <span className="text-green-500">
                    {/* Si calculas clientes del periodo anterior, cámbialo aquí */}
                    +{calcChangePct(kpiData.clientesNuevos, kpiData.clientesAnterior)}%
                  </span>
                </div>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Promedio por Venta</p>
                <p className="text-2xl font-bold">{fmtMoney(kpiData.promedioVenta)}</p>
                <div className="flex items-center text-xs mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  <span className="text-green-500">
                    +{calcChangePct(kpiData.promedioVenta, kpiData.promedioAnterior)}%
                  </span>
                </div>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Citas</p>
                <p className="text-2xl font-bold">{kpiData.totalCitas}</p>
                <div className="flex items-center text-xs mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  <span className="text-green-500">
                    +{calcChangePct(kpiData.totalCitas, kpiData.citasAnterior)}%
                  </span>
                </div>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={tipoReporte} value={tipoReporte} onValueChange={(v) => setTipoReporte(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ventas">Ventas</TabsTrigger>
          <TabsTrigger value="servicios">Servicios</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="productos">Productos</TabsTrigger>
        </TabsList>

        {/* ===== Ventas ===== */}
        <TabsContent value="ventas" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tendencia de Ventas Mensuales</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={ventasMensuales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip formatter={(v: any) => [fmtMoney(Number(v)), "Ventas"]} />
                    <Line type="monotone" dataKey="ventas" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ventas por Día (rango)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RBarChart data={ventasDiarias}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dia" />
                    <YAxis />
                    <Tooltip formatter={(v: any) => [fmtMoney(Number(v)), "Ventas"]} />
                    <Bar dataKey="ventas" fill="#82ca9d" />
                  </RBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Servicios vs Productos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RBarChart data={ventasMensuales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="servicios" stackId="a" fill="#8884d8" name="Servicios" />
                    <Bar dataKey="productos" stackId="a" fill="#82ca9d" name="Productos" />
                  </RBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribución de Ingresos (rango)</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const totalServicios = serviciosMasVendidos.reduce((s, x) => s + x.ventas, 0)
                  const totalProductos = productosVendidos.reduce((s, x) => s + x.ingresos, 0)
                  const pieData = [
                    { name: "Servicios", value: totalServicios, color: "#8884d8" },
                    { name: "Productos", value: totalProductos, color: "#82ca9d" },
                  ]
                  return (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, percent }: { name?: string; percent?: number }) => {
                            return `${name ?? ""} ${percent !== undefined ? (percent * 100).toFixed(0) : "0"}%`
                          }}
                        >
                          {pieData.map((e, i) => (
                            <Cell key={i} fill={e.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => [fmtMoney(Number(v)), "Ingresos"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  )
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== Servicios ===== */}
        <TabsContent value="servicios" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Servicios más vendidos (ingresos)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RBarChart data={serviciosMasVendidos}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="servicio" />
                    <YAxis />
                    <Tooltip formatter={(v: any) => [fmtMoney(Number(v)), "Ventas"]} />
                    <Bar dataKey="ventas" fill="#8884d8" />
                  </RBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribución por Servicio</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={serviciosMasVendidos}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="ventas"
                      label={({ servicio, percent }: any) => `${servicio} ${(percent * 100).toFixed(0)}%`}
                    >
                      {serviciosMasVendidos.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [fmtMoney(Number(v)), "Ventas"]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== Clientes ===== */}
        <TabsContent value="clientes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Clientes más valiosos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topClientes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Sin datos en el rango</p>
                ) : (
                  topClientes.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{c.nombre}</p>
                        <p className="text-sm text-muted-foreground">{c.visitas} compras</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{fmtMoney(c.gastoTotal)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Productos ===== */}
        <TabsContent value="productos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Productos más vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productosVendidos.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Sin datos en el rango</p>
                ) : (
                  productosVendidos.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{p.producto}</p>
                        <p className="text-sm text-muted-foreground">Cantidad vendida: {p.cantidad}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{fmtMoney(p.ingresos)}</p>
                        <p className="text-sm text-muted-foreground">Ingresos</p>
                      </div>
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
