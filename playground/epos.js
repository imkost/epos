(() => {

var HP = HTMLElement.prototype
var oAppendChild = HP.appendChild

function isHook (key) {
  return (
    key === 'beforeMount' ||
    key === 'afterMount' ||
    key === 'beforeUnmount' ||
    key === 'afterUnmount'
  )
}

;['appendChild', 'insertBefore', 'insertAdjacentElement', 'removeChild'].forEach((fnName, i) => {
  var orig = HP[fnName]
  HP[fnName] = function (...args) {
    if (i === 4) { // remove child
      methods = ['beforeUnmount', 'afterUnmount']
    } else {
      methods = ['beforeMount', 'afterMount']
    }
    if (i === 2) { // insertAdjacentElement
      elem = args[1]
    } else {
      elem = args[0]
    }
    var needHookExec = document.contains(this) && elem[isEposElem]
    if (needHookExec) {
      callRecursive(elem, methods[0])
    }
    var result = orig.apply(this, args)
    if (needHookExec) {
      callRecursive(elem, methods[1])
    }
    return result
  }
})

;['remove'].forEach(fnName => {
  var orig = HP[fnName]
  HP[fnName] = function (...args) {
    var desc = document.contains(this) && this[isEposElem] ? this[eposDesc] : null
    if (desc) {
      desc.beforeUnmount && desc.beforeUnmount(this)
    }
    var result = orig.apply(this, args)
    if (desc) {
      desc.afterUnmount && desc.afterUnmount(this)
    }
    return result
  }
})

function callRecursive (elem, method) {
  var desc = elem[eposDesc]
  if (desc) {
    desc[method] && desc[method](elem)
    Array.from(elem.children).forEach(c => callRecursive(c, method))
  }
}

var OP = Object.prototype
var AP = Array.prototype
var isEposElem = Symbol('isEposElem')
var eposDesc = Symbol('eposDesc')

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

  if (desc instanceof HTMLElement) {
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
    if (isEvent(key) && isFn(v)) {
      elem.addEventListener(key.slice(2).toLowerCase(), v)
      continue
    }
    setAttr(elem, key, v)
  }

  var children = getChildren(desc)
  children.forEach(child => {
    child && elem.appendChild(child)
  })

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

  array.forEach(item => {
    if (isArray(item)) {
      flat = flat.concat(flatten(item))
    } else {
      flat.push(item)
    }
  })

  return flat
}


window.Epos = {
  element: eposElementRoot,
  object: toProxy,
  view: toView,
  raw: rawHtml,
  stop,
  fn: eposFn,
  _clean: cleanAll
}


var calcNodes = []
var eposId = 1
var affectsView = Symbol('affectsView')
var isEposFn = Symbol('isEposFn')

function rawHtml (str) {
  var div = document.createElement('div')
  div.innerHTML = str
  return Array.from(div.children)
}

function eposFn (fn) {
  fn[isEposFn] = true
  return fn
}

function toView (desc) {
  return toProxy(desc, true)
}

function isEvent (key) {
  return key.toLowerCase && EVENTS.includes(key.toLowerCase())
}

function toProxy (desc, isView = false) {
  if (desc.inner) {
    isView = true
  }

  if (isView) {
    desc[affectsView] = true
    desc.id = `epos${eposId}`
    eposId += 1
  }

  var proxy = new Proxy(desc, { get, set })

  for (var key in desc) {
    if (isHook(key)) {
      continue
    }
    if (isEvent(key)) {
      continue
    }

    var node = createNode(proxy, desc, key)

    if (isObject2(desc[key])) {
      desc[key] = toProxy(desc[key], isView)
    }

    if (isArray(desc[key])) {
      desc[key] = createEposArray(desc[key], node)
      desc[key].forEach((v, i) => {
        if (isObject2(v)) {
          desc[key][i] = toProxy(v, isView)
        }
      })
    }

    proxy[key]
  }

  return proxy

  function get (d, key) {
    if (isEvent(key)) {
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

        if (isObject2(value)) {
          value = toProxy(value, isView)
        }
        if (isArray(value)) {
          value.forEach((v, i) => {
            if (isObject2(v)) {
              value[i] = toProxy(v, isView)
            }
          })
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

    if (isObject2(value)) {
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

    recalculateNode(node)

    // Update deps
    deps.forEach(dep => {
      dep.infls.delete(node)
    })

    // Update infls
    infls.forEach(infl => {
      infl.deps.clear()

      // Update value
      recalculateNode(infl)
      updateInflsDeep(infl)
    })
  }
}

function recalculateNode (node) {
  delete node.value
  node.proxy[node.key]

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
      } else if (isObject(value)) { // not isObject2!!
        value = toView(value)
        unmountChildren(elem)
        elem.appendChild(eposCreateElement(value))
      } else if (isArray(value)) {
        value = value.map(toView)
        unmountChildren(elem)
        value.map(eposCreateElement).forEach(child => elem.appendChild(child))
      }

    // Value
    } else if (key === 'value') {
      elem.value = value

    // Checked
    } else if (key === 'checked') {
      elem.checked = value

    // Attr
    } else if (isString(key)) {
      setAttr(elem, key, value)
    }
  }
}

function unmountChildren (elem) {
  var children = Array.from(elem.children)
  children.forEach(c => callRecursive(c, 'beforeUnmount'))
  elem.innerHTML = ''
  children.forEach(c => callRecursive(c, 'afterUnmount'))
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

  arr = toProxy(arr)

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
      if (isObject2(item)) {
        item = toProxy(item)
      }

      mapped.forEach(({ m, iterator, node: n }) => {
        var v = iterator(item, m.length)
        if (isObject2(v)) {
          v = toProxy(v)
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
      })

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
      mapped.forEach(({ m }) => {
        Array.from(Array(i)).forEach((_, j) => {
          var elem = window[m[index + j].id]
          if (elem) {
            elem.outerHTML = ''
          }
        })
        m.splice(index, i)
      })
    }

    getNode () {
      return node
    }
  }

  var customArr = new EposArray(...arr)
  return customArr
}

function updateInflsDeep(node) {
  node.infls.forEach(infl => {
    infl.deps.clear()
    recalculateNode(infl)
    updateInflsDeep(infl)
  })
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

function isObject2 (any) {
  return isObject(any) && !any.__isProxy && OP.toString.call(any) === '[object Object]'
}

function isArray (any) {
  return Array.isArray(any)
}

function eposElementRoot (desc) {
  if (!desc[affectsView]) {
    desc = Epos.view(desc)
  }
  return eposCreateElement(desc)
}

function eposCreateElement (desc) {
  var elem = wdElement(desc)
  elem[eposDesc] = desc
  return elem
}

function cleanAll () {
  nodes.forEach(node => {
    node.deps.clear()
    node.infls.clear()
  })
  nodes = []
  nodesByProxy = new Map()
}

})()
