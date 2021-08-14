import { ipcRenderer } from 'electron';
import logger from 'electron-log';
import { ConfigEventTypes, } from '../../web_modules/@advanced-rest-client/arc-events/index.js';
import { PreferencesProxy } from './PreferencesProxy.js';

/** @typedef {import('@advanced-rest-client/arc-events').ConfigStateUpdateEvent} ConfigStateUpdateEvent */


/**
 * A proxy for the renderer process to communicate with the WindowManager
 */
export class WindowProxy {
  settings = new PreferencesProxy();

  systemVariablesEnabled = false;

  /**
   * Queries for the initial data the page was loaded with.
   */
  async initContextMenu() {
    ipcRenderer.send('window-context-menu-init');
    ipcRenderer.on('run-context-action', (e, action, ...args) => { 
      this.runContextAction(action, ...args) 
    });
    await this.initConfig();
    window.addEventListener(ConfigEventTypes.State.update, this.configStateChangeHandler.bind(this));
  }

  async initConfig() {
    let cnf = {};
    try {
      cnf = await this.settings.read();
    } catch (e) {
      // ...
    }

    if (cnf.request && typeof cnf.request.useSystemVariables === 'boolean') {
      this.systemVariablesEnabled = cnf.request.useSystemVariables;
    }
  }

  /**
   * @param {string} action
   * @param {...any} args
   */
  runContextAction(action, ...args) {
    switch (action) {
      case 'insert-variable': this.renderVariablesSuggestions(args[0], args[1]); break;
      default: logger.error(`Unhandled action: ${action}`);
    }
  }

  /**
   * @returns {Element|undefined}
   */
  getShadowActiveElement() {
    let current = document.activeElement;
    if (!current) {
      return undefined;
    }
    const guard = true;
    while (guard) {
      if (current.shadowRoot && current.shadowRoot.activeElement) {
        current = current.shadowRoot.activeElement;
      } else {
        break;
      }
    }
    return current;
  }

  /**
   * Renders variables suggestions on an input element.
   * It checks the document's active element for the target input.
   * If the active element is not an input then it does nothing.
   * 
   * @param {number} x
   * @param {number} y
   */
  renderVariablesSuggestions(x, y) {
    const target = this.getShadowActiveElement();
    if (!target || target.localName !== 'input') {
      return;
    }
    let list = document.querySelector('variables-suggestions');
    if (!list) {
      list = document.createElement('variables-suggestions');
      list.systemVariablesEnabled = this.systemVariablesEnabled;
      document.body.appendChild(list);
    }
    list.input = /** @type HTMLInputElement */ (target);
    list.style.top = `${y}px`;
    list.style.left = `${x}px`;
    list.opened = true;
  }

  /**
   * @param {ConfigStateUpdateEvent} e
   */
  configStateChangeHandler(e) {
    const { key, value } = e.detail;
    if (key === 'request.useSystemVariables') {
      this.systemVariablesEnabled = value;
      const list = document.querySelector('variables-suggestions');
      if (list) {
        list.systemVariablesEnabled = value;
      }
    }
  }
}
