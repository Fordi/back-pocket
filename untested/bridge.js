import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { LitElement } from "lit";

/**
 * Convert PascalCase to kebab-case, suitable for tag names.  For consecutive capitals, the last in the series is seen
 * as the start of a new word if it's followed by further lowercases - e.g., `UserURLEntry` would become
 * `user-url-entry`, but `UserURL` would become `user-url`.  Underscores ("_") are converted to `--`.
 * @param {string} str Any PascalCase identifier (A-Z, a-z, 0-9, _)
 * @returns {string} The corresponding kebab-case identifier
 */
const pascalToKebab = (str) => str.split('_').map(s => s.replace(/([a-z0-9])([A-Z])|([A-Z]+)([A-Z][a-z0-9])/g, "$1$3-$2$4").toLowerCase()).join('--');

/**
 * Create a Lit-like web component from a React component.
 * @param {object} properties Similar to LitElement.get properties; an object describing the interface to the React
 * component (see notes)
 * @param {string} properties["@name"] Force the element name for the component.  Default is based on the `.name` 
 * property of `ReactComp`, where it will be transformed from PascalCase to kebab-case.
 * @param {React.FunctionalComponent|React.Component} ReactComp component to wrap
 * @returns {React.FunctionalComponent|React.Component} the react component
 *
 * @notes
 * 
 * The usage is something like:
 *
 * ```javascript
 * export default bridge({
 *      ".color": { type: String },
 *      "@click": { type: Function },
 *  }, function SampleReactComponent({
 *      color = 'green',
 *      onClick,
 *  }) {
 *      const wrappedClick = useCallback(() => {
 *          console.log(`You clicked the ${color} thing.`);
 *          return onClick();
 *      }, [onClick, color]);
 *      return (
 *          <div
 *              onClick={wrappedClick}
 *              style={{ color }}
 *          >
 *              testing...
 *          </div>
 *      );
 *  });
 * ```
 *
 * The component's name will be derived from the class/function name, e.g., SampleReactComponent will become usable as
 * `<sample-react-component/>`.  This can be overridden (or provided, in the case of anonymous functions) by passing a
 * special `@name` property.
 *
 * `@eventname` properties will be automatically mapped to `onEventname`.  Note that only the character following `on`
 * is capitalized if it wasn't so in the lit event.  So `@mousemove` will become `onMousemove`.
 * 
 * `.key` properties are carried directly into the React world as props, sans the leading dot.  Non-dotted properties
 * are carried into React as strings.
 *
 * It is recommended only to use this utility for Lit's entry points into the React world; it should not be used to
 * expose every React component as a web component.  React components should use <SampleReactComponent ... /> as usual.
 */
export default function bridge(properties, ReactComp) {
    const name = ReactComp.name;
    const elem = properties['@name'] ?? pascalToKebab(name);
    const safeProps = { ...properties };
    delete safeProps['@name'];
    const nameEvent = (eventName) => {
        `on${eventName.substring(0, 1).toUpperCase()}${eventName.substring(1)}`;
    }
    class Wrapper extends LitElement {
        constructor() {
            super();
            this._state = {};
            this._scheduled = undefined;
            this._root = undefined;
        }
        connectedCallback() {
            this._root = createRoot(this);
            this.updateState({
                parentElement: this.parentElement,
            });
        }
        disconnectedCallback() {
            this._root = undefined;
            this.updateState({
                parentElement: undefined,
            });
        }
        updateState(props = {}) {
            let rerender = false;
            Object.keys(props).forEach(key => {
                if (this._state[key] !== props[key]) {
                    this._state[key] = props[key];
                    rerender = true;
                }
            })
            if (rerender) {
                this.scheduleRender();
            }
        }
        scheduleRender() {
            if (!this._scheduled) {
                this._scheduled = requestAnimationFrame(() => {
                    if (this._root) {
                        this._root.render(createElement(ReactComp, this._state));
                    }
                    this._scheduled = false;
                });
            }
        }
        static get properties() {
            return safeProps;
        }
        static get name() {
            return name;
        }
        addEventListener(eventName, handler, bubbles) {
            if (`@${eventName}` in safeProps && typeof handler === 'object' && typeof bubbles === 'function') {
                this.updateState({
                    [nameEvent(eventName)]: bubbles,
                });
            } else {
                super.addEventListener(eventName, handler, bubbles);
            }
        }
        removeEventListener(eventName, handler, bubbles) {
            if (`@${eventName}` in safeProps && typeof handler === 'object' && typeof bubbles === 'function') {
                this.updateState({
                    [nameEvent(eventName)]: undefined,
                });
            } else {
                super.removeEventListener(eventName, handler, bubbles);
            }
        }
        setAttribute(key, value) {
            const rv = super.setAttribute(key, value);
            this.updateState({ [key]: value });
            return rv;
        }
    }
    
    Object.defineProperties(Wrapper.prototype, Object.keys(safeProps)
        .filter(key => key.startsWith('.'))
        .map((litName) => litName.substring(1))
        .reduce((d, key) => ({
            ...d,
            [key]: {
                configurable: true,
                enumerable: true,
                get() {
                    return this._state[key];
                },
                set(v) {
                    if (this._state[key] !== v) {
                        this.updateState({
                            [key]: v
                        })
                    }
                },
            }
        }), {})
    );
    customElements.define(elem, Wrapper);
    return ReactComp;
};
