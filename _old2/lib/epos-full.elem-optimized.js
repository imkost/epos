(function () {
  var __scope_0 = new Array(1);

  var __get_scope_binding_0 = function (__selector) {
    var __captured;

    switch (__selector) {
      case 0:
        __captured = [1];
        break;

      default:
        throw new Error("Unknown scope selector");
    }

    __scope_0[__selector] = __captured;
    return __captured;
  };

  var _$0 = this;

  var _$1 = _$0.Symbol;
  var _$2 = _$0.Map;

  var _B = function (desc) {
    if (Array.isArray(desc)) {
      return _L(desc).map(_B);
    }

    if (typeof desc === 'number') {
      desc = desc.toString();
    }

    if (typeof desc === 'string') {
      return document.createTextNode(desc);
    }

    _M(desc);

    var tag = _N(desc);

    var children = _O(desc);

    var elem = document.createElement(tag);

    for (var key in desc) {
      if (_P(key)) {
        continue;
      }

      elem.setAttribute(key, desc[key]);
    }

    children.forEach(child => {
      elem.appendChild(child);
    });
    return elem;
  };

  var _M = function (desc) {
    if (_U(desc.href) && !desc.tag) {
      desc.tag = 'a';
    }
  };

  var _N = function (desc) {
    if ('tag' in desc) {
      var tag = desc.tag;

      if (_V(tag) && /^[\w-]+$/.test(tag)) {
        return tag;
      } else {
        throw 'Invalid tag name';
      }
    }

    return 'div';
  };

  var _O = function (desc) {
    if ('inner' in desc) {
      return _L(desc.inner).map(_B);
    }

    return [];
  };

  var _P = function (key) {
    return _Q.includes(key);
  };

  var _V = function (any) {
    return typeof any === 'string';
  };

  var _U = function (any) {
    return _V(any) && any;
  };

  var _L = function (any) {
    if (Array.isArray(any)) {
      return _T(any);
    }

    return [any];
  };

  var _T = function (array) {
    var flat = [];
    array.forEach(item => {
      if (Array.isArray(item)) {
        flat = flat.concat(_T(item));
      } else {
        flat.push(item);
      }
    });
    return flat;
  };

  var _2 = function (desc) {
    return _3(desc, true);
  };

  var _3 = function (desc, isView = false) {
    var __captured__scope_1 = __scope_0[0] || __get_scope_binding_0(0);

    if (desc.inner) {
      isView = true;
    }

    var proxy = new Proxy(desc, {
      get,
      set
    });

    _6.push(proxy);

    if (isView) {
      desc[_7] = true;
      desc.id = `epos${__captured__scope_1[0]}`;
      __captured__scope_1[0] += 1;
    }

    for (var key in desc) {
      var node = _I(proxy, desc, key);

      if (_H(desc[key])) {
        desc[key] = _3(desc[key], isView);
      }

      if (_G(desc[key])) {
        desc[key] = _F(desc[key], node);
        desc[key].forEach((v, i) => {
          if (_H(v)) {
            desc[key][i] = _3(v, isView);
          }
        });
      }

      proxy[key];
    }

    return proxy;

    function get(d, key) {
      if (key === '__desc') {
        return desc;
      }

      if (key === '__isProxy') {
        return true;
      }

      var node = _E(proxy, key);

      if (!node) {
        return desc[key];
      }

      if (!('value' in node)) {
        var value = desc[key];

        if (typeof value === 'function') {
          _A.push(node);

          value = value();

          _A.pop();

          if (_H(value)) {
            value = _3(value, isView);
          }

          if (_G(value)) {
            value.forEach((v, i) => {
              if (_H(v)) {
                value[i] = _3(v, isView);
              }
            });
          }
        }

        node.value = value;
      }

      if (_A.length) {
        var calcNode = _A[_A.length - 1];

        if (calcNode.freeze) {} else {
          node.infls.add(calcNode);
          calcNode.deps.add(node);
        }
      }

      return node.value;
    }

    function set(d, key, value) {
      var node = _E(proxy, key);

      if (desc[_7]) {
        var elem = window[desc.id];
        if (!elem) return;
        console.log(key);

        if (key === 'tag') {
          console.log('tag change is not implemented');
        } else if (key === 'inner') {
          if (typeof value === 'string' || typeof value === 'number') {
            elem.innerText = value;
          } else if (_H(value)) {
            value = _2(value);
            elem.innerHTML = '';
            elem.appendChild(_5.element(value));
          } else if (Array.isArray(value)) {
            value = value.map(_2);
            elem.innerHTML = '';
            value.map(_5.element).forEach(child => elem.appendChild(child));
          }
        } else if (key === 'value') {
          elem.value = value;
        } else {
          elem.setAttribute(key, value);
        }
      }

      if (_H(value)) {
        value = _3(value, isView);
      }

      if (!(key in desc)) {
        _I(proxy, desc, key);
      }

      desc[key] = value; // recalculate cache

      var infls = Array.from(node.infls);
      var deps = Array.from(node.deps);
      node.infls.clear();
      node.deps.clear();

      _D(node); // update deps


      deps.forEach(dep => {
        dep.infls.delete(node);
      }); // update infls

      infls.forEach(infl => {
        infl.deps.clear(); // update value

        _D(infl);

        _C(infl);
      });
    }
  };

  var _D = function (node) {
    // console.log('recalculate', node.key)
    delete node.value;
    node.proxy[node.key];

    if (node.desc[_7]) {
      var desc = node.desc;
      var key = node.key;
      var elem = window[desc.id];
      var value = node.value;

      if (key === 'tag') {
        console.log('tag change is not implemented');
      } else if (key === 'inner') {
        if (typeof value === 'string' || typeof value === 'number') {
          elem.innerText = value;
        } else if (_H(value)) {
          value = _2(value);
          elem.innerHTML = '';
          elem.appendChild(_5.element(value));
        } else if (Array.isArray(value)) {
          value = value.map(_2);
          elem.innerHTML = '';
          value.map(_5.element).forEach(child => elem.appendChild(child));
        }
      } else if (key === 'value') {
        elem.value = value;
      } else {
        elem.setAttribute(key, value);
      }
    }
  };

  var _F = function (arr, node) {
    var mapped = [];

    class EposArray extends Array {
      map(iterator) {
        // maps become not reactive
        var origIterator = iterator;

        iterator = (item, i) => Epos.stop(() => origIterator(item, i));

        var m = new Array(...Array.prototype.map.call(this, iterator));
        var calcNode = _A[_A.length - 1];

        var r = _F(m, calcNode);

        mapped.push({
          m: r,
          iterator,
          node: calcNode
        });
        return r;
      }

      push(item) {
        if (_H(item)) {
          item = _3(item);
        }

        mapped.forEach(({
          m,
          iterator,
          node: n
        }) => {
          var v = iterator(item, m.length);

          if (_H(v)) {
            v = _3(v);
          } // drop this, toProxy makes all we need
          // var desc = v.__desc
          // if (desc.inner) {
          //   desc[affectsView] = true
          //   desc.id = `epos${eposId}`
          //   eposId += 1
          // }


          m.push(v);

          if (v && v.__desc && v.__desc[_7]) {
            var desc = v.__desc;
            var n = m.getNode();

            if (n && n.desc) {
              var parent = window[n.desc.id];
              parent.appendChild(_5.element(v));
            }
          }
        });
        Array.prototype.push.call(this, item);
      }

      splice(index) {
        Array.prototype.splice.call(this, index, 1);
        mapped.forEach(({
          m
        }) => {
          var elem = window[m[index].id];

          if (elem) {
            elem.outerHTML = '';
          }

          m.splice(index, 1);
        });
      }

      getNode() {
        return node;
      }

    }

    var customArr = new EposArray(...arr);
    return customArr;
  };

  var _C = function (node) {
    node.infls.forEach(infl => {
      infl.deps.clear();

      _D(infl);

      _C(infl);
    });
  };

  var _I = function (proxy, desc, key) {
    var self = _I;
    var node = {
      id: self.nodeId || (self.nodeId = 0),
      desc,
      key,
      deps: new Set(),
      infls: new Set(),
      proxy
    };
    self.nodeId += 1;
    _J.get(proxy) || _J.set(proxy, {});
    _J.get(proxy)[key] = node;

    _K.push(node);

    return node;
  };

  var _E = function (proxy, key) {
    return _J.get(proxy) ? _J.get(proxy)[key] : null;
  };

  var _1 = function (fn) {
    var calcNode = _A[_A.length - 1];

    if (calcNode) {
      calcNode.freeze = true;
      var v = fn();
      calcNode.freeze = false;
    } else {
      var v = fn();
    }

    return v;
  };

  var _H = function (any) {
    return typeof any === 'object' && !any.__isProxy && Object.prototype.toString.call(any) === '[object Object]';
  };

  var _G = function (any) {
    return Array.isArray(any);
  };

  var _4 = function (desc) {
    return _5.element(desc); // var elem = document.createElement('div')
    // elem.innerHTML = Wd.html(desc)
    // elem = elem.firstElementChild
    // return elem
  };

  var _Q = ["tag", "inner"];
  var _5 = {
    element: _B
  };
  var _6 = [];

  var _7 = _$1("affectsView");

  var _J = new _$2();

  var _K = [];
  var _A = [];
  _$0.Epos = {
    element: _4,
    object: _3,
    view: _2,
    stop: _1
  };
}).call(this);
