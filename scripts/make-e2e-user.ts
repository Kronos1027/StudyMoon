// Cria usuario de teste E2E ja confirmado (via admin API) e imprime credenciais
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY ausentes no .env");
  process.exit(1);
}
const stamp = Date.now();
const email = `e2e-${stamp}@studymoon.test`;
const password = `MoonE2E-${stamp}!7`;

const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { apelido: "E2E Tester", exam_year: 2026 },
});

if (error) {
  console.error("ERRO:", error.message);
  process.exit(1);
}

console.log(`EMAIL=${email}`);
console.log(`PASSWORD=${password}`);
console.log(`UID=${data.user.id}`);
