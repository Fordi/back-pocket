import { hljs, minify, format, monacoLoader } from "./dependencies.js";
const monaco = await monacoLoader.init();

const unindent = (s) => {
  const lines = s.split("\n");
  while (/^[\s\t]*$/.test(lines[0])) {
    lines.shift();
  }
  while (/^[\s\t]*$/.test(lines[lines.length - 1])) {
    lines.pop();
  }
  const trim = (lines?.[0]?.match(/^[\s\t]+/) ?? [])[0]?.length ?? 0;
  return lines.map((line) => {
    if (/^[\s\t]*$/.test(line.substr(0, trim))) {
      return line.substr(trim)
    }
    return line;
  }).join("\n");
};

const escapeHtml = s => s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const bookmarkify = async (code, name, description) => {
  const minified = escapeHtml((await minify(code)).code);
  const source = unindent(code);
  const link = document.createElement("div");
  let href = `javascript:${minified}`;
  link.className = "bookmarklet";
  link.innerHTML = `
      <button title="see code"></button>
      <a title="drag to your bookmarks bar" href="${href}">
        ${escapeHtml(name ?? "Drag to address bar")}
      </a>
      ${description ? `<p>${description}</p>` : ''}
      <pre title="click to copy source">${hljs.HighlightJS.highlightAuto(source).value}</pre>
    `;
  const pre = link.querySelector("pre");
  pre.addEventListener('click', (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(source);
    pre.classList.add('pulse');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        pre.classList.remove('pulse');
      });
    });
  });
  link.addEventListener("click", () => {
    if (link.classList.contains("nopop")) {
      return;
    }
    if (link.classList.contains("open")) {
      link.classList.remove("open");
    } else {
      const p = link.querySelector('pre');
      if (!p.id) {
        p.id = `pre_${Math.random().toString(36).slice(2)}`;
        p.style.maxHeight = 'unset';
        const height = p.clientHeight;
        p.style.maxHeight = '';
        const rule = `.bookmarklet.open > #${pre.id} { max-height: ${height}px; }`;
        const sheet = document.createElement('style');
        sheet.type = 'text/css';
        sheet.textContent = rule;
        document.head.appendChild(sheet);
      }
      requestAnimationFrame(() => link.classList.add("open"));
    }
    return false;
  });
  link.querySelector('a').addEventListener('click', (e) => {
    e.preventDefault();
    return true;
  });
  return link;

}
await Promise.all([...document.querySelectorAll("script[bookmarklet], textarea[bookmarklet]")].map(
  async (bookmarklet) => {
    if (bookmarklet.tagName.toUpperCase() === 'TEXTAREA') {
      bookmarklet.value = unindent(`${localStorage.getItem('bookmarklet') ?? bookmarklet.value}\n`);
      // bookmarklet.classList.add("ready");
      const container = document.createElement('div');
      container.classList.add("editor");
      const { top } = bookmarklet.getBoundingClientRect();
      
      container.style.bottom = 0;
      container.style.top = `${top}px`;
      container.style.position = 'absolute';
      container.style.left = 0;
      container.style.right = 0;
      document.body.style.overflow = 'hidden';
      // bookmarklet.style.display = 'none';
      bookmarklet.parentNode.insertBefore(container, bookmarklet);
      const editor = monaco.editor.create(container, {
        value: bookmarklet.value,
        language: "javascript",
        automaticLayout: true,
        theme: 'vs-dark',
        enableDropIntoEditor: true,
      });
      const onChange = async () => {
        const value = editor.getModel().getValue();
        localStorage.setItem('bookmarklet', value);
        const link = await bookmarkify(value);
        link.classList.add('top');
        link.classList.add('nopop');
        const sib = bookmarklet.nextElementSibling;
        const parent = bookmarklet.parentNode;
        if (bookmarklet.nextElementSibling) {
          if (sib.tagName.toUpperCase() === 'DIV' && sib.classList.contains("bookmarklet")) {
            parent.replaceChild(link, sib);
          } else {
            parent.insertBefore(link, sib);
          }
        } else {
          parent.appendChild(link);
        }
      };
      const checkForBookmarklet = async (string) => {
        if (!string.startsWith('javascript:')) return false;
        const code = new TextDecoder().decode(
          new Uint8Array([
            ...string.slice(11).replace(/%([0-9a-fA-F]{2})/g, (_, v) => 
              String.fromCharCode(parseInt(v, 16))
            )
          ].map((ch) => ch.charCodeAt(0)))
        );
        const result = format(code);
        return result;
      }
      editor.getModel().onDidChangeContent(onChange);
      editor.onDropIntoEditor((drop) => {
        const e = drop.event;
        e.preventDefault();
        (async () => {
          if (e.dataTransfer?.items?.length) {
            const item = [...e.dataTransfer.items].find(({ type }) => 'text/plain');
            const link = await new Promise(r => item.getAsString(r));
            const formatted = await checkForBookmarklet(link);
            editor.getModel().setValue(formatted);
          }
        })();
        return false;
      });
      await onChange();
    } else {
      const code = bookmarklet.innerHTML.replace(/^[\s\r\n\t]*(?:\(\)[\s\r\n\t]*=>|function)[\s\r\n\t]*\{|\};[\s\r\n\t]*?$|<!\[CDATA\[|]]>/g, '');
      const name = bookmarklet.getAttribute("name").trim();
      const description = bookmarklet.getAttribute('bookmarklet');
      const link = await bookmarkify(code, name, description);
      bookmarklet.parentNode.insertBefore(link, bookmarklet);
    }

  }
));