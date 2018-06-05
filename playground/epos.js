(() => {

var OP = Object.prototype
var AP = Array.prototype

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
  if (Array.isArray(desc)) {
    return toFlatArray(desc).map(wdElement)
  }

  if (isStrOrNum(desc)) {
    return document.createTextNode(desc.toString())
  }

  var tag = getTag(desc)
  var elem = document.createElement(tag)

  for (var key in desc) {
    var v = desc[key]
    if (isReservedKey(key)) {
      continue
    }
    if (isEvent(key) && isFn(v)) {
      elem.addEventListener(key.slice(2).toLowerCase(), v)
      continue
    }
    if (key === 'class') {
      v = prepareClass(v)
    }
    setAttr(elem, key, v)
  }

  var children = getChildren(desc)
  children.forEach(child => {
    elem.appendChild(child)
  })

  return elem
}

function alwaysArray (any) {
  return Array.isArray(any) ? any : [ any ]
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
      // throw 'Invalid tag name'
      throw ''
    }
  }

  return 'div'
}

function getChildren (desc) {
  if ('inner' in desc) {
    return toFlatArray(desc.inner).map(wdElement)
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
  if (Array.isArray(any)) {
    return flatten(any)
  }

  return [ any ]
}

function flatten (array) {
  var flat = []

  array.forEach(item => {
    if (Array.isArray(item)) {
      flat = flat.concat(flatten(item))
    } else {
      flat.push(item)
    }
  })

  return flat
}


window.Epos = {
  element: createElement,
  object: toProxy,
  view: toView,
  stop,
  fn: eposFn,
  _clean: cleanAll
}


var calcNodes = []
var eposId = 1
var affectsView = Symbol('affectsView')
var isEposFn = Symbol('isEposFn')

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

    if (desc[key] === value) return

    // if (desc[affectsView]) {
    //   console.log('set of affectsView');
    //   var elem = window[desc.id]
    //   if (!elem) return
    //   if (key === 'tag') {
    //     console.error('')
    //     // tag change not implemented
    //   } else if (key === 'inner') {
    //     if (isStrOrNum(value)) {
    //       elem.innerText = value.toString()
    //     } else if (isObject2(value)) {
    //       value = toView(value)
    //       elem.innerHTML = ''
    //       elem.appendChild(wdElement(value))
    //     } else if (Array.isArray(value)) {
    //       value = value.map(toView)
    //       elem.innerHTML = ''
    //       value.map(wdElement).forEach(child => elem.appendChild(child))
    //     }
    //   } else if (key === 'value') {
    //     elem.value = value
    //   } else if (key === 'checked') {
    //     elem.checked = value
    //   } else if (isString(key)) { // not symbol
    //     if (key === 'class') {
    //       value = prepareClass(value)
    //     }
    //     setAttr(elem, key, value)
    //   }
    // }

    if (isObject2(value)) {
      value = toProxy(value, isView)
    }

    if (!(key in desc)) {
      createNode(proxy, desc, key)
    }

    desc[key] = value

    if (!node) return // for symbols

    // recalculate cache
    var infls = Array.from(node.infls)
    var deps = Array.from(node.deps)
    node.infls.clear()
    node.deps.clear()

    recalculateNode(node)

    // update deps
    deps.forEach(dep => {
      dep.infls.delete(node)
    })

    // update infls
    infls.forEach(infl => {
      infl.deps.clear()

      // update value
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
    if (!elem) return

    var value = node.value
    if (key === 'tag') {
      // console.log('tag change is not implemented')
    } else if (key === 'inner') {
      if (isStrOrNum(value)) {
        elem.innerText = value.toString()
      } else if (isObject(value)) { // not isObject2!!
        value = toView(value)
        elem.innerHTML = ''
        elem.appendChild(wdElement(value))
      } else if (Array.isArray(value)) {
        value = value.map(toView)
        elem.innerHTML = ''
        value.map(wdElement).forEach(child => elem.appendChild(child))
      }
    } else if (key === 'value') {
      elem.value = value
    } else if (key === 'checked') {
      elem.checked = value
    } else if (isString(key)) {
      if (key === 'class') {
        value = prepareClass(value)
      }
      setAttr(elem, key, value)
    }
  }
}

function setAttr (elem, key, value) {
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
              console.log('add elem');
              parent.appendChild(wdElement(v))
            } else {
              parent.insertAdjacentElement('afterbegin', wdElement(v))
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

function createElement (desc) {
  return desc[affectsView]
    ? wdElement(desc)
    : wdElement(Epos.view(desc))
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
