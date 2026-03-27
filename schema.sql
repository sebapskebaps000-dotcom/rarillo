-- EJECUTA ESTE CÓDIGO EN EL SQL EDITOR DE TU PANEL DE SUPABASE (https://supabase.com/dashboard/project/gmlgffpyvesaxhckpicu/sql/new) -> PÉGALO Y DALE AL BOTÓN RUN (VERDE)

-- 1. Habilitar extensión UUID por defecto
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Crear tabla principal: Negocios
CREATE TABLE IF NOT EXISTS businesses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    email TEXT
);

-- 3. Crear tabla secundaria: Funciones
CREATE TABLE IF NOT EXISTS functions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    prompt TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVO',
    recipients JSONB DEFAULT '[]'::jsonb
);

-- 4. Crear tabla secundaria: Personas
CREATE TABLE IF NOT EXISTS people (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    status TEXT DEFAULT 'WAIT',
    date TEXT
);

-- 5. Crear tabla secundaria: Registros (Logs)
CREATE TABLE IF NOT EXISTS logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    status TEXT NOT NULL,
    timestamp TEXT NOT NULL
);

-- 6. Desactivar RLS temporalmente para simplificar la Fase de Prototipo (se activará en producción segura)
ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE functions DISABLE ROW LEVEL SECURITY;
ALTER TABLE people DISABLE ROW LEVEL SECURITY;
ALTER TABLE logs DISABLE ROW LEVEL SECURITY;
