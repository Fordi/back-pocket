/**
 * HOC for cross cutting concern, debug mode
 */
let _debugMode = false;
const instancesWithDebugMode = new Set();
window.addEventListener("keydown", ({ code, ctrlKey, shiftKey, altKey }) => {
  if (code !== "KeyD" || !ctrlKey || !altKey) {
    return;
  }
  if (_debugMode !== !shiftKey) {
    _debugMode = !shiftKey;
    console.log(
      `${_debugMode ? "Entering" : "Exiting"} debug mode for ${
        instancesWithDebugMode.size
      } components`,
    );
    [...instancesWithDebugMode].forEach((instance) => {
      instance._debugMode = _debugMode;
    });
  }
});

export function withDebugMode(Class) {
  return class extends Class {
    constructor() {
      super();
      this._debugMode = _debugMode;
    }
    static get properties() {
      return {
        ...Class.properties,
        _debugMode: { type: Boolean },
      };
    }
    connectedCallback() {
      instancesWithDebugMode.add(this);
      super.connectedCallback();
    }
    disconnectedCallback() {
      instancesWithDebugMode.delete(this);
      super.disconnectedCallback();
    }
  };
}
