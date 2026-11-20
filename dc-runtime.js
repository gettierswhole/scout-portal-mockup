// Tiny renderer for the mockup pages: fills {{holes}}, <sc-for>, <sc-if> and onClick handlers.
(function () {
  var SVGNS = 'http://www.w3.org/2000/svg';
  var WHOLE = /^\{\{\s*([^}]+?)\s*\}\}$/, ANY = /\{\{\s*([^}]+?)\s*\}\}/g;
  var comp, tplRoot, mount;
  function lookup(scope, p) {
    p = p.trim();
    if (p === 'true') return true; if (p === 'false') return false;
    if (/^-?\d/.test(p)) return Number(p);
    return p.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, scope);
  }
  function interp(str, scope) { return str.replace(ANY, function (m, p) { var v = lookup(scope, p); return v == null ? '' : String(v); }); }
  function build(node, scope, ns, out) {
    if (node.nodeType === 3) { out.appendChild(document.createTextNode(interp(node.nodeValue, scope))); return; }
    if (node.nodeType !== 1) return;
    var tag = node.localName, kids = Array.prototype.slice.call(node.childNodes);
    if (tag === 'sc-for') {
      var list = lookup(scope, WHOLE.exec(node.getAttribute('list'))[1]) || [], as = node.getAttribute('as');
      list.forEach(function (it, i) { var s = Object.create(scope); s[as] = it; s.$index = i; kids.forEach(function (c) { build(c, s, ns, out); }); });
      return;
    }
    if (tag === 'sc-if') {
      if (lookup(scope, WHOLE.exec(node.getAttribute('value'))[1])) kids.forEach(function (c) { build(c, scope, ns, out); });
      return;
    }
    var elNS = tag === 'svg' ? SVGNS : ns;
    var el = elNS ? document.createElementNS(elNS, tag) : document.createElement(tag);
    Array.prototype.forEach.call(node.attributes, function (a) {
      var name = a.name, val = a.value, m = WHOLE.exec(val);
      if (name.indexOf('hint-') === 0) return;
      if (/^on[A-Z]/.test(name)) { var fn = m && lookup(scope, m[1]); var evName = name === 'onChange' && (tag === 'input' || tag === 'textarea') ? 'input' : name.slice(2).toLowerCase(); if (typeof fn === 'function') el.addEventListener(evName, fn); return; }
      if (m) { var v = lookup(scope, m[1]); if (v === false || v == null) return; el.setAttribute(name, v === true ? '' : String(v)); return; }
      el.setAttribute(name, interp(val, scope));
    });
    kids.forEach(function (c) { build(c, scope, elNS, el); });
    out.appendChild(el);
  }
  function render() {
    var vals = comp.renderVals() || {};
    var frag = document.createDocumentFragment();
    Array.prototype.forEach.call(tplRoot.childNodes, function (c) { build(c, vals, null, frag); });
    mount.replaceChildren(frag);
  }
  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (p) {
    if (typeof p === 'function') p = p(this.state);
    this.state = Object.assign({}, this.state, p); render();
  };
  DCLogic.prototype.forceUpdate = function () { render(); };
  var Base = class extends DCLogic {};
  Object.getOwnPropertyNames(DCLogic.prototype).forEach(function () {});
  var tplText = document.getElementById('dc-template').textContent;
  var doc = new DOMParser().parseFromString(tplText, 'application/xml');
  var err = doc.getElementsByTagName('parsererror')[0];
  if (err) { console.error(err.textContent); return; }
  tplRoot = doc.documentElement;
  mount = document.getElementById('dc-root');
  var Component = new Function('DCLogic', document.getElementById('dc-logic').textContent + '\nreturn Component;')(Base);
  comp = new Component({});
  render();
  if (typeof comp.componentDidMount === 'function') comp.componentDidMount();
})();
