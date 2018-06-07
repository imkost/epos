(() => {

var mo = new MutationObserver(mutations => {
  for (var mutation of mutations) {
    for (var elem of mutation.addedNodes) {
      callRecursive(elem, 'onMounted')
    }

    for (var elem of mutation.removedNodes) {
      callRecursive(elem, 'onUnmounted')

      if (elem[listenersKey]) {
        for (var listener of elem[listenersKey]) {
          elem.removeEventListener(listener.name, listener.handler)
        }
      }
    }
  }
})

mo.observe(document, { childList: true, subtree: true })

function isHook (key) {
  return (
    key === 'onMounted' ||
    key === 'onUnmounted'
  )
}

function callRecursive (elem, method) {
  var desc = elem[isEposElem] ? elem[eposDesc] : null
  if (desc) {
    desc[method] && desc[method](elem)
  }
  if (elem.children && elem.children.length) {
    for (var c of elem.children) {
      callRecursive(c, method)
    }
  }
}

var OP = Object.prototype
var AP = Array.prototype
var isEposElem = Symbol('isEposElem')
var eposDesc = Symbol('eposDesc')
var listenersKey = Symbol('listeners')

var RESERVED_KEYS = ['tag', 'inner']
var EVENTS = [
  'abort', 'auxclick', 'beforecopy', 'beforecut', 'beforepaste', 'blur',
  'cancel', 'canplay', 'canplaythrough', 'change', 'click', 'close',
  'contextmenu', 'copy', 'cuechange', 'cut', 'dblclick', 'drag', 'dragend',
  'dragenter', 'dragleave', 'dragover', 'dragstart', 'drop',
  'durationchange', 'emptied', 'ended', 'error', 'focus',
  'gotpointercapture', 'input', 'invalid', 'keydown', 'keypress', 'keyup',
  'load', 'loadeddata', 'loadedmetadata', 'loadstart', 'lostpointercapture',
  'mousedown', 'mouseenter', 'mouseleave', 'mousemove', 'mouseout',
  'mouseover', 'mouseup', 'mousewheel', 'paste', 'pause', 'play', 'playing',
  'pointercancel', 'pointerdown', 'pointerenter', 'pointerleave',
  'pointermove', 'pointerout', 'pointerover', 'pointerup', 'progress',
  'ratechange', 'reset', 'resize', 'scroll', 'search', 'seeked', 'seeking',
  'select', 'selectstart', 'stalled', 'submit', 'suspend', 'timeupdate',
  'toggle', 'touchcancel', 'touchend', 'touchmove', 'touchstart',
  'volumechange', 'waiting', 'wheel'
].map(e => `on${e}`)

/**
 * desc = Object
 * => HTML
 */
function wdElement (desc) {
  var elem

  var nodeType = desc && desc.nodeType
  if (nodeType === Node.TEXT_NODE || nodeType === Node.ELEMENT_NODE) {
    desc[isEposElem] = true
    return desc
  }

  if (isArray(desc)) {
    return toFlatArray(desc).map(eposCreateElement)
  }

  if (isStrOrNum(desc)) {
    elem = document.createTextNode(desc.toString())
    elem[isEposElem] = true
    return elem
  }

  if (!desc) {
    return null
  }

  var tag = getTag(desc)
  elem = document.createElement(tag)

  for (var key in desc) {
    var v = desc[key]
    if (isReservedKey(key) || isHook(key)) {
      continue
    }
    if (isFn(v) && isEvent(key)) {
      elem.addEventListener(key.slice(2).toLowerCase(), v)
      elem[listenersKey] || (elem[listenersKey] = [])
      elem[listenersKey].push({ name: key.slice(2).toLowerCase(), handler: v })
      continue
    }
    setAttr(elem, key, v)
  }

  var children = getChildren(desc)
  for (var child of children) {
    child && elem.appendChild(child)
  }

  elem[isEposElem] = true
  return elem
}

function alwaysArray (any) {
  return isArray(any) ? any : [ any ]
}

function isFn (any) {
  return typeof any === 'function'
}

function getTag (desc) {
  if ('tag' in desc) {
    var tag = desc.tag

    if (isString(tag) && /^[\w-]+$/.test(tag)) {
      return tag
    } else {
      throw ''
      // throw 'Invalid tag name'
    }
  }

  return 'div'
}

function getChildren (desc) {
  if ('inner' in desc) {
    return toFlatArray(desc.inner).map(eposCreateElement)
  }

  return []
}

function prepareClass (attrValue) {
  return toFlatArray(attrValue)
    .filter(isNonEmptyString)
    .join(' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function isReservedKey (key) {
  return RESERVED_KEYS.includes(key)
}

function isString (any) {
  return typeof any === 'string'
}

function isObject (any) {
  return OP.toString.call(any) === '[object Object]'
}

function isNonEmptyString (any) {
  return isString(any) && any
}

function toFlatArray (any) {
  if (isArray(any)) {
    return flatten(any)
  }

  return [ any ]
}

function flatten (array) {
  var flat = []

  for (var item of array) {
    if (isArray(item)) {
      flat = flat.concat(flatten(item))
    } else {
      flat.push(item)
    }
  }

  return flat
}

var proxies = new Set()

window.Epos = {
  element: eposElementRoot,
  object: toProxy,
  raw: rawHtml,
  stop,
  fn: eposFn,
  _view: toView,
  _clean: cleanAll,
  _proxies: proxies
}


var calcNodes = []
var eposId = 1
var affectsView = Symbol('affectsView')
var isEposFn = Symbol('isEposFn')

function rawHtml (str) {
  var div = document.createElement('div')
  div.innerHTML = str
  return Array.from(div.childNodes)
}

function eposFn (fn) {
  fn[isEposFn] = true
  return fn
}

function toView (desc) {
  return toProxy(desc, true)
}

function isEvent (key) {
  return isString(key) && EVENTS.includes(key.toLowerCase())
}

function toProxy (desc, isView = false) {
  if (desc && desc.__isProxy) {
    return desc
  }

  if (desc.inner) {
    isView = true
  }

  if (isView) {
    desc[affectsView] = true
    desc.id = `epos${eposId}`
    eposId += 1
  }

  var proxy = new Proxy(desc, { get, set })
  proxies.add(proxy)

  for (var k in desc) {
    processKey(k)
  }

  return proxy

  function processKey (key) {
    if (isHook(key)) {
      return
    }

    if (isEvent(key)) {
      return
    }

    var node = createNode(proxy, desc, key)

    if (isObjectNotProxy(desc[key])) {
      desc[key] = toProxy(desc[key], isView)
    }

    processArrayIfArrayRecursive(desc, key, node, isView)
    proxy[key]
  }

  function processArrayIfArrayRecursive (obj, key, node, isView) {
    var value = obj[key]
    if (isArray(value)) {
      obj[key] = createEposArray(value, node)
      value = obj[key]
      var valueLength = value.length

      for (var i = 0; i < valueLength; i++) {
        var v = value[i]
        if (isObjectNotProxy(v)) {
          value[i] = toProxy(v, isView)
        }
        processArrayIfArrayRecursive(value, i, node, isView)
      }
    }
  }

  function get (d, key) {
    if (isView && isEvent(key)) {
      return desc[key]
    }

    if (key === affectsView) {
      return desc[affectsView]
    }
    if (key === '__desc') {
      return desc
    }

    if (key === '__isProxy') {
      return true
    }

    var node = getNode(proxy, key)

    if (!node) {
      return desc[key]
    }

    if (!('value' in node)) {
      var value = desc[key]

      if (isFn(value) && !value[isEposFn]) {
        calcNodes.push(node)
        value = value()
        calcNodes.pop()

        if (isObjectNotProxy(value)) {
          value = toProxy(value, isView)
        }
        if (isArray(value)) {
          var valueLength = value.length
          for (var i = 0; i < valueLength; i++) {
            var v = value[i]
            if (isObjectNotProxy(v)) {
              value[i] = toProxy(v, isView)
            }
          }
        }
      }

      node.value = value
    }

    if (calcNodes.length) {
      var calcNode = calcNodes[calcNodes.length - 1]
      if (calcNode.freeze) {

      } else {
        node.infls.add(calcNode)
        calcNode.deps.add(node)
      }
    }

    return node.value
  }

  function set (d, key, value) {
    var node = getNode(proxy, key)

    if (desc[key] === value) {
      return
    }

    if (isObjectNotProxy(value)) {
      value = toProxy(value, isView)
    }

    if (!(key in desc)) {
      createNode(proxy, desc, key)
    }

    desc[key] = value

    // For symbols
    if (!node) {
      return
    }

    // Recalculate cache
    var infls = Array.from(node.infls)
    var deps = Array.from(node.deps)
    node.infls.clear()
    node.deps.clear()

    // is it optimization?
    if (deps.length) {
      recalculateNode(node)
    } else {
      node.value = value
    }

    // Update deps
    for (var dep of deps) {
      dep.infls.delete(node)
    }

    // Update infls
    for (var infl of infls) {
      infl.deps.clear()

      // Update value
      recalculateNode(infl)
      updateInflsDeep(infl)
    }
  }
}

function dropProxyDeep (proxy, key) {
  var node = getNode(proxy, key)

  var infls = Array.from(node.infls)
  var deps = Array.from(node.deps)
  node.infls.clear()
  node.deps.clear()
  for (var dep of deps) {
    dep.infls.delete(node)
  }
  for (var infl of infls) {
    infl.deps.delete(node)
  }

  proxies.delete(proxy)
  for (var k in node.desc) {
    var v = node.desc[k]
    if (v && v.__isProxy) {
      dropProxyDeep(v, key)
    }
  }
}

function recalculateNode (node) {
  var prevChildProxy = node.value && node.value.__isProxy ? node.value : null

  delete node.value
  node.proxy[node.key]

  if (prevChildProxy) {
    dropProxyDeep(prevChildProxy, node.key)
  }

  if (node.desc[affectsView]) {
    var desc = node.desc
    var key = node.key
    var elem = window[desc.id]

    if (!elem) {
      return
    }

    var value = node.value

    // Tag
    if (key === 'tag') {
      // console.log('tag change is not implemented')

    // Inner
    } else if (key === 'inner') {
      if (isStrOrNum(value)) {
        elem.innerText = value.toString()
      } else if (isObject(value)) { // not isObjectNotProxy!!
        value = toView(value)
        elem.innerHTML = ''
        elem.appendChild(eposCreateElement(value))
      } else if (isArray(value)) {
        value = value.map(toView)
        elem.innerHTML = ''
        for (var child of value.map(eposCreateElement)) {
          elem.appendChild(child)
        }
      }

    // Value
    } else if (key === 'value' && elem.tagName === 'INPUT') {
      elem.value = value

    // Checked
    } else if (key === 'checked' && elem.tagName === 'INPUT') {
      elem.checked = value

    // Attr
    } else if (isString(key)) {
      setAttr(elem, key, value)
    }
  }
}

function setAttr (elem, key, value) {
  if (key === 'class') {
    value = prepareClass(value)
  }

  if (isStrOrNum(value)) {
    elem.setAttribute(key, value)
  } else {
    elem.removeAttribute(key)
  }
}

function isStrOrNum (any) {
  return isString(any) || typeof any === 'number'
}

function createEposArray (arr, node) {
  var mapped = []

  class EposArray extends Array {
    map (iterator) {
      // maps become not reactive
      var origIterator = iterator
      iterator = (item, i) => Epos.stop(() => origIterator(item, i))

      var m = new Array(...AP.map.call(this, iterator))
      var calcNode = calcNodes[calcNodes.length - 1]
      var r = createEposArray(m, calcNode)
      mapped.push({ m: r, iterator, node: calcNode })
      return r
    }

    _pushUnshift (item, method) {
      if (isObjectNotProxy(item)) {
        item = toProxy(item, null)
      }

      for (var it of mapped) {
        var { m, iterator, node: n } = it
        var v = iterator(item, m.length)
        if (isObjectNotProxy(v)) {
          v = toProxy(v, null)
        }

        m[method](v)

        if (v && v.__desc && v.__desc[affectsView]) {
          var desc = v.__desc
          var n = m.getNode()
          if (n && n.desc) {
            var parent = window[n.desc.id]
            if (method === 'push') {
              parent.appendChild(eposCreateElement(v))
            } else {
              parent.insertAdjacentElement('afterbegin', eposCreateElement(v))
            }
          }
        }
      }

      AP[method].call(this, item)
    }

    unshift (item) {
      this._pushUnshift(item, 'unshift')
    }

    push (item) {
      this._pushUnshift(item, 'push')
    }

    pop () {
      if (this.length) {
        var v = this[this.length - 1]
        this.splice(this.length -1)
        return v
      }
    }

    // remove first
    shift () {
      if (this.length) {
        var v = this[0]
        this.splice(0, 1)
        return v
      }
    }

    splice (index, i) {
      AP.splice.call(this, index, i)
      for (var it of mapped) {
        var { m } = it
        for (var j = 0; j < i; j++) {
          var elem = window[m[index + j].id]
          if (elem) {
            elem.outerHTML = ''
          }
        }
        m.splice(index, i)
      }
    }

    getNode () {
      return node
    }
  }

  var customArr = new EposArray(...arr)
  return customArr
}

function updateInflsDeep(node) {
  for (var infl of node.infls) {
    infl.deps.clear()
    recalculateNode(infl)
    updateInflsDeep(infl)
  }
}

var nodes = []
var nodesByProxy = new Map()

function createNode (proxy, desc, key) {
  var self = createNode
  var node = {
    id: self.nodeId || (self.nodeId = 0),
    desc,
    key,
    deps: new Set(),
    infls: new Set(),
    proxy
  }
  self.nodeId += 1
  nodesByProxy.get(proxy) || (nodesByProxy.set(proxy, {}))
  nodesByProxy.get(proxy)[key] = node
  nodes.push(node)
  return node
}

function getNode (proxy, key) {
  return nodesByProxy.get(proxy)
    ? nodesByProxy.get(proxy)[key]
    : null
}

function stop (fn) {
  var calcNode = calcNodes[calcNodes.length - 1]
  if (calcNode) {
    calcNode.freeze = true
    var v = fn()
    calcNode.freeze = false
  } else {
    var v = fn()
  }
  return v
}

function isObjectNotProxy (any) {
  return isObject(any) && !any.__isProxy
}

function isArray (any) {
  return Array.isArray(any)
}

function eposElementRoot (desc) {
  if (!desc[affectsView]) {
    desc = toView(desc)
  }
  return eposCreateElement(desc)
}

function eposCreateElement (desc) {
  if (!desc && desc !== 0) {
    return null
  }
  var elem = wdElement(desc)
  elem[eposDesc] = desc
  return elem
}

function cleanAll () {
  for (var node of nodes) {
    node.deps.clear()
    node.infls.clear()
  }
  nodes = []
  nodesByProxy = new Map()
}

})()
