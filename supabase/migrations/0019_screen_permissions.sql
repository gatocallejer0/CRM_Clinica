-- Fase 2 de Roles y permisos: hasta ahora `role_screens` solo controlaba
-- navegación (requireScreen en las páginas). Las Server Actions y las
-- policies de RLS seguían revisando arrays de nombres de rol hardcodeados
-- (has_role(array['Admin', 'Doctor'])), así que un rol nuevo con una
-- pantalla habilitada podía verla pero no usarla — ni crear/editar nada, ni
-- en varios casos ver los datos (RLS los filtraba en silencio).
--
-- has_screen() generaliza has_role() de la misma forma: en vez de nombres de
-- rol fijos, revisa si el rol del usuario tiene esa pantalla en
-- `role_screens` (Admin siempre pasa, igual que en requireScreen()).

create or replace function public.has_screen(screen_keys text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where p.id = auth.uid()
      and p.active
      and (
        r.name = 'Admin'
        or exists (
          select 1 from public.role_screens rs
          where rs.role_id = p.role_id and rs.screen_key = any(screen_keys)
        )
      )
  );
$$;

comment on function public.has_screen is 'Generaliza has_role(): true si el rol activo del usuario tiene alguna de estas pantallas habilitada en role_screens (Admin siempre true, igual que requireScreen() en el servidor).';

-- ── Agenda ───────────────────────────────────────────────────────────────
-- services también lo necesitan Catálogo (admin.catalogo) y Cobros (cobros)
-- para sus propios selectores — de ahí las tres pantallas.

drop policy "profiles: active staff can read doctors" on public.profiles;
create policy "profiles: active staff can read doctors"
  on public.profiles for select
  to authenticated
  using (
    active
    and exists (select 1 from public.roles r where r.id = role_id and r.name = 'Doctor')
    and public.has_screen(array['agenda'])
  );

drop policy "services: active staff can select" on public.services;
create policy "services: active staff can select"
  on public.services for select
  to authenticated
  using (public.has_screen(array['agenda', 'admin.catalogo', 'cobros']));

drop policy "appointments: scheduling staff can select" on public.appointments;
create policy "appointments: scheduling staff can select"
  on public.appointments for select
  to authenticated
  using (public.has_screen(array['agenda']));

drop policy "appointments: scheduling staff can insert" on public.appointments;
create policy "appointments: scheduling staff can insert"
  on public.appointments for insert
  to authenticated
  with check (public.has_screen(array['agenda']));

drop policy "appointments: scheduling staff can update" on public.appointments;
create policy "appointments: scheduling staff can update"
  on public.appointments for update
  to authenticated
  using (public.has_screen(array['agenda']));

-- ── Pacientes (expediente clínico) ─────────────────────────────────────────

drop policy "clinical_records: clinical staff can select" on public.clinical_records;
create policy "clinical_records: clinical staff can select"
  on public.clinical_records for select
  to authenticated
  using (public.has_screen(array['pacientes']));

drop policy "clinical_records: clinical staff can insert" on public.clinical_records;
create policy "clinical_records: clinical staff can insert"
  on public.clinical_records for insert
  to authenticated
  with check (public.has_screen(array['pacientes']));

drop policy "clinical_records: clinical staff can update" on public.clinical_records;
create policy "clinical_records: clinical staff can update"
  on public.clinical_records for update
  to authenticated
  using (public.has_screen(array['pacientes']));

drop policy "clinical_documents: clinical staff can select" on public.clinical_documents;
create policy "clinical_documents: clinical staff can select"
  on public.clinical_documents for select
  to authenticated
  using (public.has_screen(array['pacientes']));

drop policy "clinical_documents: clinical staff can insert" on public.clinical_documents;
create policy "clinical_documents: clinical staff can insert"
  on public.clinical_documents for insert
  to authenticated
  with check (public.has_screen(array['pacientes']));

drop policy "clinical_documents: clinical staff can delete" on public.clinical_documents;
create policy "clinical_documents: clinical staff can delete"
  on public.clinical_documents for delete
  to authenticated
  using (public.has_screen(array['pacientes']));

drop policy "clinical-documents bucket: clinical staff can select" on storage.objects;
create policy "clinical-documents bucket: clinical staff can select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'clinical-documents' and public.has_screen(array['pacientes']));

drop policy "clinical-documents bucket: clinical staff can insert" on storage.objects;
create policy "clinical-documents bucket: clinical staff can insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'clinical-documents' and public.has_screen(array['pacientes']));

drop policy "clinical-documents bucket: clinical staff can delete" on storage.objects;
create policy "clinical-documents bucket: clinical staff can delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'clinical-documents' and public.has_screen(array['pacientes']));

-- ── Cobros y pagos ─────────────────────────────────────────────────────────
-- products también lo necesita Catálogo (admin.catalogo) para su propio
-- selector/edición; sales y sale_items solo los lee Cobros.

drop policy "products: reception can select" on public.products;
create policy "products: reception can select"
  on public.products for select
  to authenticated
  using (public.has_screen(array['admin.catalogo', 'cobros']));

drop policy "sales: reception can select" on public.sales;
create policy "sales: reception can select"
  on public.sales for select
  to authenticated
  using (public.has_screen(array['cobros']));

drop policy "sale_items: reception can select" on public.sale_items;
create policy "sale_items: reception can select"
  on public.sale_items for select
  to authenticated
  using (public.has_screen(array['cobros']));

-- ── Catálogo e inventario (crear/editar) ───────────────────────────────────
-- Las policies "... admin can manage" (for all) de sales/sale_items NO se
-- tocan: create_sale/update_sale_status son security definer y las
-- bypasean; esa policy es solo defensa en profundidad para Admin, no la
-- usa ningún flujo real.

drop policy "products: admin can manage" on public.products;
create policy "products: admin can manage"
  on public.products for all
  to authenticated
  using (public.has_screen(array['admin.catalogo']))
  with check (public.has_screen(array['admin.catalogo']));

drop policy "services: admin can insert" on public.services;
create policy "services: admin can insert"
  on public.services for insert
  to authenticated
  with check (public.has_screen(array['admin.catalogo']));

drop policy "services: admin can update" on public.services;
create policy "services: admin can update"
  on public.services for update
  to authenticated
  using (public.has_screen(array['admin.catalogo']));

-- ── Formulario de pacientes ────────────────────────────────────────────────

drop policy "form_fields: admin can insert" on public.form_fields;
create policy "form_fields: admin can insert"
  on public.form_fields for insert
  to authenticated
  with check (public.has_screen(array['admin.formulario']));

drop policy "form_fields: admin can update" on public.form_fields;
create policy "form_fields: admin can update"
  on public.form_fields for update
  to authenticated
  using (public.has_screen(array['admin.formulario']));

drop policy "form_fields: admin can delete" on public.form_fields;
create policy "form_fields: admin can delete"
  on public.form_fields for delete
  to authenticated
  using (public.has_screen(array['admin.formulario']));

drop policy "form_field_options: admin can insert" on public.form_field_options;
create policy "form_field_options: admin can insert"
  on public.form_field_options for insert
  to authenticated
  with check (public.has_screen(array['admin.formulario']));

drop policy "form_field_options: admin can update" on public.form_field_options;
create policy "form_field_options: admin can update"
  on public.form_field_options for update
  to authenticated
  using (public.has_screen(array['admin.formulario']));

drop policy "form_field_options: admin can delete" on public.form_field_options;
create policy "form_field_options: admin can delete"
  on public.form_field_options for delete
  to authenticated
  using (public.has_screen(array['admin.formulario']));
