"use client"
import * as React from "react"
import { onSnapshot, collection, query, orderBy } from "firebase/firestore"
import { db } from "../lib/firebase"
import { Button } from "./ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command"
import { Check, ChevronsUpDown, Mail, Phone, User } from "lucide-react"
import { cn } from "./ui/utils"

export type CustomerLite = {
  id: string
  nombre: string
  telefono?: string
  email?: string
}

type Props = {
  value?: CustomerLite | null
  onSelect: (c: CustomerLite) => void
  placeholder?: string
  disabled?: boolean
}

export function CustomerPicker({ value, onSelect, placeholder = "Buscar cliente...", disabled }: Props) {
  const [open, setOpen] = React.useState(false)
  const [customers, setCustomers] = React.useState<CustomerLite[]>([])
  const [search, setSearch] = React.useState("")

  React.useEffect(() => {
    // Sencillo: trae todos (orden por nombre). Si tu colección crece, podemos paginar o indexar.
    const q = query(collection(db, "customers"), orderBy("nombre"))
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => {
        const data = d.data() as any
        return {
          id: d.id,
          nombre: data.nombre || "",
          telefono: data.telefono,
          email: data.email,
        } as CustomerLite
      })
      setCustomers(rows)
    })
    return () => unsub()
  }, [])

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return customers
    return customers.filter(
      c =>
        c.nombre.toLowerCase().includes(term) ||
        (c.telefono || "").toLowerCase().includes(term) ||
        (c.email || "").toLowerCase().includes(term),
    )
  }, [customers, search])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="flex items-center gap-2 truncate">
            <User className="h-4 w-4 text-muted-foreground" />
            {value ? value.nombre : "Seleccionar cliente"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Sin resultados</CommandEmpty>
            <CommandGroup heading="Clientes">
              {filtered.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  onSelect={() => {
                    onSelect(c)
                    setOpen(false)
                  }}
                  className="flex items-start gap-2"
                >
                  <Check
                    className={cn(
                      "h-4 w-4 mt-0.5",
                      value?.id === c.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.nombre}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      {c.telefono && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {c.telefono}
                        </span>
                      )}
                      {c.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {c.email}
                        </span>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
