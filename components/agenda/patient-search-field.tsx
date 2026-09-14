"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { searchPatients, type PatientOption } from "@/app/actions/appointments";
import { Input } from "@/components/ui/input";

export function PatientSearchField({
  name,
  initialPatient,
  required = true,
  placeholder = "Buscar por nombre o correo...",
}: {
  name: string;
  initialPatient?: PatientOption;
  required?: boolean;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(initialPatient?.full_name ?? "");
  const [results, setResults] = useState<PatientOption[]>([]);
  const [selected, setSelected] = useState<PatientOption | null>(initialPatient ?? null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Se incrementa en cada tecla para poder descartar una respuesta que
  // llegue tarde (ej. la búsqueda de "mar" resuelve después que "maria") sin
  // pisar el resultado más reciente.
  const requestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    setSelected(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    // Espera a que la usuaria haga una pausa antes de consultar al
    // servidor — sin esto, cada tecla dispara su propia búsqueda contra
    // Supabase.
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const data = await searchPatients(value);
        if (requestId !== requestIdRef.current) return;
        setResults(data);
        setOpen(true);
      });
    }, 250);
  }

  function handleSelect(patient: PatientOption) {
    setSelected(patient);
    setQuery(patient.full_name);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selected?.id ?? ""} required={required} />
      <Input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && (
        <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-20 max-h-56 overflow-y-auto rounded-xl bg-popover p-1 shadow-[var(--shadow-glass-lg)] ring-1 ring-white/80 backdrop-blur-xl">
          {pending && <p className="px-3 py-2 text-xs text-muted-foreground">Buscando...</p>}
          {!pending && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">Sin resultados.</p>
          )}
          {!pending &&
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleSelect(r)}
                className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span className="font-medium">{r.full_name}</span>
                <span className="text-xs text-muted-foreground">{r.email}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
