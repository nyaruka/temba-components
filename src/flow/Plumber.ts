import {
  DotEndpoint,
  FlowchartConnector,
  newInstance,
  ready,
  RectangleEndpoint,
  EVENT_CONNECTION_DRAG,
  EVENT_CONNECTION_ABORT,
  INTERCEPT_BEFORE_DROP,
  EVENT_CONNECTION,
  EVENT_REVERT,
  INTERCEPT_BEFORE_DETACH,
  EVENT_CONNECTION_DETACHED
} from '@jsplumb/browser-ui';
import { getStore } from '../store/Store';

const CONNECTOR_DEFAULTS = {
  type: FlowchartConnector.type,
  options: {
    stub: [20, 10],
    midpoint: 0.5,
    alwaysRespectStubs: true,
    cornerRadius: 5,
    cssClass: 'plumb-connector'
  }
};

const OVERLAYS_DEFAULTS = [
  {
    type: 'PlainArrow',
    options: {
      width: 13,
      length: 13,
      location: 0.999,
      cssClass: 'plumb-arrow'
    }
  }
];

export const SOURCE_DEFAULTS = {
  endpoint: {
    type: DotEndpoint.type,
    options: {
      radius: 12,
      cssClass: 'plumb-source',
      hoverClass: 'plumb-source-hover'
    }
  },
  anchors: ['Bottom', 'Continuous'],
  maxConnections: 1,
  source: true,
  dragAllowedWhenFull: false
};

export const TARGET_DEFAULTS = {
  endpoint: {
    type: RectangleEndpoint.type,
    options: {
      width: 23,
      height: 23,
      cssClass: 'plumb-target',
      hoverClass: 'plumb-target-hover'
    }
  },
  anchor: {
    type: 'Continuous',
    options: {
      faces: ['top', 'left', 'right'],
      cssClass: 'continuos plumb-target-anchor'
    }
  },
  deleteOnEmpty: true,
  maxConnections: 1,
  target: true
};

export class Plumber {
  private jsPlumb = null;
  private pendingConnections = [];
  private connectionListeners = new Map();
  public connectionDragging = false;
  private connectionWait = null;
  private activityData: { segments: { [key: string]: number } } | null = null;
  private hoveredActivityKey: string | null = null;
  private recentContactsPopup: HTMLElement | null = null;
  private recentContactsCache: { [key: string]: any[] } = {};
  private pendingFetches: { [key: string]: AbortController } = {};
  private hideContactsTimeout: number | null = null;
  private showContactsTimeout: number | null = null;
  private editor: any;

  initializeJSPlumb(canvas: HTMLElement) {
    this.jsPlumb = newInstance({
      container: canvas,
      connectionsDetachable: true,
      endpointStyle: {
        fill: 'green'
      },
      connector: CONNECTOR_DEFAULTS,
      connectionOverlays: OVERLAYS_DEFAULTS
    });

    // Bind to connection events
    this.jsPlumb.bind(EVENT_CONNECTION, (info) => {
      this.connectionDragging = false;
      this.notifyListeners(EVENT_CONNECTION, info);
    });

    // Bind to connection drag events
    this.jsPlumb.bind(EVENT_CONNECTION_DRAG, (info) => {
      this.connectionDragging = true;
      this.notifyListeners(EVENT_CONNECTION_DRAG, info);
    });

    this.jsPlumb.bind(EVENT_CONNECTION_ABORT, (info) => {
      this.connectionDragging = false;
      this.notifyListeners(EVENT_CONNECTION_ABORT, info);
    });

    this.jsPlumb.bind(EVENT_CONNECTION_DETACHED, (info) => {
      this.connectionDragging = false;
      this.notifyListeners(EVENT_CONNECTION_DETACHED, info);
    });

    this.jsPlumb.bind(EVENT_REVERT, (info) => {
      this.notifyListeners(EVENT_REVERT, info);
    });

    this.jsPlumb.bind(INTERCEPT_BEFORE_DROP, () => {
      // we always deny automatic connections
      return false;
    });
    this.jsPlumb.bind(INTERCEPT_BEFORE_DETACH, () => {});
  }

  constructor(canvas: HTMLElement, editor: any) {
    this.editor = editor;
    ready(() => {
      this.initializeJSPlumb(canvas);
    });
  }

  private notifyListeners(eventName: string, info: any) {
    const listeners = this.connectionListeners.get(eventName) || [];
    listeners.forEach((listener) => listener(info));
  }

  public on(eventName: string, callback: (info: any) => void) {
    if (!this.connectionListeners.has(eventName)) {
      this.connectionListeners.set(eventName, []);
    }
    this.connectionListeners.get(eventName).push(callback);
  }

  public off(eventName: string, callback: (info: any) => void) {
    if (!this.connectionListeners.has(eventName)) return;
    const listeners = this.connectionListeners.get(eventName);
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  public makeTarget(uuid: string) {
    const element = document.getElementById(uuid);
    if (!element) return;
    return this.jsPlumb.addEndpoint(element, TARGET_DEFAULTS);
  }

  public makeSource(uuid: string) {
    const element = document.getElementById(uuid);
    if (!element) return;
    return this.jsPlumb.addEndpoint(element, SOURCE_DEFAULTS);
  }

  // we'll process our pending connections, but we want to debounce this
  public processPendingConnections() {
    // if we have a pending connection wait, clear it
    if (this.connectionWait) {
      clearTimeout(this.connectionWait);
      this.connectionWait = null;
    }

    // debounce the connection processing
    this.connectionWait = setTimeout(() => {
      this.jsPlumb.batch(() => {
        this.pendingConnections.forEach((connection) => {
          const { scope, fromId, toId } = connection;

          // sources and targets must exist
          const source = document.getElementById(fromId);
          // const target = document.getElementById(toId);

          this.revalidate([fromId, toId]);

          // we need to find the source endpoint
          const sourceEndpoint = this.jsPlumb
            .getEndpoints(source)
            ?.find((endpoint) =>
              endpoint.elementId === fromId ? true : false
            );

          // update endpoint have connect css class
          if (sourceEndpoint) {
            sourceEndpoint.addClass('connected');
          }

          // each connection needs its own target endpoint
          const targetEndpoint = this.makeTarget(toId);

          if (!source || !targetEndpoint) {
            console.warn(
              `Plumber: Cannot connect ${fromId} to ${toId}. Element(s) missing.`
            );
            return;
          }

          // delete connections
          this.jsPlumb.select({ source, targetEndpoint }).deleteAll();
          this.jsPlumb.connect({
            source: source,
            target: targetEndpoint,
            connector: {
              ...CONNECTOR_DEFAULTS,
              options: { ...CONNECTOR_DEFAULTS.options, gap: [0, 5] }
            },
            data: {
              nodeId: scope
            }
          });
        });
        this.pendingConnections = [];
      });

      // Force a repaint to ensure connections are positioned correctly
      // especially after bulk updates or view switching
      window.requestAnimationFrame(() => {
        if (this.jsPlumb) {
          this.jsPlumb.repaintEverything();
        }
      });
    }, 0);
  }

  public connectIds(scope: string, fromId: string, toId: string) {
    this.pendingConnections.push({ scope, fromId, toId });
    this.processPendingConnections();
  }

  public setActivityData(
    activityData: { segments: { [key: string]: number } } | null
  ) {
    this.activityData = activityData;
    // Clear recent contacts cache when activity data changes
    this.clearRecentContactsCache();
    this.updateActivityOverlays();
  }

  private updateActivityOverlays() {
    if (!this.jsPlumb || !this.activityData) {
      return;
    }

    // Get all connections
    const connections = this.jsPlumb.getConnections();

    connections.forEach((connection: any) => {
      // Get the source exit element
      const sourceElement = connection.source;
      if (!sourceElement) {
        return;
      }

      // Get destination node
      const targetElement = connection.target;
      if (!targetElement) {
        return;
      }

      // Create activity key: exitUuid:destinationUuid
      const exitUuid = sourceElement.id;
      const destinationUuid = targetElement.id;
      const activityKey = `${exitUuid}:${destinationUuid}`;

      // Get activity count for this segment
      const count = this.activityData.segments[activityKey];

      // Remove existing activity overlays
      connection.removeOverlay('activity-label');

      // Add new overlay if there's activity
      if (count && count > 0) {
        const overlay = connection.addOverlay({
          type: 'Label',
          options: {
            label: count.toLocaleString(),
            id: 'activity-label',
            cssClass: 'activity-overlay',
            location: 20 // Fixed pixel distance from the start (exit point)
          }
        });

        // Add hover events for recent contacts popup
        // Use setTimeout to ensure the overlay is fully rendered
        setTimeout(() => {
          // Try multiple ways to get the overlay element
          let overlayElement =
            overlay.canvas || overlay.element || overlay.getElement?.();

          // If still not found, query the DOM directly
          if (!overlayElement) {
            const overlays = connection.getOverlays();
            if (Array.isArray(overlays)) {
              for (const ovl of overlays) {
                if (ovl.id === 'activity-label') {
                  overlayElement =
                    ovl.canvas || ovl.element || ovl.getElement?.();
                  break;
                }
              }
            }
          }

          // Also try querying by CSS class
          if (!overlayElement && connection.canvas) {
            overlayElement =
              connection.canvas.querySelector('.activity-overlay');
          }

          if (overlayElement) {
            overlayElement.style.cursor = 'pointer';
            overlayElement.setAttribute('data-activity-key', activityKey);
            overlayElement.addEventListener('mouseenter', () => {
              // Don't show recent contacts when simulator is active
              const store = getStore();
              if (store?.getState().simulatorActive) {
                return;
              }

              // Get flow UUID from the editor element
              const editor = document.querySelector('temba-flow-editor') as any;
              const flowUuid = editor?.definition?.uuid;
              if (flowUuid) {
                // Start fetching immediately
                this.fetchRecentContacts(activityKey, flowUuid);

                // But delay showing the popup by half a second
                this.showContactsTimeout = window.setTimeout(() => {
                  this.showRecentContacts(activityKey, flowUuid);
                }, 500);
              }
            });
            overlayElement.addEventListener('mouseleave', () => {
              // Cancel the show timeout if still pending
              if (this.showContactsTimeout) {
                clearTimeout(this.showContactsTimeout);
                this.showContactsTimeout = null;
              }
              this.hoveredActivityKey = null;
              this.hideRecentContacts();
            });
          }
        }, 50);
      }
    });

    // Force repaint to ensure overlays are positioned correctly
    this.repaintEverything();
  }

  private findOverlayElement(activityKey: string): HTMLElement | null {
    // Find overlay by data attribute
    const overlays = document.querySelectorAll('.activity-overlay');
    for (const overlay of overlays) {
      if (overlay.getAttribute('data-activity-key') === activityKey) {
        return overlay as HTMLElement;
      }
    }
    return null;
  }

  private async fetchRecentContacts(activityKey: string, flowUuid: string) {
    // Skip if already cached or currently fetching
    if (
      this.recentContactsCache[activityKey] ||
      this.pendingFetches[activityKey]
    ) {
      return;
    }

    // Cancel any pending fetch for this key
    if (this.pendingFetches[activityKey]) {
      this.pendingFetches[activityKey].abort();
    }

    // Fetch recent contacts from endpoint
    const controller = new AbortController();
    this.pendingFetches[activityKey] = controller;

    try {
      // Parse exit UUID and destination UUID from activity key
      const [exitUuid, destinationUuid] = activityKey.split(':');

      const endpoint = `/flow/recent_contacts/${flowUuid}/${exitUuid}/${destinationUuid}/`;

      const response = await fetch(endpoint, {
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // API returns array directly, not wrapped in results
      const recentContacts = Array.isArray(data) ? data : data.results || [];

      // Cache the results
      this.recentContactsCache[activityKey] = recentContacts;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to fetch recent contacts:', error);
      }
    } finally {
      delete this.pendingFetches[activityKey];
    }
  }

  private async showRecentContacts(activityKey: string, flowUuid: string) {
    // Don't show recent contacts when simulator is active
    const store = getStore();
    if (store?.getState().simulatorActive) {
      return;
    }

    // Find the overlay element fresh to avoid stale references
    const overlayElement = this.findOverlayElement(activityKey);
    if (!overlayElement) {
      console.warn('Could not find overlay element for activity:', activityKey);
      return;
    }
    // Clear any pending hide timeout
    if (this.hideContactsTimeout) {
      clearTimeout(this.hideContactsTimeout);
      this.hideContactsTimeout = null;
    }

    this.hoveredActivityKey = activityKey;

    // Create popup if it doesn't exist
    if (!this.recentContactsPopup) {
      this.recentContactsPopup = document.createElement('div');
      this.recentContactsPopup.className = 'recent-contacts-popup';
      // Add inline styles to ensure visibility
      this.recentContactsPopup.style.position = 'absolute';
      this.recentContactsPopup.style.width = '200px';
      this.recentContactsPopup.style.background = '#f3f3f3';
      this.recentContactsPopup.style.borderRadius = '10px';
      this.recentContactsPopup.style.boxShadow =
        '0 1px 3px 1px rgba(130, 130, 130, 0.2)';
      this.recentContactsPopup.style.zIndex = '1015';
      this.recentContactsPopup.style.display = 'none';
      document.body.appendChild(this.recentContactsPopup);
    }

    // Add hover events to keep popup open (only needs to be done once)
    if (!this.recentContactsPopup.onmouseenter) {
      this.recentContactsPopup.onmouseenter = () => {
        if (this.hideContactsTimeout) {
          clearTimeout(this.hideContactsTimeout);
          this.hideContactsTimeout = null;
        }
      };
      this.recentContactsPopup.onmouseleave = () => {
        this.hoveredActivityKey = null;
        this.hideRecentContacts();
      };

      // Add click event listener for contact names
      this.recentContactsPopup.onclick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;

        if (target.classList.contains('contact-name')) {
          this.hideRecentContacts(false);
          const contactUuid = target.getAttribute('data-uuid');
          if (contactUuid) {
            // Fire custom event through editor
            this.editor.fireCustomEvent('temba-contact-clicked', {
              uuid: contactUuid
            });
          }
        }
      };
    }

    // Check cache first
    if (this.recentContactsCache[activityKey]) {
      this.renderRecentContactsPopup(this.recentContactsCache[activityKey]);
      this.positionPopup(overlayElement);
    } else {
      // Show loading state if data isn't ready yet
      this.recentContactsPopup.innerHTML =
        '<div class="no-contacts-message">Loading...</div>';
      this.positionPopup(overlayElement);

      // Wait for the fetch to complete
      await this.fetchRecentContacts(activityKey, flowUuid);

      // Render if still hovering over this activity
      if (this.hoveredActivityKey === activityKey) {
        const contacts = this.recentContactsCache[activityKey] || [];
        this.renderRecentContactsPopup(contacts);
        this.positionPopup(overlayElement);
      }
    }
  }

  private positionPopup(overlayElement: HTMLElement) {
    if (!this.recentContactsPopup) return;

    // Position popup near the overlay
    const rect = overlayElement.getBoundingClientRect();
    this.recentContactsPopup.style.left = `${rect.left + window.scrollX}px`;
    this.recentContactsPopup.style.top = `${
      rect.bottom + window.scrollY + 5
    }px`;

    // Remove inline display style so CSS class can work
    this.recentContactsPopup.style.display = '';

    // Trigger animation by adding class
    this.recentContactsPopup.classList.remove('show');
    // Force reflow to restart animation
    void this.recentContactsPopup.offsetWidth;
    this.recentContactsPopup.classList.add('show');
  }

  private renderRecentContactsPopup(recentContacts: any[]) {
    if (!this.recentContactsPopup) return;

    const hasContacts = recentContacts.length > 0;

    if (!hasContacts) {
      // Simple message when no contacts
      this.recentContactsPopup.innerHTML =
        '<div class="no-contacts-message">No Recent Contacts</div>';
      return;
    }

    let html = `<div class="popup-title">Recent Contacts</div>`;

    recentContacts.forEach((contact: any) => {
      html += `<div class="contact-row">`;
      html += `<div class="contact-name" data-uuid="${contact.contact.uuid}">${contact.contact.name}</div>`;
      if (contact.operand) {
        html += `<div class="contact-operand">${contact.operand}</div>`;
      }
      if (contact.time) {
        const time = new Date(contact.time);
        const now = new Date();
        const diffMs = now.getTime() - time.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        let timeStr = '';
        if (diffMins < 1) timeStr = 'just now';
        else if (diffMins < 60) timeStr = `${diffMins}m ago`;
        else if (diffHours < 24) timeStr = `${diffHours}h ago`;
        else timeStr = `${diffDays}d ago`;

        html += `<div class="contact-time">${timeStr}</div>`;
      }
      html += `</div>`;
    });

    this.recentContactsPopup.innerHTML = html;
  }

  private hideRecentContacts(wait = true) {
    if (!wait) {
      if (this.recentContactsPopup) {
        this.recentContactsPopup.classList.remove('show');
        this.recentContactsPopup.style.display = 'none';
        this.hoveredActivityKey = null;
      }
      return;
    }

    this.hideContactsTimeout = window.setTimeout(() => {
      // Check if we're still hovering over an activity
      if (!this.hoveredActivityKey && this.recentContactsPopup) {
        this.recentContactsPopup.classList.remove('show');
        this.recentContactsPopup.style.display = 'none';
        this.hoveredActivityKey = null;
      }
    }, 200); // Small delay to allow moving between overlay and popup
  }

  public clearRecentContactsCache() {
    this.recentContactsCache = {};
    // Cancel any pending fetches
    Object.values(this.pendingFetches).forEach((controller) =>
      controller.abort()
    );
    this.pendingFetches = {};
  }

  public repaintEverything() {
    if (this.jsPlumb) {
      this.jsPlumb.repaintEverything();
    }
  }

  public revalidate(ids: string[]) {
    if (!this.jsPlumb) return;
    this.jsPlumb.batch(() => {
      ids.forEach((id) => {
        const element = document.getElementById(id);
        if (element) {
          this.jsPlumb.revalidate(element);
        }
      });
    });
  }

  public reset() {
    if (this.connectionWait) {
      clearTimeout(this.connectionWait);
      this.connectionWait = null;
    }
    this.pendingConnections = [];
    this.jsPlumb.select().deleteAll();
    this.jsPlumb._managedElements = {};
  }

  public forgetNode(nodeId: string) {
    if (!this.jsPlumb) return;
    const element = document.getElementById(nodeId);
    if (!element) return;

    this.jsPlumb.deleteConnectionsForElement(element);
    this.jsPlumb.removeAllEndpoints(element);
    this.jsPlumb.unmanage(element);
  }

  public removeNodeConnections(nodeId: string, exitIds?: string[]) {
    if (!this.jsPlumb) return;

    const inbound = this.jsPlumb.select({ target: nodeId });

    // Use provided exitIds or try to find them in DOM (fallback)
    const exits =
      exitIds ||
      Array.from(
        document.getElementById(nodeId)?.querySelectorAll('.exit') || []
      ).map((exit) => {
        return exit.id;
      }) ||
      [];

    inbound.deleteAll();
    this.jsPlumb.select({ source: exits }).deleteAll();
    this.jsPlumb.selectEndpoints({ source: exits }).deleteAll();
  }

  public removeExitConnection(exitId: string) {
    if (!this.jsPlumb) return;

    const exitElement = document.getElementById(exitId);
    if (!exitElement) return;

    // Get all connections from this exit
    const connections = this.jsPlumb.getConnections({ source: exitElement });

    // Remove the connections
    connections.forEach((connection) => {
      this.jsPlumb.deleteConnection(connection);
    });

    return connections.length > 0;
  }

  public removeAllEndpoints(nodeId: string) {
    if (!this.jsPlumb) return;
    const element = document.getElementById(nodeId);
    if (!element) return;
    this.jsPlumb.removeAllEndpoints(element, true);
  }

  /**
   * Set the removing state for an exit's connection
   * @param exitId The ID of the exit whose connections should be marked as removing
   * @returns true if connections were found and updated, false otherwise
   */
  public setConnectionRemovingState(
    exitId: string,
    isRemoving: boolean
  ): boolean {
    if (!this.jsPlumb) return false;

    const exitElement = document.getElementById(exitId);
    if (!exitElement) return false;

    // Get all connections from this exit
    const connections = this.jsPlumb.getConnections({ source: exitElement });

    if (connections.length === 0) return false;

    // Update the connections' CSS classes
    connections.forEach((connection) => {
      if (isRemoving) {
        connection.addClass('removing');
      } else {
        connection.removeClass('removing');
      }
    });

    return true;
  }
}
