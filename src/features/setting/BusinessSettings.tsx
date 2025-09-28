import { useEffect, useState } from 'react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Badge } from '../../components/ui/badge'
import { Settings, Building2, Globe, Bell, Shield, Trash2, Save, Upload, AlertTriangle } from 'lucide-react'

import { useBusiness } from '../../app/providers/BusinessProvider'
import { ROLE } from '../../app/roles'

// ⬇️ NUEVO: opciones centralizadas y select reutilizable
import { NativeSelect } from '../../components/common/NativeSelect'
import { COUNTRY_OPTIONS, CURRENCY_OPTIONS, TIMEZONE_OPTIONS, COUNTRY_DEFAULTS } from '../../app/config/regions'

export function BusinessSettings() {
  const { business, role } = useBusiness()
  const isOwner = role === ROLE.Owner

  const [isUpdating, setIsUpdating] = useState(false)
  const [formData, setFormData] = useState({
    name: business?.name || '',
    description: (business as any)?.description || '',
    address: (business as any)?.settings?.address || '',
    phone: (business as any)?.settings?.phone || '',
    email: (business as any)?.settings?.email || '',
    // ⬇️ Defaults con Venezuela primero
    currency: (business as any)?.settings?.currency || 'VES',
    timezone: (business as any)?.settings?.timezone || 'America/Caracas',
    country: (business as any)?.settings?.country || 'Venezuela',
  })

  useEffect(() => {
    if (!business) return
    setFormData({
      name: business.name || '',
      description: (business as any)?.description || '',
      address: (business as any)?.settings?.address || '',
      phone: (business as any)?.settings?.phone || '',
      email: (business as any)?.settings?.email || '',
      currency: (business as any)?.settings?.currency || 'VES',
      timezone: (business as any)?.settings?.timezone || 'America/Caracas',
      country: (business as any)?.settings?.country || 'Venezuela',
    })
  }, [business])

  const handleSaveGeneral = async () => {
    if (!business) return
    setIsUpdating(true)
    try {
      await setDoc(
        doc(db, 'businesses', business.id),
        {
          name: formData.name,
          description: formData.description,
          updatedAt: serverTimestamp(),
          settings: {
            ...(business as any)?.settings,
            address: formData.address,
            phone: formData.phone,
            email: formData.email,
            currency: formData.currency,
            timezone: formData.timezone,
            country: formData.country,
          },
        },
        { merge: true }
      )
    } catch (error) {
      console.error('Error updating business:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  // Al cambiar país, sugerimos moneda y timezone por defecto (se pueden sobreescribir después)
  const handleCountryChange = (countryName: string) => {
    const defaults = COUNTRY_DEFAULTS[countryName]
    setFormData((prev) => ({
      ...prev,
      country: countryName,
      currency: defaults?.currency ?? prev.currency,
      timezone: defaults?.timezone ?? prev.timezone,
    }))
  }

  const handleDeleteBusiness = () => {
    if (!isOwner) return
    const confirmation = prompt(`Para eliminar el negocio "${business?.name}", escribe: ELIMINAR`)
    if (confirmation === 'ELIMINAR') {
      console.log('Eliminar negocio (pendiente implementar):', business?.id)
      alert('Funcionalidad de eliminación pendiente de implementar')
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 md:px-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configuración del Negocio</h2>
          <p className="text-gray-600">Gestiona la configuración de {business?.name}</p>
        </div>
        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white w-fit">
          {business?.id}
        </Badge>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="w-full overflow-x-auto flex gap-2 md:grid md:grid-cols-5">
          <TabsTrigger value="general" className="flex-1 min-w-max">
            <Settings className="mr-2 h-4 w-4" /> General
          </TabsTrigger>
          <TabsTrigger value="localizacion" className="flex-1 min-w-max">
            <Globe className="mr-2 h-4 w-4" /> Localización
          </TabsTrigger>
          <TabsTrigger value="notificaciones" className="flex-1 min-w-max">
            <Bell className="mr-2 h-4 w-4" /> Notificaciones
          </TabsTrigger>
          <TabsTrigger value="seguridad" className="flex-1 min-w-max">
            <Shield className="mr-2 h-4 w-4" /> Seguridad
          </TabsTrigger>
          <TabsTrigger value="peligro" className="flex-1 min-w-max">
            <AlertTriangle className="mr-2 h-4 w-4" /> Zona Peligrosa
          </TabsTrigger>
        </TabsList>

        {/* GENERAL */}
        <TabsContent value="general" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" /> Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Nombre del Negocio</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="email">Email de Contacto</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Describe tu salón de belleza..."
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+58 212 0000000" />
                </div>
                <div>
                  <Label htmlFor="address">Dirección</Label>
                  <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Dirección completa" />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveGeneral} disabled={isUpdating} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  <Save className="mr-2 h-4 w-4" />
                  {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Logo del Negocio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-pink-600">
                  <Building2 className="h-10 w-10 text-white" />
                </div>
                <div className="flex-1">
                  <p className="mb-3 text-sm text-gray-600">Sube un logo para personalizar tu negocio. Tamaño recomendado: 200×200px</p>
                  <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" /> Subir Logo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOCALIZACIÓN */}
        <TabsContent value="localizacion" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" /> Configuración Regional
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="country">País</Label>
                  <NativeSelect
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleCountryChange(e.target.value)}
                  >
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div>
                  <Label htmlFor="currency">Moneda</Label>
                  <NativeSelect
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div>
                  <Label htmlFor="timezone">Zona Horaria</Label>
                  <NativeSelect
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  >
                    {TIMEZONE_OPTIONS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveGeneral} disabled={isUpdating} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  <Save className="mr-2 h-4 w-4" /> Guardar Configuración
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOTIFICACIONES */}
        <TabsContent value="notificaciones" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" /> Configuración de Notificaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">Recordatorios de Citas</p>
                    <p className="text-sm text-gray-500">Enviar recordatorios automáticos a clientes</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-5 w-5" />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">Alertas de Stock Bajo</p>
                    <p className="text-sm text-gray-500">Notificar cuando productos estén por agotarse</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-5 w-5" />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">Cumpleaños de Clientes</p>
                    <p className="text-sm text-gray-500">Recordatorios automáticos de cumpleaños</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-5 w-5" />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">Reportes Diarios</p>
                    <p className="text-sm text-gray-500">Resumen diario de ventas y citas</p>
                  </div>
                  <input type="checkbox" className="h-5 w-5" />
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEGURIDAD */}
        <TabsContent value="seguridad" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" /> Seguridad y Privacidad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-green-50 p-4">
                <h4 className="mb-2 font-medium text-green-800">✅ Configuración de Seguridad</h4>
                <ul className="space-y-1 text-sm text-green-700">
                  <li>• Autenticación con Google activada</li>
                  <li>• Roles y permisos configurados</li>
                  <li>• Datos encriptados en tránsito y reposo</li>
                  <li>• Backups automáticos diarios</li>
                </ul>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">Autenticación de Dos Factores</p>
                    <p className="text-sm text-gray-500">Protección adicional para tu cuenta</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Activado</Badge>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">Logs de Actividad</p>
                    <p className="text-sm text-gray-500">Registro de todas las acciones</p>
                  </div>
                  <Button variant="outline" size="sm">Ver Logs</Button>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">Exportar Datos</p>
                    <p className="text-sm text-gray-500">Descarga una copia de todos tus datos</p>
                  </div>
                  <Button variant="outline" size="sm">Exportar</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ZONA PELIGROSA */}
        <TabsContent value="peligro" className="space-y-6">
          {isOwner ? (
            <Card className="rounded-2xl border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" /> Zona Peligrosa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-red-50 p-4">
                  <h4 className="mb-2 font-medium text-red-800">⚠️ Eliminar Negocio</h4>
                  <p className="mb-4 text-sm text-red-700">
                    Esta acción eliminará permanentemente el negocio, todos los datos,
                    usuarios y configuraciones. No se puede deshacer.
                  </p>
                  <Button variant="destructive" onClick={handleDeleteBusiness} className="bg-red-600 hover:bg-red-700">
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar Negocio
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl border-yellow-200">
              <CardContent className="p-6 text-center">
                <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-yellow-500" />
                <h3 className="mb-2 text-lg font-semibold text-gray-800">Acceso Restringido</h3>
                <p className="text-gray-600">Solo el propietario del negocio puede acceder a la configuración de eliminación.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
