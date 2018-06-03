(() => {

var OP = Object.prototype
var AP = Array.prototype

var Wd = {
  element
}

var RESERVED_KEYS = ['tag', 'inner']

/**
 * desc = Object
 * => HTML
 */
function element (desc) {
  if (Array.isArray(desc)) {
    return toFlatArray(desc).map(element)
  }

  if (typeof desc === 'number') {
    desc = desc.toString()
  }

  if (typeof desc === 'string') {
    return document.createTextNode(desc)
  }

  makeLinkIfHref(desc)

  var tag = getTag(desc)
  var children = getChildren(desc)

  var elem = document.createElement(tag)

  for (var key in desc) {
    if (isReservedKey(key)) {
      continue
    }
    elem.setAttribute(key, desc[key])
  }

  children.forEach(child => {
    elem.appendChild(child)
  })

  return elem
}

function alwaysArray (any) {
  return Array.isArray(any) ? any : [ any ]
}

function makeLinkIfHref (desc) {
  if (isNonEmptyString(desc.href) && !desc.tag) {
    desc.tag = 'a'
  }
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
    return toFlatArray(desc.inner).map(element)
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
  stop
}

var calcNodes = []
var eposId = 1
var affectsView = Symbol('affectsView')

function toView (desc) {
  return toProxy(desc, true)
}

var proxies = []

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
  proxies.push(proxy)

  for (var key in desc) {
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

      if (typeof value === 'function') {
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

    if (desc[affectsView]) {
      var elem = window[desc.id]
      if (!elem) return

      if (key === 'tag') {
        console.error('')
      } else if (key === 'inner') {
        if (typeof value === 'string' || typeof value === 'number') {
          elem.innerText = value
        } else if (isObject2(value)) {
          value = toView(value)
          elem.innerHTML = ''
          elem.appendChild(Wd.element(value))
        } else if (Array.isArray(value)) {
          value = value.map(toView)
          elem.innerHTML = ''
          value.map(Wd.element).forEach(child => elem.appendChild(child))
        }
      } else if (key === 'value') {
        elem.value = value
      } else if (key === 'checked') {
        elem.checked = value
      } else {
        if (typeof key === 'string') { // not symbol
          elem.setAttribute(key, value)
        }
      }
    }


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
  // console.log('recalculate', node.key)
  delete node.value
  node.proxy[node.key]

  if (node.desc[affectsView]) {
    var desc = node.desc
    var key = node.key
    var elem = window[desc.id]
    if (!elem) return

    var value = node.value
    if (key === 'tag') {
      console.error()
      // console.log('tag change is not implemented')
    } else if (key === 'inner') {
      if (typeof value === 'string' || typeof value === 'number') {
        elem.innerText = value
      } else if (isObject(value)) { // not isObject2!!
        value = toView(value)
        elem.innerHTML = ''
        elem.appendChild(Wd.element(value))
      } else if (Array.isArray(value)) {
        value = value.map(toView)
        elem.innerHTML = ''
        value.map(Wd.element).forEach(child => elem.appendChild(child))
      }
    } else if (key === 'value') {
      elem.value = value
    } else if (key === 'checked') {
      elem.checked = value
    } else {
      elem.setAttribute(key, value)
    }
  }
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

    push (item) {
      if (isObject2(item)) {
        item = toProxy(item)
      }

      mapped.forEach(({ m, iterator, node: n }) => {
        var v = iterator(item, m.length)
        if (isObject2(v)) {
          v = toProxy(v)
        }

        // drop this, toProxy makes all we need
        // var desc = v.__desc
        // if (desc.inner) {
        //   desc[affectsView] = true
        //   desc.id = `epos${eposId}`
        //   eposId += 1
        // }

        m.push(v)

        if (v && v.__desc && v.__desc[affectsView]) {
          var desc = v.__desc
          var n = m.getNode()
          if (n && n.desc) {
            var parent = window[n.desc.id]
            parent.appendChild(Wd.element(v))
          }
        }
      })

      AP.push.call(this, item)
    }

    splice (index) {
      AP.splice.call(this, index, 1)
      mapped.forEach(({ m }) => {
        var elem = window[m[index].id]
        if (elem) {
          elem.outerHTML = ''
        }
        m.splice(index, 1)
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
  return Wd.element(Epos.view(desc))
  // var elem = document.createElement('div')
  // elem.innerHTML = Wd.html(desc)
  // elem = elem.firstElementChild

  // return elem
}

})()
