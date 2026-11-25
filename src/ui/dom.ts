export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  opts?: { className?: string; text?: string; attrs?: Record<string, string> },
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (opts?.className) node.className = opts.className;
  if (opts?.text) node.textContent = opts.text;
  if (opts?.attrs) {
    for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
  }
  return node;
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function wordDiff(oldText: string, newText: string): HTMLElement {
  const wrap = el("div", { className: "diff" });
  const oldP = el("p", { className: "diff-old" });
  oldP.append(el("strong", { text: "Was" }), document.createTextNode(" "), document.createTextNode(oldText));
  const newP = el("p", { className: "diff-new" });
  newP.append(el("strong", { text: "Now" }), document.createTextNode(" "), document.createTextNode(newText));
  wrap.append(oldP, newP);
  return wrap;
}
