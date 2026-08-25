-- CRM Clínica — Documentos clínicos adjuntos (imágenes, PDFs: ultrasonidos,
-- resultados de laboratorio, etc.), uno por paciente en general — no ligados
-- a una visita/registro clínico específico.

create table if not exists public.clinical_documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  description text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.clinical_documents is 'Metadatos de documentos clínicos adjuntos a una paciente — el archivo en sí vive en el bucket de Storage "clinical-documents".';

create index if not exists clinical_documents_patient_idx on public.clinical_documents (patient_id, created_at desc);

alter table public.clinical_documents enable row level security;

-- Mismo criterio que clinical_records: solo Admin y Doctor ven documentos
-- clínicos — Recepción no tiene acceso al expediente clínico en absoluto.
create policy "clinical_documents: clinical staff can select"
  on public.clinical_documents for select
  to authenticated
  using (public.has_role(array['Admin', 'Doctor']));

create policy "clinical_documents: clinical staff can insert"
  on public.clinical_documents for insert
  to authenticated
  with check (public.has_role(array['Admin', 'Doctor']));

create policy "clinical_documents: clinical staff can delete"
  on public.clinical_documents for delete
  to authenticated
  using (public.has_role(array['Admin', 'Doctor']));

-- ── Storage bucket ────────────────────────────────────────────────────────
-- Privado a propósito: son documentos clínicos sensibles. El acceso siempre
-- pasa por una URL firmada de corta duración generada del lado del
-- servidor después de validar el rol — nunca una URL pública permanente.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clinical-documents',
  'clinical-documents',
  false,
  20971520, -- 20 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do nothing;

create policy "clinical-documents bucket: clinical staff can select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'clinical-documents' and public.has_role(array['Admin', 'Doctor']));

create policy "clinical-documents bucket: clinical staff can insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'clinical-documents' and public.has_role(array['Admin', 'Doctor']));

create policy "clinical-documents bucket: clinical staff can delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'clinical-documents' and public.has_role(array['Admin', 'Doctor']));
