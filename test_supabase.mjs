import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
const envVars = envContent.split('\n').reduce((acc, line) => {
  const match = line.replace('\r', '').match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1].trim()] = match[2].trim().replace(/^"([^"]*)"$/, '$1').replace(/^'([^']*)'$/, '$1');
  return acc;
}, {});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseAnonKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabase() {
  console.log("=== INICIANDO PRUEBAS DE SUPABASE ===");

  // PRUEBA 1: Insertar Cliente
  console.log("\n[1] Probando upsert en tabla 'clients'...");
  const { data: clientData, error: clientError } = await supabase
    .from("clients")
    .upsert(
      { phone: "600123456", full_name: "Usuario de Prueba" },
      { onConflict: "phone" }
    )
    .select()
    .single();

  if (clientError) {
    console.error("❌ Error en clients:", clientError.message);
  } else {
    console.log("✅ Cliente insertado correctamente:", clientData);
    
    // PRUEBA 2: Insertar Reserva si el cliente tuvo éxito
    console.log("\n[2] Probando insert en tabla 'appointments'...");
    const { error: apptError } = await supabase
      .from("appointments")
      .insert({
        client_id: clientData.id,
        appointment_date: new Date().toISOString(),
        status: "confirmed"
      });
      
    if (apptError) {
      console.error("❌ Error en appointments:", apptError.message);
    } else {
      console.log("✅ Reserva insertada correctamente");
    }
  }
}

testSupabase();
