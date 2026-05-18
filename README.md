# ============================================================
# SEMAPA COCHABAMBA — Sistema de Gestión Hídrica
# Infraestructura Distribuida — Práctica 5
# ============================================================

## 🚀 Iniciar todo con un solo comando

```bash
docker-compose up --build -d
```

> Primera ejecución: ~5-8 minutos (descarga imágenes, espera que Cassandra forme el cluster).

---

## 🏗️ Arquitectura

```
Internet → Nginx (3000) → React SPA
                       ↘ /api/* → Node.js API (4000)
                                    ↓              ↓
                              Cassandra Cluster   Kafka
                            (9042) + (9043)     (9092)
```

| Servicio       | Puerto local | Descripción                          |
|----------------|-------------|--------------------------------------|
| Frontend Nginx | 3000        | React + SPA routing + proxy /api     |
| Backend API    | 4000        | Express + Cassandra + Kafka producer |
| Cassandra-1    | 9042        | Nodo seed del cluster                |
| Cassandra-2    | 9043        | Segundo nodo (disponibilidad)        |
| Kafka          | 9092        | Stream lecturas IoT (21.6M/mes)      |

---

## 📡 Endpoints API

| Método | Endpoint                         | Descripción                         |
|--------|----------------------------------|-------------------------------------|
| GET    | `/api/health`                    | Estado del servidor                 |
| GET    | `/api/totem/buscar?q=CBB-00123456` | Búsqueda multimodal (Tótem)       |
| POST   | `/api/billing/calcular`          | Calcular factura (9 categorías)     |
| GET    | `/api/distritos`                 | Mapa de 14 distritos (Alcaldía)     |
| GET    | `/api/distritos/:id/consumo8h`   | Consumo por distrito en 8h          |
| GET    | `/api/morosos`                   | Ranking de morosos                  |
| GET    | `/api/cierre`                    | Cierre mensual últimos periodos     |
| GET    | `/api/radiobases`                | Estado 32 radiobases LoRaWAN        |
| GET    | `/api/medidores/errores`         | Errores IoT códigos 3, 4, 5         |
| GET    | `/api/lecturas/:serie`           | Lecturas de un medidor              |
| POST   | `/api/iot/simular`               | Simular lecturas Kafka `{ n: 1000 }`|

---

## 🌐 URLs disponibles

- **Dashboard Alcaldía:** http://localhost:3000/
- **Monitor IoT:** http://localhost:3000/iot  
- **Contabilidad:** http://localhost:3000/billing
- **Portal Ciudadano:** http://localhost:3000/citizens
- **Tótem Kiosko:** http://localhost:3000/kiosk
- **API directa:** http://localhost:4000/api/health

---

## 🔧 Desarrollo local (sin Docker)

```bash
# Terminal 1 — Frontend
cd frontend && npm install && npm run dev   # http://localhost:5173

# Terminal 2 — Backend (con Cassandra local o mock)
cd backend && npm install && node src/index.js
```

## 🛑 Parar todo

```bash
docker-compose down          # detener
docker-compose down -v       # detener + borrar datos Cassandra/Kafka
```
