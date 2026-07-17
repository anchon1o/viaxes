# 🧭 Viaxes v7

App web colaborativa para planificar viaxes en parella. 100% gratuíta.

## Setup rápido

### 1. Supabase
1. Crea un proxecto en [supabase.com](https://supabase.com) (Frankfurt)
2. SQL Editor → pega e executa **cada ficheiro** de `sql/` nesta orde:
   - `sql/schema.sql`
   - `sql/v4.sql`
   - `sql/challenges.sql`
3. Authentication → Users → crea os dous usuarios:
   - `antonio@viaxes.local` / contrasinal que queiras
   - `noa@viaxes.local` / contrasinal que queiras
4. Authentication → Providers → Email → desactiva "Confirm email"
5. Se os usuarios xa existen sen contrasinal, executa no SQL Editor:
   ```sql
   UPDATE auth.users SET encrypted_password = crypt('antonio', gen_salt('bf')) WHERE email = 'antonio@viaxes.local';
   UPDATE auth.users SET encrypted_password = crypt('noa', gen_salt('bf')) WHERE email = 'noa@viaxes.local';
   ```
6. Settings → API → copia `Project URL` e `anon public key`

### 2. Vercel
1. Sube este repo a GitHub
2. Importa en [vercel.com](https://vercel.com)
3. Engade as variables de entorno — pero as credenciais xa están hardcoded en `src/lib/supabase.js` así que non é necesario
4. Deploy

### 3. Mapa (opcional, mellora visual)
- Crea conta gratuíta en [maptiler.com](https://maptiler.com) (sen tarxeta)
- Copia a API key e pégaa no banner que aparece no mapa dentro da app

## O que inclúe
- 🗺️ Mapa con Leaflet + rutas reais (OSRM) + busca de lugares (Nominatim)
- 📅 Timeline visual por días con dous modos (timeline + tarxetas)
- 📖 Diario (texto, foto, vídeo, audio, debuxo) con compresión automática
- ✅ Listaxes (checklist, estruturada con niveis, tarefas con progreso)
- ⚔️ Retos entre usuarios con puntos e probas
- 🎵 Banda sonora do viaxe
- 🏁 Resumo exportable como imaxe
- 🔗 Vista pública sen login
- 💰 Widget de presuposto
- 🌤️ Widget do tempo (Open-Meteo, gratuíto)
- 📍 Widget de localización actual
- ☀️🌙👾 Temas: claro, escuro, pixel art
- 🎨 Cor de acento + tipografía configurables por usuario
- 🗑️ Borrar viaxes con confirmación
