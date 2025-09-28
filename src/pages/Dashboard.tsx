import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  Scissors, 
  TrendingUp,
  TrendingDown,
  Clock,
  Package,
  AlertTriangle,
  Star,
  Award,
  Target
} from 'lucide-react';

// Datos de ejemplo para Anyidai
const kpiData = {
  ventasHoy: 2850,
  ventasAyer: 2450,
  clientesHoy: 18,
  clientesAyer: 15,
  citasHoy: 22,
  citasPendientes: 8,
  ingresosMes: 85400,
  ingresosMesAnterior: 78200,
  ocupacionPromedio: 76,
  ticketPromedio: 158,
  clientesNuevos: 5,
  productosPocoStock: 3
};

const ventasHoy = [
  { hora: '09:00', ventas: 450, citas: 3 },
  { hora: '10:00', ventas: 680, citas: 4 },
  { hora: '11:00', ventas: 320, citas: 2 },
  { hora: '12:00', ventas: 590, citas: 3 },
  { hora: '13:00', ventas: 0, citas: 0 },
  { hora: '14:00', ventas: 420, citas: 2 },
  { hora: '15:00', ventas: 390, citas: 3 },
  { hora: '16:00', ventas: 0, citas: 5 }
];

const serviciosPopulares = [
  { servicio: 'Corte + Peinado', cantidad: 8, ingresos: 2400, color: '#EC407A' },
  { servicio: 'Coloración', cantidad: 4, ingresos: 1600, color: '#7B1FA2' },
  { servicio: 'Barba + Bigote', cantidad: 6, ingresos: 900, color: '#1976D2' },
  { servicio: 'Tratamiento Capilar', cantidad: 3, ingresos: 750, color: '#00BCD4' },
  { servicio: 'Peinado Evento', cantidad: 2, ingresos: 600, color: '#F8D7DA' }
];

const equipoBarberos = [
  { nombre: 'Carlos Méndez', ventasHoy: 1200, citasHoy: 8, calificacion: 4.9, especialidad: 'Cortes Modernos' },
  { nombre: 'Ana Rivera', ventasHoy: 980, citasHoy: 6, calificacion: 4.8, especialidad: 'Coloración' },
  { nombre: 'Luis Torres', ventasHoy: 670, citasHoy: 5, calificacion: 4.7, especialidad: 'Barba & Bigote' }
];

const citasProximas = [
  { hora: '16:30', cliente: 'María González', servicio: 'Corte + Peinado', barbero: 'Carlos', duracion: 45 },
  { hora: '17:00', cliente: 'José Ramírez', servicio: 'Barba', barbero: 'Luis', duracion: 30 },
  { hora: '17:30', cliente: 'Carmen Silva', servicio: 'Coloración', barbero: 'Ana', duracion: 90 },
  { hora: '18:00', cliente: 'Diego Morales', servicio: 'Corte', barbero: 'Carlos', duracion: 30 }
];

const alertas = [
  { tipo: 'stock', mensaje: 'Shampoo Premium: Solo quedan 2 unidades', prioridad: 'alta' },
  { tipo: 'cita', mensaje: 'Cita de las 16:00 reagendada', prioridad: 'media' },
  { tipo: 'inventario', mensaje: 'Tinte Castaño próximo a vencer (15 días)', prioridad: 'baja' }
];

export function Dashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('hoy');

  const calcularCambio = (actual: number, anterior: number) => {
    return ((actual - anterior) / anterior * 100).toFixed(1);
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'alta': return 'bg-red-100 text-red-800 border-red-200';
      case 'media': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'baja': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      
      {/* Header con saludo */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-pink-500 rounded-xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">¡Buen día! 👋</h1>
            <p className="text-purple-100">
              Aquí tienes el resumen de hoy para Anyidai Beauty & Style
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-purple-100">Hoy</p>
            <p className="text-xl font-semibold">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-pink-600">Ventas de Hoy</p>
                <p className="text-2xl font-bold text-pink-800">${kpiData.ventasHoy.toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  <span className="text-xs text-green-600">
                    +{calcularCambio(kpiData.ventasHoy, kpiData.ventasAyer)}% vs ayer
                  </span>
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
                <p className="text-2xl font-bold text-purple-800">{kpiData.clientesHoy}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  <span className="text-xs text-green-600">
                    +{calcularCambio(kpiData.clientesHoy, kpiData.clientesAyer)}% vs ayer
                  </span>
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
                <p className="text-2xl font-bold text-blue-800">{kpiData.citasHoy}</p>
                <p className="text-xs text-blue-600">{kpiData.citasPendientes} pendientes</p>
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
                <p className="text-2xl font-bold text-cyan-800">{kpiData.ocupacionPromedio}%</p>
                <Progress value={kpiData.ocupacionPromedio} className="mt-2 h-2" />
              </div>
              <div className="p-3 bg-cyan-200 rounded-full">
                <Target className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ventas del Día */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Ventas del Día
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={ventasHoy}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hora" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'ventas' ? `$${value}` : value,
                    name === 'ventas' ? 'Ventas' : 'Citas'
                  ]}
                  labelStyle={{ color: '#333' }}
                />
                <Line type="monotone" dataKey="ventas" stroke="#7B1FA2" strokeWidth={3} dot={{ fill: '#7B1FA2', strokeWidth: 2, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Servicios Populares */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5 text-pink-600" />
              Servicios de Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={serviciosPopulares}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="cantidad"
                  label={({ servicio, cantidad }) => `${cantidad}`}
                >
                  {serviciosPopulares.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => [`${value} servicios`, props.payload.servicio]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equipo de Barberos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-cyan-600" />
              Rendimiento del Equipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {equipoBarberos.map((barbero, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-semibold">
                      {barbero.nombre.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-medium">{barbero.nombre}</p>
                      <p className="text-sm text-gray-600">{barbero.especialidad}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 mb-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span className="text-sm font-medium">{barbero.calificacion}</span>
                    </div>
                    <p className="text-sm font-semibold text-green-600">${barbero.ventasHoy}</p>
                    <p className="text-xs text-gray-500">{barbero.citasHoy} citas</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Próximas Citas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Próximas Citas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {citasProximas.map((cita, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
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
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas y Notificaciones */}
      {alertas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Alertas y Notificaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alertas.map((alerta, index) => (
                <div key={index} className={`p-3 rounded-lg border ${getPrioridadColor(alerta.prioridad)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5" />
                      <p className="text-sm">{alerta.mensaje}</p>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {alerta.prioridad}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas del Mes */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Ingresos del Mes</p>
            <p className="text-xl font-bold">${kpiData.ingresosMes.toLocaleString()}</p>
            <p className="text-xs text-green-600">
              +{calcularCambio(kpiData.ingresosMes, kpiData.ingresosMesAnterior)}% vs mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Ticket Promedio</p>
            <p className="text-xl font-bold">${kpiData.ticketPromedio}</p>
            <p className="text-xs text-blue-600">Por cliente</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Star className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Clientes Nuevos</p>
            <p className="text-xl font-bold">{kpiData.clientesNuevos}</p>
            <p className="text-xs text-purple-600">Esta semana</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Package className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Stock Bajo</p>
            <p className="text-xl font-bold">{kpiData.productosPocoStock}</p>
            <p className="text-xs text-orange-600">Productos</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}