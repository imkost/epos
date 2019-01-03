document.addEventListener('DOMContentLoaded', () => {
  window.store = createSource({
    shown: false,
    items: [
      { value: 'a' },
      { value: 'b' },
      { value: 'c' }
    ],
    title: 's'
  })

  const elem = render({
    style: 'font-weight: bold',
    inner () {
      console.log('recalc elem')
      return store.title$
    }
  })

  // TODO: implement
  // stopElementReactivity(element)

  store.showAll$ = true


  filter:
    allItems
    filteredItems = allItems.map(() => {
      return () => 
    })



  store.items
    .filter$(item => item.visible$ || store.showAll$)
    .map$(item => item.title)

  store.items
    .filter(item => item.visible)
    .map(item => item.title)

  const $app = render({
    inner () {
      if (store.shown$) {
        return renderArray(store.items, item => {
          return {
            class: 'item',
            inner: item
          }
        })
      }

      return 'hidden'
    }
  })

  const $app = render({
    inner () {
      if (store.shown$) {
        return elem
      }

      return 'none'
    },
    onUnmount () {
      // TODO: implement
      stopReactivityFor(elem)
    }

    // inner () {
    //   if (store.shown$) {
    //     return renderArray(store.items, item => {
    //       return {
    //         inner: item.value
    //       }
    //     })
    //   }
    //   return 'hidden'
    // }
  })

  document.body.appendChild($app)
})

let curRun = null
let curGet = null
const dMap = new Map()
const elementsToObserve = new Set()

function d (fn) {
  if (!dMap.has(fn)) {
    const source = createSource({
      value: void 0
    })

    dMap.set(fn, source)

    autorun(() => {
      const newValue = fn()
      if (source.value !== newValue) {
        source.value$ = newValue
      }
    }, true)
  }

  const source = dMap.get(fn)
  return source.value$
}

function autorun (fn, noParent = false) {
  let deps = new Set()
  let children = new Set()

  const parentRun = curRun
  curRun = { children, stop }
  if (parentRun && !noParent) {
    parentRun.children.add(curRun)
  }

  const parentGet = curGet
  curGet = get

  fn()

  curRun = parentRun
  curGet = parentGet

  function get (source, key) {
    deps.add({ source, key })
    source[`${key}$onChange`].add(rerun)
  }

  function stop () {
    for (const dep of deps) {
      dep.source[`${dep.key}$onChange`].delete(rerun)
    }
    deps.clear()

    for (const child of children) {
      child.stop()
    }
    children.clear()
  }

  function rerun () {
    stop()
    curRun = { children, stop }
    const parentGet = curGet
    curGet = get
    fn()
    curGet = parentGet
  }
}

function createSource (object) {
  const source = {}

  for (const key in object) {
    const value = object[key]
    const onChange = new Set()

    if (isObject(value)) {
      source[key] = createSource(value)
    } else {
      source[key] = value
    }

    Object.defineProperties(source, {
      [`${key}$`]: {
        get () {
          if (curGet) {
            curGet(source, key)
          }
          return source[key]
        },

        set (newValue) {
          if (source[key] !== newValue) {
            source[key] = newValue
            Array.from(onChange).forEach(c => c())
          }
          return true
        }
      },

      [`${key}$onChange`]: {
        get () {
          return onChange
        }
      }
    })

    if (isArray(source[key])) {
      const onPush = new Set()
      const onPop = new Set()

      const processedArray = (array) => {
        return array.map((item, i) => {
          if (isObject(item)) {
            return createSource(item)
          } else if (isArray(item)) {
            return processedArray(item)
          }
          return item
        })
      }
      source[key] = processedArray(source[key])

      const push = (...args) => {
        source[key].push(...args)
        Array.from(onChange).forEach(c => c())
        Array.from(onPush).forEach(p => p(args[0]))
      }

      const pop = (...args) => {
        source[key].pop(...args)
        Array.from(onChange).forEach(c => c())
        Array.from(onPop).forEach(c => c())
      }

      const shift = (...args) => {
        source[key].shift(...args)
        Array.from(onChange).forEach(c => c())
      }

      const unshift = (...args) => {
        source[key].unshift(...args)
        Array.from(onChange).forEach(c => c())
      }

      const splice = (...args) => {
        source[key].splice(...args)
        Array.from(onChange).forEach(c => c())
      }

      Object.defineProperties(source[key], {
        push$: { get: () => push },
        pop$: { get: () => pop },
        shift$: { get: () => shift },
        unshift$: { get: () => unshift },
        splice$: { get: () => splice }
      })

      Object.defineProperties(source[key], {
        onPush$: { get: () => onPush },
        onPop$: { get: () => onPop }
      })
    }
  }

  return source
}

function renderArray (array, fn) {
  // let nodes = array.map(fn).map(template => {
  //   return {
  //     ...template
  //     onUnmount (elem) {
  //       template.onUnmount(elem)
  //     }
  //   }
  // })
  if (nodes.length === 0) {
    nodes = [document.createTextNode('')]
  }

  array.onPush$.add(item => {
    console.log('%con push', 'font-style: italic')
    const newNode = render(fn(item))
    const lastNode = nodes[nodes.length - 1]
    if (lastNode.nextSibling) {
      lastNode.parentNode.insertBefore(lastNode, lastNode.nextSibling)
    } else {
      lastNode.parentNode.appendChild(newNode)
    }
    nodes.push(newNode)
  })

  array.onPop$.add(item => {
    const lastNode = nodes[nodes.length - 1]
    lastNode.remove()
    nodes.pop()
  })

  return nodes
}

function render (template) {
  const nodeType = template && template.nodeType
  if (nodeType === Node.TEXT_NODE || nodeType === Node.ELEMENT_NODE) {
    return template
  }

  if (typeof template === 'string' || typeof template === 'number') {
    return document.createTextNode(template)
  }

  if (isArray(template)) {
    const result = flatten(template.map(render))
    if (result.length === 0) {
      return [document.createTextNode('')]
    }
    return result
  }

  if (isObject(template)) {
    // Create element
    const tag = template.tag || 'div'
    const root = document.createElement(tag)

    // Set attributes
    for (const key in template) {
      if (key === 'onMount' || key === 'onUnmount') {
        elementsToObserve.add(root)
        root[key] = template[key]
        startMo()
      } else if (key !== 'tag' && key !== 'inner') {
        const value = template[key]

        if (typeof value === 'function') {
          if (isEvent(key)) {
            root.addEventListener(key.slice(2), value)
          } else {
            let prevValue

            autorun(() => {
              const newValue = value()
              if (prevValue !== newValue) {
                prevValue = newValue
                if (typeof newValue === 'string' || typeof newValue === 'number') {
                  root.setAttribute(key, newValue)
                } else {
                  root.removeAttribute(key)
                }
              }
            })
          }
        } else if (typeof value === 'string' || typeof value === 'number') {
          root.setAttribute(key, value)
        }
      }
    }

    // Set children
    const children = render(alwaysArray(template.inner))
    for (const child of children) {
      root.appendChild(child)
    }

    return root
  }

  if (typeof template === 'function') {
    let prevNodes = []

    autorun(() => {
      const newNodes = flatten(alwaysArray(render(template())))

      if (prevNodes.length) {
        for (const newNode of newNodes) {
          prevNodes[0].parentNode.insertBefore(newNode, prevNodes[0])
        }
        for (const prevNode of prevNodes) {
          prevNode.remove()
        }
      }

      prevNodes = newNodes
    })

    return prevNodes
  }

  return document.createTextNode('')
}


const mo = new MutationObserver(mutations => {
  Array.from(elementsToObserve).forEach(elem => {
    if (elem.__isMounted) {
      if (!document.contains(elem)) {
        if (elem.onUnmount) {
          elem.onUnmount(elem)
        }
        elementsToObserve.delete(elem)
        if (elementsToObserve.size === 0) {
          stopMo()
        }
      }
    } else {
      if (document.contains(elem)) {
        elem.__isMounted = true
        if (elem.onMount) {
          elem.onMount(elem)
        }
      }
    }
  })
})

function startMo () {
  if (mo.__started) {
    return
  }
  mo.__started = true
  mo.observe(document, { childList: true, subtree: true })
}

function stopMo () {
  if (mo.__started) {
    mo.__started = false
    mo.disconnect()
  }
}

/*******************************************************************************
 *
 * Helpers
 *
 ******************************************************************************/

function isArray (any) {
  return Array.isArray(any)
}

function isObject (any) {
  return Object.prototype.toString.call(any) === '[object Object]'
}

function alwaysArray (any) {
  return isArray(any) ? any : [any]
}

function flatten (array) {
  let flat = []

  for (const item of array) {
    if (isArray(item)) {
      flat = flat.concat(flatten(item))
    } else {
      flat.push(item)
    }
  }

  return flat
}

function isEvent (key) {
  return key.toLowerCase() === 'onclick'
}
