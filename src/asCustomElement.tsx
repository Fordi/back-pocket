/**
 * spike to wrap a React component as a custom HTMLElement in Ion
 */
import { fromISODateString, toISODateString } from "@cesium/ion-core";
import { ProviderElement } from "./ProviderElement";
import { defined } from "cesium";
import { ComponentType } from "react";

export type AttributePropertyMapper<T = any> = [
  fromAttr: (
    attr: string | null | undefined,
    attrName: string,
    propName: string,
  ) => T | undefined,
  toAttr: (
    value: T | undefined,
    attrName: string,
    propName: string,
  ) => string | undefined,
];

export const NumberAttr: AttributePropertyMapper<number> = [
  (attr?: string | null) => {
    if (!attr || attr === "") {
      return undefined;
    }
    const number = Number(attr);
    if (isNaN(number)) {
      return undefined;
    }
    return number;
  },
  (value?: number | null) => {
    if (!defined(value)) {
      return undefined;
    }
    return String(value);
  },
];

export const StringAttr: AttributePropertyMapper<string> = [
  (attr?: string | null) => attr ?? undefined,
  (value?: string | null) => value ?? undefined,
];

export const BooleanAttr: AttributePropertyMapper<boolean> = [
  (attr?: string | null | boolean) => {
    return attr === "true" || attr === "yes" || attr === true;
  },
  (value: boolean | undefined, name: string) => {
    return value ? name : undefined;
  },
];

export function JsonAttr<T>(): AttributePropertyMapper<T> {
  return [
    (attr?: string | null) => (attr ? (JSON.parse(attr) as T) : undefined),
    (value?: T | null) => (value ? JSON.stringify(value) : undefined),
  ];
}

export const DayAttr: AttributePropertyMapper<Date> = [
  (attr?: string | null) => {
    return attr ? fromISODateString(attr) : undefined;
  },
  (value: Date | undefined) => {
    return value ? toISODateString(value) : undefined;
  },
];

export const propToAttribute = (propName: string) =>
  propName
    // Trailing all-caps names, like innerHTML -> inner-html
    .replace(/[A-Z]+$/g, (c) => `-${c.toLowerCase()}`)
    // Interior all-caps names, like xmlHTTPRequest -> xml-http-request
    .replace(
      /([A-Z]+)([A-Z])/g,
      (_, a, b) => `-${a.toLowerCase()}-${b.toLowerCase()}`,
    )
    // All other interior caps
    .replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

export function asCustomElement<T>(
  Component: ComponentType<T>,
  attributes: Partial<Record<keyof T, AttributePropertyMapper>> = {},
) {
  const Element = class extends ProviderElement {
    static observedAttributes = Object.keys(attributes).map(propToAttribute);
    attributeChangedCallback() {
      this.requestRender();
    }
    render() {
      const props: any = {};
      for (const name of Object.keys(attributes)) {
        props[name] = (this as any)[name];
      }
      return <Component {...props} />;
    }
  };

  Object.entries(attributes).forEach(([propName, coercer]) => {
    const [fromAttr, toAttr] = coercer as AttributePropertyMapper;
    const attrName = propToAttribute(propName);
    Object.defineProperty(Element.prototype, propName, {
      get() {
        const attr = (this as unknown as ProviderElement).getAttribute(
          attrName,
        );
        return fromAttr(attr, attrName, propName);
      },
      set(value: any) {
        const attr = toAttr(value, attrName, propName);
        if (attr === undefined) {
          this.removeAttribute(attrName);
        } else {
          this.setAttribute(attrName, attr);
        }
      },
      configurable: true,
      enumerable: true,
    });
  });
  return Element as unknown as new (...args: any[]) => ProviderElement & T;
}

/**
 * Examples:

window.customElements.define(
  "ion-admin-user-notes",
  asCustomElement(UserNotes, { userId: NumberAttr }),
);

window.customElements.define(
  "ion-license-tracking-app-settings",
  asCustomElement(AppSettings),
);

window.customElements.define(
  "ion-admin-view-user-license-signature",
  asCustomElement(ViewUserLicenseSignature, {
    userId: NumberAttr,
    planCode: StringAttr,
    graceExpires: DayAttr,
  }),
);

window.customElements.define(
  "ion-admin-edit-user-license-signature",
  asCustomElement(EditUserLicenseSignature, {
    userId: NumberAttr,
    planCode: StringAttr,
    graceExpires: DayAttr,
  }),
);

 */