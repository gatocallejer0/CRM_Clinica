-- CRM Clínica — fecha probable de parto y fecha de ultrasonido en el
-- registro clínico. Junto con la FUM (last_menstrual_period, ya existente),
-- estos campos permiten calcular la fecha gestacional con la Regla de
-- Naegele (FPP = FUM + 280 días). El campo "medication" (ya existente,
-- pensado para receta) pasa a usarse en la UI como la "Receta" de la
-- visita.

alter table public.clinical_records
  add column if not exists estimated_due_date date,
  add column if not exists ultrasound_date date;

comment on column public.clinical_records.estimated_due_date is 'Fecha probable de parto (FPP). Si está presente, tiene prioridad sobre la FUM para calcular la fecha gestacional.';
comment on column public.clinical_records.ultrasound_date is 'Fecha del ultrasonido de datación. Informativo — no se usa en el cálculo de la fecha gestacional.';
comment on column public.clinical_records.medication is 'Receta médica de la visita (texto libre).';
