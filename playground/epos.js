(() => {

window.Epos = {
  element: eposElementRoot,
  object: toProxy,
  fn: eposFn,
  rawHtml: rawHtml,
  scope: eposStop,
  scoped: eposScoped
}

var proxies = new Set()
var elemsById = {}
var __id__ = Symbol('__id__')

var OP = Object.prototype
var AP = Array.prototype
var isEposElem = Symbol('isEposElem')
var eposDesc = Symbol('eposDesc')
var listenersKey = Symbol('listeners')
var isEposArray = Symbol('isEposArray')

// Object.assign(Mdl.require('/common/lib/Epos'), {
//   _view: toView,
//   _clean: cleanAll,
//   _proxies: proxies
// })

window.logs = {}

function log (key) {
  var v = logs[key] || (logs[key] = 0)
  logs[key] = v + 1
  // var value = Number(localStorage.getItem(key)) || 0
  // localStorage.setItem(key, value + 1)
}

// TODO: instead of iterating all added/removed elements check only epos-registered
// onMount/onUnmount elements and try to find them in childlists of added/removed
var mo = new MutationObserver(mutations => {
  for (var mutation of mutations) {
    for (var elem of mutation.addedNodes) {
      processMounUnmountRecursive(elem, 'onMounted')
    }

    for (var elem of mutation.removedNodes) {
      processMounUnmountRecursive(elem, 'onUnmounted')

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
  log('isHook')
  return (
    key === 'onMounted' ||
    key === 'onUnmounted'
  )
}

function processMounUnmountRecursive (elem, method) {
  log('processMounUnmountRecursive')
  var desc = elem[isEposElem] ? elem[eposDesc] : null
  if (desc) {
    desc[method] && desc[method](elem)

    if (method === 'onUnmounted') {
      delete elemsById[elem[eposDesc][__id__]]
    }
  }
  if (elem.children && elem.children.length) {
    for (var c of elem.children) {
      processMounUnmountRecursive(c, method)
    }
  }
}

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
  log('wdElement')
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
    elemsById[desc[__id__]] = elem
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

  var children = toFlatArray(getChildren(desc))
  for (var child of children) {
    child && elem.appendChild(child)
  }

  elem[isEposElem] = true
  elemsById[desc[__id__]] = elem
  return elem
}

function alwaysArray (any) {
  log('alwaysArray')
  return isArray(any) ? any : [ any ]
}

function isFn (any) {
  log('isFn')
  return typeof any === 'function'
}

function getTag (desc) {
  log('getTag')
  if ('tag' in desc) {
    var tag = desc.tag

    if (isString(tag) && /^[\w-]+$/.test(tag)) {
      return tag
    } else {
      throw ''
      // throw 'Invalid tag name'
    }
  }

  if (desc.href) {
    return 'a'
  }

  return 'div'
}

function getChildren (desc) {
  log('getChildren')
  if ('inner' in desc) {
    return toFlatArray(desc.inner).map(eposCreateElement)
  }

  return []
}

function prepareClass (attrValue) {
  log('prepareClass')
  return toFlatArray(attrValue)
    .filter(isNonEmptyString)
    .join(' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function isReservedKey (key) {
  log('isReservedKey')
  return RESERVED_KEYS.includes(key)
}

function isString (any) {
  log('isString')
  return typeof any === 'string'
}

function isObject (any) {
  log('isObject')
  return OP.toString.call(any) === '[object Object]'
}

function isNonEmptyString (any) {
  log('isNonEmptyString')
  return isString(any) && any
}

function toFlatArray (any) {
  log('toFlatArray')
  if (isArray(any)) {
    return flatten(any)
  }

  return [ any ]
}

function flatten (array) {
  log('flatten')
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

var calcNodes = []
var eposId = 1
var affectsView = Symbol('affectsView')
var isEposFn = Symbol('isEposFn')

function rawHtml (str) {
  log('rawHtml')
  var div = document.createElement('div')
  div.innerHTML = str
  var divsArray = Array.from(div.childNodes)
  divsArray.__isEposDivsArray = true
  return divsArray
}

function eposFn (fn) {
  if (!fn) {
    return () => {}
  }

  log('eposFn')
  if (fn) {
    fn[isEposFn] = true
  }

  return fn
}

function toView (desc) {
  log('toView')
  return toProxy(desc, true)
}

function isEvent (key) {
  log('isEvent')
  return isString(key) && EVENTS.includes(key.toLowerCase())
}

window.gg = 0

function toProxy (desc, isView = false) {
  log('toProxy')

  /**
   * Situation:
   * Timeline(props)
   * props = Epos.object(props)
   * and props inside contain some view-block
   * if we don't use isView, then it would not affect view
   * strange, but seems like isView should be deprecated and affects view
   * should be checked via checking element in elemsById
   */
  isView = true

  if (desc && desc.__isProxy) {
    return desc
  }

  gg += 1

  // if (desc.inner) {
  //   isView = true
  // }

  if (isView) {
    desc[affectsView] = true
    desc[__id__] = `epos${eposId}`
    eposId += 1
  }

  var proxy = new Proxy(desc, { get, set })
  proxies.add(proxy)

  for (var k in desc) {
    processKey(k)
  }

  return proxy

  function processKey (key) {
    log('processKey')
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
    log('processArrayIfArrayRecursive')
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
    if (key === '__isProxy') {
      return true
    }

    log('get')
    if (key === 'o') {
      return JSON.parse(JSON.stringify(d))
    }

    if (isView && isEvent(key)) {
      return desc[key]
    }

    if (key === affectsView) {
      return desc[affectsView]
    }
    if (key === '__desc') {
      return desc
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
      var prevValue = infl.value
      recalculateNode(infl)
      if (prevValue !== infl.value) {
        updateInflsDeep(infl)
      }
    }
  }
}

function dropProxyDeep (proxy, key) {
  log('dropProxyDeep')
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
  log('recalculateNode')
  var prevChildProxy = node.value && node.value.__isProxy ? node.value : null

  var prevValue = node.value
  delete node.value
  node.proxy[node.key]

  if (prevChildProxy) {
    dropProxyDeep(prevChildProxy, node.key)
  }

  if (node.desc[affectsView]) {
    var desc = node.desc
    var key = node.key
    var elem = elemsById[desc[__id__]]

    if (!elem) {
      return
    }

    var value = node.value

    if (value === prevValue) {
      return
    }

    // Tag
    if (key === 'tag') {

    // Inner
    } else if (key === 'inner') {
      if (isStrOrNum(value)) {
        elem.innerText = value.toString()
      } else if (isObject(value)) { // not isObjectNotProxy!!
        value = toView(value)
        elem.innerHTML = ''
        elem.appendChild(eposCreateElement(value))
      } else if (isArray(value)) {
        if (value.__isEposDivsArray) {
          elem.innerHTML = ''
          value.forEach(v => elem.appendChild(v))
        } else {
          value = value.map(toView)
          elem.innerHTML = ''
          for (var child of value.map(eposCreateElement)) {
            elem.appendChild(child)
          }
        }
      } else if (!value) {
        elem.innerHTML = ''
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
  log('setAttr')
  if (key === 'class') {
    value = prepareClass(value)
  }

  if (isStrOrNum(value)) {
    var v = elem.getAttribute(key)
    if (v !== value) {
      elem.setAttribute(key, value)
    }
  } else {
    elem.removeAttribute(key)
  }
}

function isStrOrNum (any) {
  log('isStrOrNum')
  return isString(any) || typeof any === 'number'
}

function createEposArray (arr, node) {
  log('createEposArray')
  if (arr[isEposArray]) {
    return arr
  }

  var mapped = []

  class EposArray extends Array {
    map (iterator) {
      // maps become not reactive
      var origIterator = iterator
      iterator = (item, i) => eposStop(() => origIterator(item, i))

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
          if (n && n.desc && elemsById[n.desc[__id__]]) {
            var parent = elemsById[n.desc[__id__]]
            if (method === 'push') {
              parent.insertAdjacentElement('beforeend', eposCreateElement(v))
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
        this.splice(this.length - 1, 1)
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
          var elem = elemsById[m[index + j][__id__]]
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
  customArr[isEposArray] = true
  return customArr
}

function updateInflsDeep(node) {
  log('updateInflsDeep')
  for (var infl of node.infls) {
    infl.deps.clear()

    var prevValue = infl.value
    recalculateNode(infl)
    if (prevValue !== infl.value) {
      updateInflsDeep(infl)
    }
  }
}

var nodes = []
var nodesByProxy = new Map()
window.nodes = nodes

function createNode (proxy, desc, key) {
  log('createNode')
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
  log('getNode')
  return nodesByProxy.get(proxy)
    ? nodesByProxy.get(proxy)[key]
    : null
}

function eposStop (fn) {
  log('eposStop')
  var calcNode = calcNodes[calcNodes.length - 1]
  if (calcNode && !calcNode.freeze) {
    calcNode.freeze = true
    var v = fn()
    calcNode.freeze = false
  } else {
    var v = fn()
  }
  return v
}

function isObjectNotProxy (any) {
  log('isObjectNotProxy')
  return isObject(any) && !any.__isProxy
}

function isArray (any) {
  log('isArray')
  return Array.isArray(any)
}

function eposElementRoot (desc) {
  log('eposElementRoot')
  if (!desc[affectsView]) {
    desc = toView(desc)
  }
  window.d = desc
  return eposCreateElement(desc)
}

function eposCreateElement (desc) {
  log('eposCreateElement')
  if (!desc && desc !== 0) {
    return null
  }
  var elem = wdElement(desc)
  elem[eposDesc] = desc
  return elem
}

function cleanAll () {
  log('cleanAll')
  for (var node of nodes) {
    node.deps.clear()
    node.infls.clear()
  }
  nodes = []
  nodesByProxy = new Map()
}

function eposScoped (fn) {
  return function scoped (...args) {
    return eposStop(() => fn(...args))
  }
}

})()
