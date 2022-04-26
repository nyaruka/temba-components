import { css, html, TemplateResult } from 'lit';
import { property } from 'lit/decorators';
import { CustomEventType } from '../interfaces';
import { RapidElement } from '../RapidElement';
import { fetchResults, getClasses } from '../utils';

export interface MenuItem {
  id?: string;
  vanity_id?: string;
  name?: string;
  count?: number;
  icon?: string;
  collapsed_icon?: string;
  endpoint?: string;
  loading?: boolean;
  bottom?: boolean;
  level?: number;
  trigger?: string;
  href?: string;
  items?: MenuItem[];
  inline?: boolean;
  type?: string;
  on_submit?: string;
  bubble?: string;
}

interface MenuItemState {
  collapsed?: string;
}

const findItem = (
  items: MenuItem[],
  id: string
): { item: MenuItem; index: number } => {
  const search = items || [];

  const index = search.findIndex((item: MenuItem) => {
    return item.id == id || item.vanity_id == id;
  });

  if (index > -1) {
    const item = search[index];
    return { item, index };
  }

  return { item: null, index: -1 };
};

export class TembaMenu extends RapidElement {
  static get styles() {
    return css`
      :host {
        width: 100%;
        display: block;
        --color-widget-bg-focused: transparent;
        --options-block-shadow: none;
      }

      .bubble {
        width: 8px;
        height: 8px;
        left: 14px;
        bottom: -1px;
        z-index: 10000;
        border-radius: 99px;
        border: 1px solid rgb(255, 255, 255);
        position: relative;
        margin-top: -10px;
      }

      .section {
        font-size: 1.5em;
        margin-bottom: 0.2em;
        color: var(--color-text-dark);
      }

      .collapse-toggle {
        width: 0.5em;
        cursor: pointer;
        display: block;
        margin-right: 5px;
        margin-top: 3px;
        margin-bottom: 3px;
      }

      .collapse-toggle:hover {
        background: rgb(100, 100, 100, 0.05);
      }

      .item {
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
        display: flex;
        font-size: 1em;
        --icon-color: var(--color-text-dark);
      }

      .item.selected {
        background: var(--color-selection);
        color: var(--color-primary-dark);
        --icon-color: var(--color-primary-dark);
      }

      .root {
        display: flex;
        flex-direction: row;
        height: 100%;
      }

      .level {
        display: flex;
        flex-direction: column;
      }

      .level.hidden {
        display: none;
      }

      .submenu {
      }

      .level-0 > .item {
        background: var(--color-primary-dark);
        --icon-color: #fff;
        font-size: 1em;
      }

      .level-0 > .top {
        padding-top: var(--menu-padding);
        background: var(--color-primary-dark);
      }

      .level-0 > .empty {
        background: var(--color-primary-dark);
        align-self: stretch;
        flex-grow: 1;
      }

      .level-0 > .bottom {
        height: 1em;
        background: var(--color-primary-dark);
      }

      .level-0 > .item > .details {
        display: none !important;
      }

      .level-0.expanding {
      }

      .level-0.expanded {
        background: inherit;
      }

      .level-0 > .item.selected {
        background: inherit;
        --icon-color: var(--color-primary-dark);
      }

      .level {
        padding: var(--menu-padding);
      }

      .level-0 {
        padding: 0px;
      }

      .item {
        padding: 0.2em 0.75em;
        margin-top: 0.1em;
        border-radius: var(--curvature);
        display: flex;
        min-width: 12em;
        max-width: 12em;
      }

      .item > temba-icon {
        margin-right: 0.5em;
      }

      .item.inline > temba-icon {
      }

      .item > .details > .name {
        flex-grow: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 0;
      }

      .level-0 > .item {
        padding: 1em 1em;
        margin-top: 0em;
        border-radius: 0px;
        min-width: inherit;
        max-width: inherit;
      }

      .level-0 > .item > temba-icon {
        margin-right: 0px;
      }

      .level-0 > .item > .name {
        min-width: 0px;
      }

      .count {
        align-self: center;
        margin-left: 1em;
        font-size: 0.8em;
        font-weight: 400;
      }

      .level-0 > .item-top {
        background: var(--color-primary-dark);
        min-height: var(--curvature);
      }

      .level-0 > .item-bottom {
        background: var(--color-primary-dark);
        min-height: var(--curvature);
      }

      .level-0 > .item-bottom.selected {
        border-top-right-radius: var(--curvature);
      }

      .level-0 > .item-top.selected {
        border-bottom-right-radius: var(--curvature);
      }

      .level-0 > .selected-top {
      }

      .level-0 > .item:hover {
        background: rgba(var(--primary-rgb), 0.85);
      }

      .level-0 > .item.selected:hover {
        background: inherit;
      }

      .inline-children {
      }

      .inline-children .item {
      }

      .item.inline {
        border: 0px solid transparent;
      }

      .level-1,
      .level-2 {
        border-right: 1px solid rgba(0 0 0 / 8%);
        box-shadow: rgb(0 0 0 / 6%) 4px 0px 6px 1px;
      }

      .level-1 {
        transition: opacity 100ms linear, margin 200ms linear;
        overflow-y: scroll;
        z-index: 1500;
      }

      .level-2 {
        background: #fbfbfb;
        overflow-y: auto;
        z-index: 1000;
      }

      .level-2 .item .details {
        overflow: hidden;
      }

      .level-2 .item {
        min-width: 12em;
        max-width: 12em;
      }

      .level-1 .item {
        overflow: hidden;
        max-width: 12em;
        min-width: 12em;
        min-height: 1.5em;
        max-height: 1.5em;
        transition: min-width var(--transition-speed) !important;
      }

      .level-1 .item .details {
      }

      .collapsed .item {
        overflow: hidden;
        min-width: 0;
        margin: 0;
      }

      .item .details {
        opacity: 1;
        min-height: 1.5em;
        max-height: 1.5em;
        align-items: center;
      }

      .item .details .name {
      }

      .item temba-icon {
      }

      .collapsed .item {
        margin-bottom: 0.5em;
      }

      .collapsed .item .details {
        overflow: hidden;
        max-height: 0em;
        max-width: 0em;
      }

      .collapsed .item .details {
        max-height: 0em;
      }

      .collapsed .item temba-icon {
        margin-right: 0;
      }

      .section {
        max-width: 12em;
      }

      .collapsed .section {
        opacity: 0;
        max-width: 0em;
        max-height: 0.6em;
      }

      .collapsed.level-1 {
        overflow: hidden;
        padding: 0.5em;
        --icon-color: #999;
      }

      .collapsed .item .right {
        flex-grow: 1;
      }

      .collapse-icon {
        display: none;
      }

      .collapsed .collapse-icon {
        --icon-color: #ccc;
        display: block;
      }

      .collapsed .item.iconless {
        max-height: 0em;
        padding: 0em;
        min-height: 0em;
        margin-bottom: 0em;
      }

      .divider {
        height: 1px;
        background: #f3f3f3;
        margin: 0.5em 0.75em;
        min-height: 1px;
      }

      .space {
        margin: 0.5em;
      }

      .collapsed .divider {
        height: 0;
        margin: 0;
        padding: 0;
        min-height: 0px;
      }

      .sub-section {
        font-size: 1rem;
        color: #888;
        margin-top: 1rem;
        margin-left: 0.3rem;
      }

      .fully-collapsed .level-0 {
        z-index: 1;
      }

      .fully-collapsed .level-1 {
        margin-left: -245px;
        z-index: 0;
        border: none;
      }

      .fully-collapsed .level-1 .item,
      .fully-collapsed .level-1 .divider {
        opacity: 0;
      }

      .fully-collapsed .level-2,
      .fully-collapsed .level-3 {
        display: none;
      }

      temba-button {
        margin-top: 0.2em;
        margin-bottom: 0.2em;
        margin-left: 0.75em;
        margin-right: 0.75em;
      }
    `;
  }

  @property({ type: Boolean })
  wraps = false;

  @property({ type: Boolean })
  wait: boolean;

  @property({ type: String })
  endpoint: string;

  @property({ type: String })
  expanding: string;

  @property({ type: String })
  value: string;

  // submenu to constrain to
  @property({ type: String })
  submenu: string;

  @property({ type: Boolean })
  collapsed: boolean;

  // http promise to monitor for completeness
  public httpComplete: Promise<void>;

  root: MenuItem;
  selection: string[] = [];
  pending: string[] = [];
  state: { [id: string]: MenuItemState } = {};

  constructor() {
    super();
  }

  public setBubble(id: string, color: string) {
    const found = findItem(this.root.items, id);
    if (found && found.item) {
      found.item.bubble = color;
      this.requestUpdate('root');
      return true;
    }
    return false;
  }

  private getMenuItemState(id: string): MenuItemState {
    let itemState = {};
    if (id) {
      itemState = this.state[id];
      if (!itemState) {
        itemState = {};
        this.state[id] = itemState;
      }
    }
    return itemState;
  }

  public updated(changes: Map<string, any>) {
    if (changes.has('value')) {
      this.setSelection((this.value || '').split('/'));
    }

    if (changes.has('submenu') && !changes.has('value')) {
      this.setSelection([this.submenu]);
    }

    if (changes.has('endpoint')) {
      this.root = {
        level: -1,
        endpoint: this.endpoint,
      };

      if (!this.wait) {
        this.loadItems(this.root);
      }
    }
  }

  public refresh(path: string[] = null) {
    if (!path) {
      path = [...this.selection];
    }

    // go up the tree until we find an endpoint
    const item = this.getMenuItemForSelection(path);

    if (item.endpoint) {
      this.loadItems(item, false);
    } else {
      path.pop();
      this.refresh(path);
    }
  }

  private fireNoPath(missingId: string) {
    const item = this.getMenuItem();

    const details = {
      item: item.id,
      selection: '/' + this.selection.join('/'),
      endpoint: item.endpoint,
      path: missingId + '/' + this.pending.join('/') + document.location.search,
    };

    // remove any excess from our selection
    const selection = this.selection.join('/');
    selection.replace(details.path, '');
    this.selection = selection.split('/');

    this.fireCustomEvent(CustomEventType.NoPath, details);
    this.pending = [];
    this.requestUpdate('root');
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private loadItems(item: MenuItem, selectFirst = true) {
    if (item && item.endpoint) {
      item.loading = true;
      this.httpComplete = fetchResults(item.endpoint).then(
        (items: MenuItem[]) => {
          // update our item level
          items.forEach(subItem => {
            subItem.level = item.level + 1;
            // if we came with preset items, set the level for them accordingly
            if (subItem.items) {
              subItem.items.forEach(inlineItem => {
                inlineItem.level = item.level + 2;
                // inlineItem.parent = subItem;
              });
            }
          });

          item.items = items;
          item.loading = false;
          this.requestUpdate('root');
          this.scrollSelectedIntoView();
          if (this.pending && this.pending.length > 0) {
            // auto select the next pending click
            const nextId = this.pending.shift();
            if (nextId && items.length > 0) {
              const nextItem = findItem(items, nextId);
              if (nextItem.item) {
                this.handleItemClicked(null, nextItem.item);
              } else {
                this.fireNoPath(nextId);
              }
            }
          } else {
            // auto select the first item
            if (
              selectFirst &&
              items.length > 0 &&
              this.selection.length >= 1 &&
              !item.inline
            ) {
              for (const item of items) {
                if (!item.type) {
                  this.handleItemClicked(null, item);
                  break;
                }
              }
            }
          }
        }
      );
    }
  }

  private handleItemClicked(
    event: MouseEvent,
    menuItem: MenuItem,
    parent: MenuItem = null
  ) {
    if (parent && parent.inline) {
      this.handleItemClicked(null, parent);
    }

    if (this.collapsed) {
      this.collapsed = false;
    }

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (menuItem.type == 'modax-button') {
      this.fireCustomEvent(CustomEventType.ButtonClicked, {
        title: menuItem.name,
        href: menuItem.href,
        on_submit: menuItem.on_submit,
      });
      return;
    }

    if (menuItem.trigger) {
      new Function(menuItem.trigger)();
    } else {
      if (menuItem.level === 0) {
        /* this.expanding = menuItem.id;
        window.setTimeout(() => {
          this.expanding = null;
        }, 60);
        */
      }

      // update our selection
      if (menuItem.level >= this.selection.length) {
        this.selection.push(menuItem.vanity_id || menuItem.id);
      } else {
        this.selection.splice(
          menuItem.level,
          this.selection.length - menuItem.level,
          menuItem.vanity_id || menuItem.id
        );
      }

      if (menuItem.endpoint) {
        this.loadItems(menuItem, !menuItem.href);
        this.dispatchEvent(new Event('change'));
      } else {
        if (this.pending && this.pending.length > 0) {
          // auto select the next pending click
          const nextId = this.pending.shift();
          const item = this.getMenuItem();
          if (nextId && item && item.items && item.items.length > 0) {
            const nextItem = findItem(item.items, nextId).item;
            if (nextItem) {
              this.handleItemClicked(null, nextItem);
            } else {
              this.fireNoPath(nextId);
            }
          } else {
            this.fireNoPath(nextId);
          }
        } else {
          this.dispatchEvent(new Event('change'));
        }
        this.requestUpdate('root');
      }
    }
  }

  public scrollSelectedIntoView() {
    // makes sure we are scrolled into view
    window.setTimeout(() => {
      const eles = this.shadowRoot.querySelectorAll('.selected');
      eles.forEach(ele => {
        ele.scrollIntoView({ block: 'end', behavior: 'smooth' });
      });
    }, 0);
  }

  public clickItem(id: string): boolean {
    const path = [...this.selection];
    path.splice(path.length - 1, 1, id);
    const item = this.getMenuItemForSelection(path);

    if (item) {
      this.handleItemClicked(null, item);
      this.scrollSelectedIntoView();
      return true;
    }
    return false;
  }

  public getMenuItem(): MenuItem {
    return this.getMenuItemForSelection([...this.selection]);
  }

  public getMenuItemForSelection(selection: string[]) {
    const path = [...selection];
    let items = this.root.items;
    let item = null;
    while (path.length > 0) {
      const step = path.splice(0, 1)[0];
      if (items) {
        item = findItem(items, step).item;
        if (item) {
          items = item.items;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return item;
  }

  public getSelection() {
    return this.selection;
  }

  public setSelection(path: string[]) {
    this.pending = [...path];
    this.selection = [];

    if (this.wait) {
      this.wait = false;
      this.loadItems(this.root);
    }
  }

  public setSelectionPath(path: string) {
    const asPath = path.split('/').filter(step => !!step);

    // first try to click in the current space
    const clicked = this.clickItem(asPath[asPath.length - 1]);

    if (!clicked) {
      this.wait = true;
      this.setSelection(asPath);
    }
  }

  public async setFocusedItem(path: string) {
    const focusedPath = path.split('/').filter(step => !!step);

    // if we don't match at the first level, we are a noop
    if (focusedPath.length > 0) {
      const rootItem = findItem(this.root.items, focusedPath[0]).item;
      if (!rootItem) {
        return;
      }
    }

    const newPath = [];
    let level = this.root;
    while (focusedPath.length > 0) {
      const nextId = focusedPath.shift();
      if (nextId) {
        if (!level.items) {
          this.loadItems(level, false);
          await this.httpComplete;
        }

        level = findItem(level.items, nextId).item;
        if (!level) {
          focusedPath.splice(0, focusedPath.length);
        } else {
          newPath.push(nextId);
        }
      }
    }

    this.selection = newPath;
    this.requestUpdate('root');
  }

  private isSelected(menuItem: MenuItem) {
    if (menuItem.level < this.selection.length) {
      const selected =
        this.selection[menuItem.level] == (menuItem.vanity_id || menuItem.id);
      return selected;
    }
    return false;
  }

  private isExpanded(menuItem: MenuItem) {
    const expanded = !!this.selection.find(
      id => id === menuItem.vanity_id || menuItem.id
    );
    return expanded;
  }

  private renderMenuItem = (
    menuItem: MenuItem,
    parent: MenuItem = null
  ): TemplateResult => {
    if (menuItem.type === 'divider') {
      return html`<div class="divider"></div>`;
    }

    if (menuItem.type === 'space') {
      return html`<div class="space"></div>`;
    }

    if (menuItem.type === 'section' || menuItem.inline) {
      return html`<div class="sub-section">${menuItem.name}</div>`;
    }

    if (menuItem.type === 'modax-button') {
      return html`<temba-button
        name=${menuItem.name}
        @click=${event => {
          this.handleItemClicked(event, menuItem);
        }}
      />`;
    }

    const isSelected = this.isSelected(menuItem);
    const isChildSelected =
      isSelected && this.selection.length > menuItem.level + 1;

    const icon = menuItem.icon
      ? html`<temba-icon
            size="${menuItem.level === 0 ? '1.5' : '1'}"
            name="${menuItem.icon}"
          ></temba-icon
          >${menuItem.bubble
            ? html`<div
                style="background-color: ${menuItem.bubble}"
                class="bubble"
              ></div>`
            : null}`
      : null;

    const collapsedIcon = menuItem.collapsed_icon
      ? html`<temba-icon
          size="${menuItem.level === 0 ? '1.5' : '1'}"
          name="${menuItem.collapsed_icon}"
          class="collapse-icon"
        ></temba-icon>`
      : null;

    const itemClasses = getClasses({
      ['menu-' + menuItem.id]: true,
      'child-selected': isChildSelected,
      selected: isSelected,
      item: true,
      inline: menuItem.inline,
      expanding: this.expanding && this.expanding === menuItem.id,
      expanded: this.isExpanded(menuItem),
      iconless: !icon && !collapsedIcon,
    });

    const item = html` <div
        class="item-top ${isSelected ? 'selected' : null} "
      ></div>

      <div
        id="menu-${menuItem.id}"
        class="${itemClasses}"
        @click=${event => {
          this.handleItemClicked(event, menuItem, parent);
        }}
      >
        ${menuItem.level === 0
          ? html`<temba-tip
              style="display:flex;"
              text="${menuItem.name}"
              position="right"
              >${icon}</temba-tip
            >`
          : html`${icon}${collapsedIcon}`}

        <div class="details" style="flex-grow:1;display:flex">
          <div
            class="name"
            style="flex-grow:1; flex-shrink:0; white-space: ${this.wraps
              ? 'normal'
              : 'nowrap'};"
          >
            ${menuItem.name}
          </div>
          ${menuItem.level > 0
            ? menuItem.inline
              ? html`<temba-icon
                  name="chevron-${isSelected || isChildSelected
                    ? 'up'
                    : 'down'}"
                ></temba-icon>`
              : html`${menuItem.count || menuItem.count == 0
                  ? html`
                      <div class="count">
                        ${menuItem.count.toLocaleString()}
                      </div>
                    `
                  : html`<div class="count"></div>`}`
            : null}
        </div>
        <div class="right"></div>
      </div>

      <div class="item-bottom ${isSelected ? 'selected' : null}"></div>`;

    return item;
  };

  public render(): TemplateResult {
    if (!this.root || !this.root.items) {
      return html`<temba-loading
        units="3"
        size="10"
        direction="column"
        style="margin:1em;margin-right:0em"
      />`;
    }

    let items = this.root.items || [];
    const levels = [];

    levels.push(
      html`<div class="level level-0 ${this.submenu ? 'hidden' : ''}">
        <div class="top"></div>

        ${items
          .filter(item => !item.bottom)
          .map((item: MenuItem) => {
            return this.renderMenuItem(item);
          })}

        <div class="empty"></div>
        ${items
          .filter(item => !!item.bottom)
          .map((item: MenuItem) => {
            return this.renderMenuItem(item);
          })}
        <div class="bottom"></div>
      </div>`
    );

    this.selection.forEach((id, index) => {
      const selected = findItem(items, id).item;

      let collapsed = false;
      if (selected) {
        items = selected.items;
        const itemState = this.getMenuItemState(selected.id);
        // users set an explicit collapse state
        if (itemState.collapsed) {
          collapsed = itemState.collapsed === 'collapsed';
        }
        // otherwise pick a default collapse state
        else {
          if (this.selection.length > selected.level + 2) {
            collapsed = false;
          }
        }
      } else {
        items = null;
      }

      if (items && items.length > 0 && !selected.inline) {
        levels.push(
          html`<div
            class="${getClasses({
              level: true,
              ['level-' + (index + 1)]: true,
              collapsed,
            })}"
          >
            ${!this.submenu
              ? html`<div class="section">${selected.name}</div>`
              : null}
            ${items.map((item: MenuItem) => {
              if (item.inline && item.items) {
                return html`${this.renderMenuItem(item)}
                  <div class="inline-children">
                    ${(item.items || []).map((child: MenuItem) => {
                      return this.renderMenuItem(child, item);
                    })}
                  </div>`;
              }
              return this.renderMenuItem(item);
            })}
          </div>`
        );
      }
    });

    const menu = html`<div
      class="${getClasses({
        root: true,
        'fully-collapsed': this.collapsed,
      })}"
    >
      ${levels}
    </div>`;
    return html`${menu}`;
  }
}
