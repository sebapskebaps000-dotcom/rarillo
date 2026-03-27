require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');
const Groq = require('groq-sdk');

const app = express();
app.use(cors());
app.use(express.json());

// === CONFIGURACIONES ===
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gmlgffpyvesaxhckpicu.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'tu_anon_key_aqui';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Almacén temporal de transportes SMTP para no recrearlos cada vez (Opcional)
const transporters = {};

// === ENDPOINTS BÁSICOS ===
app.get('/', (req, res) => {
    res.send({ status: 'Mail Agent Motor ONLINE', version: '1.0.0' });
});

// Endpoint manual para forzar la lectura de tareas pendientes y enviar
app.post('/api/trigger-send', async (req, res) => {
    // Aquí implementaremos la lógica que busca funciones "ENVIAR" activas
    // compilará los emails con NodeMailer y llamará a Groq si hace falta un toque final.
    res.send({ message: 'Trigger ejecutado (En construcción)' });
});

// === WORKER (CRON) ===
// Ejecutar cada minuto buscando correos pendientes en una supuesta tabla "cola_envios" (a crear después)
cron.schedule('* * * * *', async () => {
    console.log('[Worker] Comprobando tareas pendientes de envío...');
    // Lógica futura del motor
});

app.listen(PORT, () => {
    console.log(`🚀 Motor Node.js corriendo en el puerto ${PORT}`);
});
