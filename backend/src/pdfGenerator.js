// backend/src/pdfGenerator.js
// Generador de facturas PDF premium con desglose de tramos y QR de pago BNB integrado
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { calcularFactura } = require('./billing');

/**
 * Genera un PDF de factura premium para un inmueble y periodo específico.
 * Retorna un Promise que resuelve a un Buffer con el contenido del PDF.
 */
async function generarFacturaPDF(inmueble, periodo = '2025-05') {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'LETTER' });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const factura = calcularFactura(inmueble.categoria, inmueble.consumo_actual_m3);
      const totalBs = factura.total + (inmueble.deuda_total || 0);

      // Datos de cuenta Banco Nacional de Bolivia (BNB) para QR Simple
      const nroCuenta = '3503205520';
      const qrSimplePayload = {
        action: 'payment',
        bank_account: nroCuenta,
        bank_name: 'Banco Nacional de Bolivia (BNB)',
        recipient: 'SEMAPA - Recaudaciones Oficiales',
        amount: parseFloat(totalBs.toFixed(2)),
        currency: 'BOB',
        reference: `Pago Factura Contrato ${inmueble.contrato} - Periodo: ${periodo}`
      };
      const paymentUri = JSON.stringify(qrSimplePayload);

      // Generar imagen QR en buffer para incrustar
      const qrBuffer = await QRCode.toBuffer(paymentUri, {
        errorCorrectionLevel: 'H',
        type: 'png',
        margin: 1,
        color: {
          dark: '#040913',
          light: '#ffffff'
        }
      });

      // ── Encabezado Estético ──
      // Fondo superior decorativo
      doc.rect(0, 0, doc.page.width, 110)
         .fill('rgba(0, 36, 71, 0.95)');

      // Título
      doc.fillColor('#ffffff')
         .font('Helvetica-Bold')
         .fontSize(22)
         .text('💧 SEMAPA COCHABAMBA', 40, 25);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#a5f3fc')
         .text('Sistema Inteligente de Gestión Hídrica y Recaudación QR Simple', 40, 52);

      doc.fillColor('#ffffff')
         .font('Helvetica-Bold')
         .fontSize(12)
         .text('FACTURA DIGITAL / COMPROBANTE', 400, 25, { align: 'right' });

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#e2e8f0')
         .text(`Periodo: ${periodo === '2025-05' ? 'Mayo 2025' : periodo}`, 400, 42, { align: 'right' })
         .text(`Emisión: ${new Date().toLocaleDateString('es-BO')}`, 400, 55, { align: 'right' })
         .text(`Vence: 10/06/2025`, 400, 68, { align: 'right' });

      // ── Datos del Inmueble y Cliente ──
      doc.y = 135;
      
      doc.rect(40, doc.y, 532, 85)
         .lineWidth(1)
         .strokeColor('#e2e8f0')
         .stroke();

      const startY = doc.y + 10;
      doc.fillColor('#002447')
         .font('Helvetica-Bold')
         .fontSize(10)
         .text('DATOS DEL PROPIETARIO Y SERVICIO', 50, startY);

      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor('#475569')
         .text('Nombre:', 50, startY + 20)
         .text('C.I. / NIT:', 50, startY + 35)
         .text('Nº Contrato:', 50, startY + 50)
         .text('Dirección:', 50, startY + 65);

      doc.font('Helvetica')
         .fillColor('#0f172a')
         .text(inmueble.nombre, 130, startY + 20)
         .text(inmueble.ci, 130, startY + 35)
         .text(inmueble.contrato, 130, startY + 50)
         .text(`${inmueble.direccion} (${inmueble.zona})`, 130, startY + 65);

      // Columna Derecha Datos Medidor
      doc.font('Helvetica-Bold')
         .fillColor('#475569')
         .text('Categoría:', 330, startY + 20)
         .text('Medidor Serie:', 330, startY + 35)
         .text('Modelo IoT:', 330, startY + 50)
         .text('Estado Cuenta:', 330, startY + 65);

      doc.font('Helvetica')
         .fillColor('#0f172a')
         .text(inmueble.categoria, 420, startY + 20)
         .text(inmueble.medidor_serie, 420, startY + 35)
         .text(inmueble.medidor_modelo, 420, startY + 50);

      const isMoroso = (inmueble.estado_servicio === 'moroso' || inmueble.estado_servicio === 'suspendido');
      doc.font('Helvetica-Bold')
         .fillColor(isMoroso ? '#dc2626' : '#16a34a')
         .text(isMoroso ? 'DEUDAS PENDIENTES' : 'AL DÍA', 420, startY + 65);

      // ── Datos de Consumo Hídrico ──
      doc.y = 240;
      doc.rect(40, doc.y, 532, 50)
         .fill('rgba(6, 182, 212, 0.05)')
         .lineWidth(1)
         .strokeColor('rgba(6, 182, 212, 0.2)')
         .stroke();

      const consY = doc.y + 12;
      doc.fillColor('#0891b2')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text('TELEMETRÍA LORAWAN', 50, consY)
         .text('CONSUMO ANTERIOR', 180, consY)
         .text('CONSUMO ACTUAL', 310, consY)
         .text('EXCESO DE AGUA (ONU)', 440, consY);

      doc.fillColor('#0f172a')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('Activo', 50, consY + 15)
         .text(`${inmueble.consumo_anterior_m3} m³`, 180, consY + 15)
         .text(`${inmueble.consumo_actual_m3} m³`, 310, consY + 15);

      const exceso = inmueble.consumo_actual_m3 > 45;
      doc.fillColor(exceso ? '#dc2626' : '#16a34a')
         .text(exceso ? 'SÍ (>45m³)' : 'NO (Normal)', 440, consY + 15);

      // ── Detalle Tarifario (Desglose Tramos) ──
      doc.y = 310;
      doc.fillColor('#002447')
         .font('Helvetica-Bold')
         .fontSize(11)
         .text('DETALLE DE LA FACTURACIÓN Y TRAMOS', 40, doc.y);

      doc.y += 15;
      const tableTop = doc.y;
      
      // Header Tabla
      doc.rect(40, tableTop, 532, 20)
         .fill('#0f172a');

      doc.fillColor('#ffffff')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text('Concepto / Tramo de Consumo', 50, tableTop + 6)
         .text('Consumo (m³)', 240, tableTop + 6)
         .text('Precio Unitario', 360, tableTop + 6)
         .text('Subtotal', 480, tableTop + 6, { align: 'right', width: 80 });

      let currentY = tableTop + 20;
      doc.font('Helvetica').fontSize(9).fillColor('#0f172a');

      // Fila 1: Cargo Fijo
      doc.rect(40, currentY, 532, 20).fill(currentY % 40 === 0 ? '#f8fafc' : '#ffffff');
      doc.fillColor('#0f172a')
         .text('Cargo Fijo Base (Consumo mínimo de 12 m³)', 50, currentY + 6)
         .text('12 m³', 240, currentY + 6)
         .text(`Bs ${factura.cargo_fijo.toFixed(2)}`, 360, currentY + 6)
         .text(`Bs ${factura.cargo_fijo.toFixed(2)}`, 480, currentY + 6, { align: 'right', width: 80 });

      currentY += 20;

      // Filas: Tramos
      factura.desglose.forEach((t) => {
        doc.rect(40, currentY, 532, 20).fill(currentY % 40 === 0 ? '#f8fafc' : '#ffffff');
        doc.fillColor('#0f172a')
           .text(`Consumo Excedente - Tramo ${t.tramo}`, 50, currentY + 6)
           .text(`${t.m3} m³`, 240, currentY + 6)
           .text(`Bs ${t.precio.toFixed(2)} / m³`, 360, currentY + 6)
           .text(`Bs ${t.subtotal.toFixed(2)}`, 480, currentY + 6, { align: 'right', width: 80 });
        currentY += 20;
      });

      // Fila: Deuda Anterior
      if (inmueble.deuda_total > 0) {
        doc.rect(40, currentY, 532, 20).fill('#fee2e2');
        doc.fillColor('#991b1b')
           .font('Helvetica-Bold')
           .text('Deuda Acumulada de Meses Vencidos (Mora)', 50, currentY + 6)
           .text('-', 240, currentY + 6)
           .text('Pendientes', 360, currentY + 6)
           .text(`Bs ${inmueble.deuda_total.toFixed(2)}`, 480, currentY + 6, { align: 'right', width: 80 });
        currentY += 20;
      }

      // Línea de total
      doc.lineWidth(1.5)
         .strokeColor('#0f172a')
         .moveTo(40, currentY)
         .lineTo(572, currentY)
         .stroke();

      currentY += 5;
      doc.fillColor('#0f172a')
         .font('Helvetica-Bold')
         .fontSize(11)
         .text('TOTAL GENERAL A FACTURAR:', 250, currentY + 5)
         .fontSize(13)
         .fillColor('#1d4ed8')
         .text(`Bs ${totalBs.toFixed(2)}`, 480, currentY + 4, { align: 'right', width: 80 });

      // ── Bloque de Recaudación QR Simple (Banco BNB) ──
      currentY += 40;

      doc.rect(40, currentY, 532, 140)
         .fill('rgba(30, 64, 175, 0.04)')
         .lineWidth(1)
         .strokeColor('rgba(30, 64, 175, 0.25)')
         .stroke();

      const cryptoY = currentY + 15;
      doc.image(qrBuffer, 55, cryptoY, { width: 110, height: 110 });

      doc.fillColor('#1e3a8a')
         .font('Helvetica-Bold')
         .fontSize(11)
         .text('PAGO DIGITAL CON QR SIMPLE (BANCO NACIONAL DE BOLIVIA)', 185, cryptoY);

      doc.fillColor('#1e293b')
         .font('Helvetica')
         .fontSize(8.5)
         .text('Escanee este código QR desde la aplicación de su banco nacional para realizar una transferencia electrónica interbancaria inmediata y liquidar su cuenta de forma segura.', 185, cryptoY + 18, { width: 370, lineGap: 2 });

      doc.font('Helvetica-Bold')
         .fillColor('#0f172a')
         .fontSize(9)
         .text('Banco Destinatario:', 185, cryptoY + 55)
         .text('Cuenta de Destino:', 185, cryptoY + 70)
         .text('Titular de Cuenta:', 185, cryptoY + 85)
         .text('Monto de Pago:', 185, cryptoY + 100);

      doc.font('Helvetica')
         .fillColor('#0f172a')
         .fontSize(9)
         .text('Banco Nacional de Bolivia S.A. (BNB)', 295, cryptoY + 55)
         .text(nroCuenta, 295, cryptoY + 70)
         .text('SEMAPA - Recaudaciones Oficiales', 295, cryptoY + 85)
         .font('Helvetica-Bold')
         .fillColor('#1d4ed8')
         .text(`Bs ${totalBs.toFixed(2)}`, 295, cryptoY + 100);

      doc.font('Helvetica-Oblique')
         .fillColor('#64748b')
         .fontSize(7.5)
         .text('* Nota de Pruebas: Para la simulación en entorno local, utilice el botón "Compensar Transferencia ACH" en el portal o tótem.', 185, cryptoY + 118, { width: 370 });

      // Footer
      doc.fillColor('#94a3b8')
         .font('Helvetica')
         .fontSize(7.5)
         .text('SEMAPA Cochabamba © 2026 • Servicio de Recaudación Distribuido Integrado en Cassandra y Kafka • Bolivia', 40, doc.page.height - 40, { align: 'center', width: 532 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generarFacturaPDF };
