Paso a paso para encender y apagar el bot de WhatsApp (Evolution API)
Todo se hace desde la carpeta backendluz que está en
C:\Users\byluz\Documents\Practica 5  SD\practica5\backendluz

1️⃣ Encender (iniciar) el bot
Acción	Comando (PowerShell)	Qué hace
a. Abrir una terminal en la carpeta backendluz	powershell<br>cd "C:\Users\byluz\Documents\Practica 5  SD\practica5\backendluz"	Cambia el directorio de trabajo
b. Levantar los contenedores	docker compose up -d	Crea y ejecuta en segundo plano los contenedores backendluz‑evolution, backendluz‑evolution‑db y backendluz‑redis
c. Verificar que están corriendo	docker compose ps	Deberías ver los tres servicios con estado Up
d. (Opcional) Chequear que la instancia está open	powershell -Command "(Invoke-WebRequest -Uri http://localhost:8080/instance/state/luzbot -Headers @{'apikey'='luz_evolution_key'}).Content"	Respuesta state=open indica que ya está conectada y no necesitas QR
e. (Solo si el estado es closed) Obtener QR y escanear	powershell -File .\obtener-qr.ps1	El script crea la instancia luzbot, descarga el QR (lo guarda como qr.png) y abre la imagen para que lo escanees con el celular.
Nota: En tu caso, la salida del paso d ya devolvió state=open, por lo que el QR no se genera (es normal). Solo asegúrate de que los contenedores estén arriba.

2️⃣ Apagar (detener) el bot
Acción	Comando (PowerShell)	Qué hace
a. Desde la misma carpeta backendluz	docker compose down	Detiene y elimina los contenedores, redes y volúmenes creados por docker compose up
b. (Opcional) Limpiar imágenes‑intermedias	docker image prune -f	Libera espacio en disco si lo deseas
Consejo: Si vas a volver a iniciar pronto, puedes omitir el prune; Docker reutiliza las imágenes ya descargadas.

3️⃣ ¿Cuándo volver a escanear el QR?
Situación	Acción requerida
Instancia state=open	No hace falta QR. El bot sigue activo mientras los contenedores estén arriba.
Instancia state=closed (p.ej. después de docker compose down o si cambiaste el instanceName)	Ejecuta obtener-qr.ps1 de nuevo y escanea el QR que se abre.
Cambiaste el número de teléfono o la clave API	Actualiza .env (en backend) y vuelve a levantar con docker compose up -d. Luego, si el estado vuelve a closed, genera el QR.
4️⃣ Verificar el flujo completo (test rápido)
Inicia los contenedores (docker compose up -d).
Desde otro celular, envía el mensaje exacto lulitolaredo al número que configuraste (+591 62658425).
Deberías recibir el menú interactivo de SEMAPA (el bot responde automáticamente).
Si recibes el menú, todo está funcionando. Si no, revisa los logs:

powershell


docker compose logs -f backendluz-evolution   # sigue en tiempo real
Resumen de comandos (copia‑pegá)
powershell


# ------------------- ENTRAR EN LA CARPETA -------------------
cd "C:\Users\byluz\Documents\Practica 5  SD\practica5\backendluz"
# ------------------- ARRANCAR -------------------
docker compose up -d
docker compose ps                     # verifica que estén Up
# (opcional) Ver estado de la instancia
powershell -Command "(Invoke-WebRequest -Uri http://localhost:8080/instance/state/luzbot -Headers @{'apikey'='luz_evolution_key'}).Content"
# ------------------- SI ESTÁ CLOSED, OBTENER QR -------------------
powershell -File .\obtener-qr.ps1    # escanea el QR que se abre
# ------------------- APAGAR -------------------
docker compose down
# (opcional) liberar espacio
docker image prune -f
Con estos pasos puedes prender y apagar el bot de forma controlada, y solo tendrás que escanear el QR cuando la instancia esté cerrada. ¡Listo para usar! 🎉