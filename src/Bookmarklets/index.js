import hljs from 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/es/highlight.min.js';
import { minify } from 'terser';

const unindent = (s) => {
  const lines = s.split("\n");
  while (/^[\s\t]*$/.test(lines[0])) {
    lines.shift();
  }
  while (/^[\s\t]*$/.test(lines[lines.length - 1])) {
    lines.pop();
  }
  const trim = lines[0].match(/^[\s\t]+/)[0].length;
  return lines.map((line) => {
    if (/^[\s\t]*$/.test(line.substr(0, trim))) {
      return line.substr(trim)
    }
    return line;
  }).join("\n");
};
const escapeHtml = s => s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
await Promise.all([...document.querySelectorAll("script[bookmarklet]")].map(
  async (bookmarklet) => {
    const code = bookmarklet.innerHTML.replace(/^[\s\r\n\t]*(?:\(\)[\s\r\n\t]*=>|function)[\s\r\n\t]*\{|\};[\s\r\n\t]*?$|<!\[CDATA\[|]]>/g, '');
    console.log(code);
    const minified = escapeHtml((await minify(code)).code);
    const source = unindent(code);
    const link = document.createElement("div");
    let href = `javascript:${minified}`;
    link.className = "bookmarklet";
    link.innerHTML = `
      <button title="see code"></button>
      <a title="drag to your bookmarks bar\nclick to see code" href="${href}">
        ${escapeHtml(bookmarklet.getAttribute("name"))}
      </a>
      <p>${bookmarklet.getAttribute('bookmarklet')}</p>
      <pre title="click to copy source">${hljs.highlightAuto(source).value}</pre>
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
      if (link.classList.contains("open")) {
        link.classList.remove("open");
      } else {
        link.classList.add("open");
      }
      return false;
    });
    link.querySelector('a').addEventListener('click', (e) => {
      e.preventDefault();
      return true;
    });
    bookmarklet.parentNode.insertBefore(link, bookmarklet);
  }
));