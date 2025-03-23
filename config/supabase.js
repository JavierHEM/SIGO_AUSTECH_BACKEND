const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Crear cliente Supabase con Service Role Key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Cambia a la Service Role Key
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;