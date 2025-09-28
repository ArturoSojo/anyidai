// app/config/regions.ts

export type CountryOption = {
  code: string
  name: string
  defaultCurrency: string
  defaultTimezone: string
}

export type CurrencyOption = {
  code: string
  label: string
}

export type TimezoneOption = {
  id: string
  label: string
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'VE', name: 'Venezuela',        defaultCurrency: 'VES', defaultTimezone: 'America/Caracas' },
  { code: 'MX', name: 'México',           defaultCurrency: 'MXN', defaultTimezone: 'America/Mexico_City' },
  { code: 'US', name: 'Estados Unidos',   defaultCurrency: 'USD', defaultTimezone: 'America/New_York' },
  { code: 'CO', name: 'Colombia',         defaultCurrency: 'COP', defaultTimezone: 'America/Bogota' },
  { code: 'ES', name: 'España',           defaultCurrency: 'EUR', defaultTimezone: 'Europe/Madrid' },
]

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'VES', label: 'Bolívar Venezolano (VES)' },
  { code: 'MXN', label: 'Peso Mexicano (MXN)' },
  { code: 'USD', label: 'Dólar Americano (USD)' },
  { code: 'COP', label: 'Peso Colombiano (COP)' },
  { code: 'EUR', label: 'Euro (EUR)' },
]

// Primero Caracas para que aparezca arriba
export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { id: 'America/Caracas',     label: 'Caracas (GMT-4)' },
  { id: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
  { id: 'America/New_York',    label: 'Nueva York (GMT-5)' },
  { id: 'America/Bogota',      label: 'Bogotá (GMT-5)' },
  { id: 'Europe/Madrid',       label: 'Madrid (GMT+1)' },
]

// Utilidad: obtener defaults por país
export const COUNTRY_DEFAULTS = Object.fromEntries(
  COUNTRY_OPTIONS.map(c => [c.name, { currency: c.defaultCurrency, timezone: c.defaultTimezone }])
)
