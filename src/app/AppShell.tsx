"use client";

import * as React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
    SidebarProvider,
    SidebarTrigger,
    SidebarInset,
} from "../components/ui/sidebar";
import { Button } from "../components/ui/button";
import {
    Moon,
    Sun,
    ArrowLeft,
    Users as UsersIcon,
    Settings as SettingsIcon,
    Bell,
    Search,
} from "lucide-react";
import { MainSidebar } from "../components/MainSidebar";
import { Badge } from "../components/ui/badge";

import { useBusiness } from "../app/providers/BusinessProvider";
import { useAuth } from "../app/providers/AuthProvider";
import { ROLE_LABELS } from "../app/roles";
import { PRIVILEGED_ROLES } from "../app/roles";
import { Input } from "../components/ui/input";

// Rutas que muestran el sidebar
const SIDEBAR_ROUTES = new Set([
    "dashboard",
    "clientes",
    "agenda",
    "inventario",
    "servicios",
    "pos",
    "reportes",
    "fidelizacion",
    "usuarios",
    "configuracion",
]);

function useDarkMode() {
    const [dark, setDark] = React.useState(
        () =>
            typeof window !== "undefined" &&
            document.documentElement.classList.contains("dark")
    );
    const toggle = () => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
    };
    return { dark, toggle };
}


// helper para clases de rol (mismo criterio que usas en otros componentes)
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white';
      case 'admin': return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
      case 'manager': return 'bg-gradient-to-r from-green-500 to-green-600 text-white';
      case 'staff': return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white';
      case 'guest': return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
export default function AppShell() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const segments = pathname.split("/").filter(Boolean);
    const section = segments[2] ?? "dashboard";
    const showSidebar = segments[0] === "business" && SIDEBAR_ROUTES.has(section);

    const { dark, toggle } = useDarkMode();

    const { business, role } = useBusiness(); // negocio activo y rol del usuario en ese negocio
    const { user, profile } = useAuth(); // info de usuario para avatar/nombre/email

    // permisos básicos: si el rol es privilegiado, puede ver usuarios/ajustes
    const canManage = PRIVILEGED_ROLES.includes(role as any);

    // basePath del negocio actual
    const basePath = business?.id ? `/business/${business.id}` : "/business";

    // navegación a módulos
    const goUsers = () => navigate(`${basePath}/usuarios`);
    const goSettings = () => navigate(`${basePath}/configuracion`);
    const goConsole = () => navigate("/");

    // datos de UI
    const roleLabel =
        ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? (role || "Invitado");

    const userName = profile?.name || user?.displayName || "Usuario";
    const userEmail = profile?.email || user?.email || "user@example.com";
    const userAvatarUrl = profile?.photoURL || user?.photoURL;

    return (
        <SidebarProvider>
            <div
                className={`flex min-h-screen bg-background transition-colors ${dark ? "dark" : ""
                    }`}
            >
                {showSidebar && <MainSidebar />}

                {/* Contenido con SidebarInset en rutas con sidebar */}
                {showSidebar ? (
                    <SidebarInset className="flex-1 w-full min-w-0 overflow-x-hidden">
                        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
                            <div className="flex h-16 items-center justify-between px-4 lg:px-6">
                                {/* Izquierda: volver a Consola + nombre/rol/dirección + (en mobile) trigger de sidebar */}
                                <div className="flex items-center gap-3 lg:gap-4 min-w-0">
                                    <SidebarTrigger className="lg:hidden" />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={goConsole}
                                        className="gap-2"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Consola
                                    </Button>

                                    <div className="hidden h-6 w-px bg-border md:block" />


                                </div>

                                {/* Centro: buscador (solo >= md) */}
                                <div className="mx-2 hidden w-full max-w-md items-center md:flex">
                                    <div className="min-w-20">
                                 
                                        <div className="mt-1 flex items-center gap-2">
                                            <Badge className={getRoleColor(role)}>
                                                {roleLabel}
                                            </Badge>
                                
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar..."
                                            //   value={searchTerm}
                                            // onChange={(e) => setSearch(e.target.value)}
                                            className="pl-10 w-64"
                                        />
                                    </div>

                                </div>

                                {/* Derecha: acciones */}
                                <div className="ml-auto flex items-center gap-1.5 lg:gap-2">
                                    <Button variant="ghost" size="sm" aria-label="Notificaciones">
                                        <Bell className="h-4 w-4" />
                                    </Button>

                                    {canManage && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={goUsers}
                                            aria-label="Usuarios"
                                        >
                                            <UsersIcon className="h-4 w-4" />
                                        </Button>
                                    )}

                                    {canManage && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={goSettings}
                                            aria-label="Configuración"
                                        >
                                            <SettingsIcon className="h-4 w-4" />
                                        </Button>
                                    )}

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={toggle}
                                        aria-label="Tema"
                                    >
                                        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                                    </Button>

                                    {/* Usuario */}
                                    <div className="flex items-center gap-2 pl-1">
                                        <img
                                            src={
                                                userAvatarUrl ||
                                                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                                    userName
                                                )}&background=E5E7EB&color=111827`
                                            }
                                            alt={userName}
                                            className="h-8 w-8 rounded-full ring-1 ring-border"
                                        />
                                        <div className="hidden text-right leading-tight md:block">
                                            <p className="text-sm font-medium">{userName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {userEmail}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </header>

                        <div className="w-full max-w-full p-6">
                            <Outlet />
                        </div>
                    </SidebarInset>
                ) : (
                    <main className="flex-1 w-full min-w-0 min-h-screen">
                        <div className="w-full max-w-full p-6">
                            <Outlet />
                        </div>
                    </main>
                )}
            </div>
        </SidebarProvider>
    );
}
