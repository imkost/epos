(() => {

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

  var proxy = new Proxy(desc, { get, set })
  proxies.push(proxy)

  if (isView) {
    desc[affectsView] = true
    desc.id = `epos${eposId}`
    eposId += 1
  }

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

    if (desc[affectsView]) {
      var elem = window[desc.id]
      if (!elem) return

      console.log(key);
      if (key === 'tag') {
        console.log('tag change is not implemented')
      } else if (key === 'inner') {
        if (typeof value === 'string' || typeof value === 'number') {
          elem.innerText = value
        } else if (isObject2(value)) {
          value = createView(value)
          elem.innerHTML = Wd.html(value)
        } else if (Array.isArray(value)) {
          value = value.map(createView)
          elem.innerHTML = value.map(Wd.html).join('')
        }
      } else if (key === 'value') {
        elem.value = value
      } else {
        elem.setAttribute(key, value)
      }
    }


    if (isObject2(value)) {
      value = toProxy(value, isView)
    }

    if (!(key in desc)) {
      createNode(proxy, desc, key)
    }

    desc[key] = value

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
    var value = node.value
    if (key === 'tag') {
      console.log('tag change is not implemented')
    } else if (key === 'inner') {
      if (typeof value === 'string' || typeof value === 'number') {
        elem.innerText = value
      } else if (isObject2(value)) {
        value = toView(value)
        elem.innerHTML = Wd.html(value)
      } else if (Array.isArray(value)) {
        value = value.map(toView)
        elem.innerHTML = value.map(Wd.html).join('')
      }
    } else if (key === 'value') {
      elem.value = value
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

      var m = new Array(...Array.prototype.map.call(this, iterator))
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
            parent.insertAdjacentHTML('beforeend', Wd.html(v))
          }
        }
      })

      Array.prototype.push.call(this, item)
    }

    splice (index) {
      Array.prototype.splice.call(this, index, 1)
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
  return typeof any === 'object' && !any.__isProxy && Object.prototype.toString.call(any) === '[object Object]'
}

function isArray (any) {
  return Array.isArray(any)
}

function createElement (desc) {
  var elem = document.createElement('div')
  elem.innerHTML = Wd.html(desc)
  elem = elem.firstElementChild

  return elem
}

})()
