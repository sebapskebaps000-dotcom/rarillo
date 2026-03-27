require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Cliente BBDD Remota
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Cliente de Correos Reales
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Endpoint manual de test o forzado desde el FrontEnd
app.get('/api/run', async (req, res) => {
    try {
        await processEmails();
        res.send({ status: 'OK', message: 'Ciclo de lectura y envío completado' });
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
});

// Endpoint proxy para Groq API
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, model, temperature } = req.body;
        if (!process.env.GROQ_API_KEY) {
            return res.status(500).json({ error: "Missing GROQ_API_KEY in backend" });
        }
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ 
                messages: messages || [], 
                model: model || 'llama3-8b-8192', 
                temperature: temperature || 0.7 
            })
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Groq API error: ${response.status} ${errorData}`);
        }
        
        const data = await response.json();
        res.json(data);
    } catch (e) {
        console.error("Error en /api/chat:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// === EL MOTOR PRINCIPAL ===
async function processEmails() {
    console.log(`[${new Date().toLocaleTimeString()}] Escaneando Base de Datos buscando Funciones 'ACTIVO'...`);
    
    // Buscar funciones de tipo Enviar que no se hayan disparado aún
    const { data: operations, error } = await supabase
        .from('functions')
        .select('*')
        .eq('type', 'enviar')
        .eq('status', 'ACTIVO');
        
    if (error || !operations || operations.length === 0) {
        console.log("No hay operaciones pendientes.");
        return;
    }

    for (const op of operations) {
        if (!op.recipients || op.recipients.length === 0) {
            console.log(`Omitiendo Función ${op.name}: 0 destinatarios`);
            continue;
        }

        console.log(`⚡ Ejecutando Nodo: ${op.name} (${op.recipients.length} destinatarios)...`);
        let succeses = 0;

        for (const targetEmail of op.recipients) {
            try {
                // 1. Configurar y disparar email real por Gmail
                const mailOptions = {
                    from: `"Mail Agent IA" <${process.env.SMTP_USER}>`,
                    to: targetEmail,
                    subject: op.name,
                    text: op.prompt // El texto procesado por Groq previamente
                };

                await transporter.sendMail(mailOptions);

                // 2. Grabar Log Inmutable en BBDD
                await supabase.from('logs').insert({
                    business_id: op.business_id,
                    action: `Neural Send: ${op.name}`,
                    target: targetEmail,
                    status: 'OK',
                    timestamp: new Date().toISOString()
                });
                
                succeses++;
                console.log(` ✅ Enviado con éxito a -> ${targetEmail}`);

            } catch (err) {
                console.error(` ❌ Error mandando a ${targetEmail}:`, err.message);
                await supabase.from('logs').insert({
                    business_id: op.business_id,
                    action: `Send Failed: ${op.name}`,
                    target: targetEmail,
                    status: 'ERROR',
                    timestamp: new Date().toISOString()
                });
            }
        }

        // 3. Modificar el estado a 'COMPLETADO' para no re-enviarlo en el siguiente minuto
        if (succeses > 0) {
            await supabase.from('functions')
                .update({ status: 'COMPLETADO' })
                .eq('id', op.id);
            console.log(`Status de Función [${op.name}] actualizado a COMPLETADO.`);
        }
    }
}

// === SCHEDULER (CRON) ===
// Cazar nuevos envíos cada 1 minuto de forma autónoma
cron.schedule('* * * * *', processEmails);

app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 BACKEND MAIL AGENT MOTOR RUNNING OP=${PORT} `);
    console.log(`📧 SMTP Gmail Auth OK: ${process.env.SMTP_USER}`);
    console.log(`🧠 Conectado a Supabase Data Lake`);
    console.log(`===============================================`);
    
    // Llamar al inicio para mostrar si hay algo pendiente
    processEmails();
});
