/**
 * Plumber - Connection management wrapper
 * 
 * This class provides backward-compatible API using ConnectionManager
 * instead of jsPlumb, maintaining the same interface for existing code.
 */

import { ConnectionManager, SOURCE_DEFAULTS as CM_SOURCE_DEFAULTS, TARGET_DEFAULTS as CM_TARGET_DEFAULTS } from './ConnectionManager';

// Re-export constants for backward compatibility
export const SOURCE_DEFAULTS = CM_SOURCE_DEFAULTS;
export const TARGET_DEFAULTS = CM_TARGET_DEFAULTS;

export class Plumber {
  private connectionManager: ConnectionManager;
  public connectionDragging = false;
  private syncInterval: number | null = null;

  constructor(canvas: HTMLElement, editor: any) {
    this.connectionManager = new ConnectionManager(canvas, editor);
    
    // Sync connection dragging state
    this.syncInterval = window.setInterval(() => {
      this.connectionDragging = this.connectionManager.connectionDragging;
    }, 16);
  }

  public on(eventName: string, callback: (info: any) => void) {
    this.connectionManager.on(eventName, callback);
  }

  public off(eventName: string, callback: (info: any) => void) {
    this.connectionManager.off(eventName, callback);
  }

  public makeTarget(uuid: string) {
    this.connectionManager.makeTarget(uuid);
  }

  public makeSource(uuid: string) {
    this.connectionManager.makeSource(uuid);
  }

  public processPendingConnections() {
    this.connectionManager.processPendingConnections();
  }

  public connectIds(scope: string, fromId: string, toId: string) {
    this.connectionManager.connectIds(scope, fromId, toId);
  }

  public setActivityData(activityData: { segments: { [key: string]: number } } | null) {
    this.connectionManager.setActivityData(activityData);
  }

  public repaintEverything() {
    this.connectionManager.repaintEverything();
  }

  public revalidate(ids: string[]) {
    this.connectionManager.revalidate(ids);
  }

  public removeNodeConnections(nodeId: string) {
    this.connectionManager.removeNodeConnections(nodeId);
  }

  public removeExitConnection(exitId: string): boolean {
    return this.connectionManager.removeExitConnection(exitId);
  }

  public setConnectionRemovingState(exitId: string, isRemoving: boolean): boolean {
    return this.connectionManager.setConnectionRemovingState(exitId, isRemoving);
  }

  public clearRecentContactsCache() {
    this.connectionManager.clearRecentContactsCache();
  }

  public batch(fn: () => void) {
    this.connectionManager.batch(fn);
  }

  public destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}
