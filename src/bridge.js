import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { LitElement } from "lit";

/**
 * Create a Lit-like web component from a React component.  Alternately,
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
 * `<sample-react-component/>`.  This can be overridden by passing a special `@name` property.
 *
 * `@eventname` properties will be automatically mapped to `onEventname`.  Note that only the character following `on`
 * is capitalized if it wasn't so in the lit event.
 * 
 * `.key` properties are carried directly into the React world as props.  Non-dotted properties are carried into React
 *  as strings.
 *
 * It is recommended only to use this utility function for lit's entry points into the React world; it should not be
 * used to expose every React component as a web component.  React components should use
 * <SampleReactComponent ... /> as usual.
 */
export default function bridge(properties, ReactComp) {
    const name = ReactComp.name;
    const elem = properties['@name'] ?? (
        name
            .replace(/[A-Z]/g, m => `-${m.toLowerCase()}`) // MyCOOLComp => -my-c-o-o-l-comp
            .replace(/^-/g, '') // -my-c-o-o-l-comp => my-c-o-o-l-comp
            .replace(/-([a-z\-]+)-/g, (_, m) => _ && `-${m.replace(/-/g, '')}-`) // my-c-o-o-l-comp => my-cool-comp
    );
    const safeProps = { ...properties };
    delete safeProps['@name'];
    const toReactKVP = (key, inst) => {
        let value;
        if (key.startsWith('@')) {
            key = `on${key.substring(1, 2).toUpperCase()}${key.substring(2)}`;
            value = inst[key];
        } else if (key.startsWith('.')) {
            key = key.substring(1);
            value = inst[key];
        } else {
            value = inst.getAttribute?.(key) ?? inst[key];
        }
        return [key, value];
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
            if (this._root && rerender) {
                this.scheduleRender();
            }
        }
        scheduleRender() {
            if (!this._scheduled) {
                this._scheduled = requestAnimationFrame(() => {
                    this._root.render(createElement(ReactComp, this._state));
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
            if (typeof handler === 'object' && safeProps[`@${eventName}`] && typeof bubbles === 'function') {
                this.updateState({
                    [`on${eventName.substring(0, 1).toUpperCase()}${eventName.substring(1)}`]: bubbles,
                });
            } else {
                super.addEventListener(eventName, handler, bubbles);
            }
        }
        removeEventListener(eventName, handler, bubbles) {
            if (typeof handler === 'object' && safeProps[`@${eventName}`] && typeof bubbles === 'function') {
                this.updateState({
                    [`on${eventName.substring(0, 1).toUpperCase()}${eventName.substring(1)}`]: undefined,
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
        getState(key) {
            return this._state[key];
        }
    }
    const descs = {};
    Object.keys(safeProps).forEach((key) => {
        if (!key.startsWith('.')) {
            return;
        }
        key = key.substring(1);
        const [k] = toReactKVP(key, {});
        descs[k] = {
            configurable: true,
            enumerable: true,
            get() {
               return this.getState[k];
            },
            set(v) {
                if (this.getState[k] !== v) {
                    this.updateState({
                        [k]: v
                    })
                }
            },
        };
        return descs;
    });
    Object.defineProperties(Wrapper.prototype, descs);

    try {
        customElements.define(elem, Wrapper);
    } catch (e) {
        console.log(`${elem} already registered`);
    }

    return ReactComp;
};
