// Supabase → Settings/API бөлімінен өз мәндеріңізді қойыңыз.
// ТЕК Project URL және Publishable key (немесе anon public key).
// Secret/service_role кілтін ЕШҚАШАН бұл файлға салмаңыз.
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
