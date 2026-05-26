const { Router } = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const path = require('path');
const { client } = require('./cassandra');

const router = Router();

// Configuración Multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`);
  }
});
const upload = multer({ storage });

// JWT Secret (Debe estar en .env idealmente)
const JWT_SECRET = process.env.JWT_SECRET || 'secreto_mobile_semapa_123';

// Middleware de Autenticación
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Token no proporcionado' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
    req.user = user;
    next();
  });
}

// ── 1. LOGIN ─────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  // Validacion mock para el trabajador
  if (username === 'trabajador1' && password === 'admin123') {
    const user = { id: 'T-001', username, role: 'field_worker' };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ success: true, token, user });
  }
  return res.status(401).json({ error: 'Credenciales inválidas' });
});

// ── 2. UPLOAD FOTO ───────────────────────────────────────────────────────────
router.post('/upload', verifyToken, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
  // Retornamos la URL relativa
  const photoUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: photoUrl });
});

// ── 3. SYNC LECTURAS (Offline -> Online) ─────────────────────────────────────
router.post('/sync', verifyToken, async (req, res) => {
  const { lecturas } = req.body;
  if (!Array.isArray(lecturas)) {
    return res.status(400).json({ error: 'Formato inválido. Se esperaba un arreglo de lecturas.' });
  }

  const workerId = req.user.id;
  const queries = [];
  let guardadas = 0;

  for (const lectura of lecturas) {
    const ts = lectura.timestamp_ts ? new Date(lectura.timestamp_ts) : new Date();
    
    // 1. Insertar en tabla principal `lecturas`
    queries.push({
      query: `INSERT INTO lecturas (medidor_serie, periodo, timestamp_ts, consumo_m3, es_duplicado, es_excesivo) 
              VALUES (?, ?, ?, ?, ?, ?)`,
      params: [
        lectura.medidor_serie,
        lectura.periodo,
        ts,
        lectura.consumo_m3,
        false, 
        lectura.consumo_m3 > 45 // lógica simple de exceso
      ]
    });

    // 2. Insertar metadatos en `lecturas_campo_metadata`
    queries.push({
      query: `INSERT INTO lecturas_campo_metadata (medidor_serie, timestamp_ts, latitud, longitud, precision_gps, foto_url, trabajador_id)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
      params: [
        lectura.medidor_serie,
        ts,
        lectura.latitud || 0,
        lectura.longitud || 0,
        lectura.precision_gps || 0,
        lectura.foto_url || '',
        workerId
      ]
    });

    // 3. Actualizar tabla inmuebles
    queries.push({
      query: `UPDATE inmuebles SET consumo_actual_m3 = ? WHERE contrato = ?`,
      params: [lectura.consumo_m3, lectura.contrato]
    });
    
    guardadas++;
  }

  try {
    // Usamos batch si son múltiples, pero como tocan diferentes partition keys,
    // execute_batch en Cassandra con diferentes particiones es un anti-patrón o puede fallar.
    // Lo ejecutaremos secuencialmente (o promise.all) para evitar problemas de coordinación.
    await Promise.all(queries.map(q => client.execute(q.query, q.params, { prepare: true })));
    
    res.json({ success: true, message: `${guardadas} lecturas sincronizadas.`, count: guardadas });
  } catch (err) {
    console.error('[/api/mobile/sync] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 4. GET LECTURAS (Dashboard del trabajador) ───────────────────────────────
router.get('/lecturas', verifyToken, async (req, res) => {
  try {
    // Obtenemos los metadatos de las lecturas hechas por los trabajadores
    // En producción se buscaría por trabajador_id, pero como no es partition key, 
    // tendríamos que hacer un ALLOW FILTERING o tabla secundaria.
    // Usaremos un fetch global y filtraremos en memoria para el prototipo.
    
    const rMetadata = await client.execute('SELECT * FROM lecturas_campo_metadata', [], { fetchSize: 100 });
    const metadataList = rMetadata.rows.filter(r => r.trabajador_id === req.user.id);
    
    // Ahora por cada metadata, traemos su consumo correspondiente de la tabla `lecturas`
    // (Omitido por simplicidad si no necesitamos el consumo exacto, pero la app lo muestra)
    // Para simplificar, la app móvil confía en su almacenamiento local para el histórico
    // pero mandaremos la lista de metadatos de todos modos.
    res.json({ success: true, data: metadataList });
  } catch (err) {
    console.error('[/api/mobile/lecturas] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Obtener detalles del medidor
router.get('/medidor/:serie', verifyToken, async (req, res) => {
  const { serie } = req.params;
  try {
    // Buscar el inmueble/contrato a través del índice del medidor
    const rInmueble = await client.execute('SELECT * FROM inmuebles WHERE medidor_serie = ?', [serie], { prepare: true });
    if (!rInmueble.rows.length) {
      return res.status(404).json({ error: 'Medidor no encontrado o no asignado' });
    }
    const inmueble = rInmueble.rows[0];
    res.json({ success: true, inmueble });
  } catch (err) {
    console.error('[/api/mobile/medidor]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
