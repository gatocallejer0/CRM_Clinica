-- CRM Clínica — edad gestacional medida en el ultrasonido de datación.
--
-- El ultrasonido no solo registra la fecha en que se hizo, sino la edad
-- gestacional que el equipo reportó en ese momento (semanas + días, por
-- biometría fetal). Con eso se puede calcular la edad gestacional actual y
-- la FPP de forma más confiable que con la FUM — igual que hacen las
-- calculadoras obstétricas estándar (pestaña "USG" además de "LMP").

alter table public.clinical_records
  add column if not exists ultrasound_weeks smallint,
  add column if not exists ultrasound_days smallint;

comment on column public.clinical_records.ultrasound_weeks is 'Edad gestacional en semanas reportada en el ultrasonido (biometría fetal), al momento de ultrasound_date.';
comment on column public.clinical_records.ultrasound_days is 'Días adicionales (0-6) de la edad gestacional reportada en el ultrasonido.';
