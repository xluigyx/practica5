import { Injectable } from '@nestjs/common';

/**
 * Regla Meta: después de 24h sin que el CLIENTE escriba, el negocio
 * SOLO puede contactarlo mediante templates HSM aprobados.
 * Los mensajes libres (texto, imágenes) solo son válidos dentro
 * de la ventana de 24h abierta por el último mensaje del cliente.
 *
 * Implementación: Map en memoria con expiración.
 * Para producción con múltiples instancias, sustituir por Redis
 * (TTL de 86400 segundos por clave).
 */
@Injectable()
export class SessionManager {
  /** clave → timestamp de expiración (ms epoch) */
  private readonly sessions = new Map<string, number>();
  private readonly SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

  private buildKey(businessId: string, phone: string): string {
    return `${businessId}:${phone}`;
  }

  /**
   * Devuelve true si el cliente envió un mensaje en las últimas 24h.
   * false = sesión cerrada → se debe usar template HSM.
   */
  isOpen(businessId: string, phone: string): boolean {
    const key = this.buildKey(businessId, phone);
    const expiry = this.sessions.get(key);
    if (expiry === undefined) return false;
    if (Date.now() > expiry) {
      this.sessions.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Llamar cada vez que llega un mensaje del CLIENTE.
   * Renueva/abre la ventana de 24h.
   */
  refresh(businessId: string, phone: string): void {
    const key = this.buildKey(businessId, phone);
    this.sessions.set(key, Date.now() + this.SESSION_TTL_MS);
  }

  /**
   * Retorna cuántos ms faltan para que expire la sesión (0 si ya expiró).
   */
  ttlMs(businessId: string, phone: string): number {
    const key = this.buildKey(businessId, phone);
    const expiry = this.sessions.get(key);
    if (expiry === undefined) return 0;
    return Math.max(0, expiry - Date.now());
  }
}
