var onGetStack = []

function createDynamicSource (object) {
  const source = {}

  for (const key in object) {
    const value = object[key]
    const onChangeList = new Set()

    if (isObject(value)) {
      source[key] = createDynamicSource(value)
    } else {
      source[key] = value
    }

    Object.defineProperties(source, {
      [`${key}$`]: {
        get () {
          if (onGetStack.length > 0) {
            const onGet = onGetStack[onGetStack.length - 1]
            onGet(source, key)
          }

          return object[key]
        },

        set (newValue) {
          if (value !== newValue) {
            object[key] = newValue
            onChangeList.forEach(c => c())
          }

          return true
        }
      },

      [`${key}$onChange`]: {
        get () {
          return onChangeList
        }
      }
    })
  }

  return source
}

function isObject (any) {
  return Object.prototype.toString.call(any) === '[object Object]'
}

function autorun (fn) {
  const deps = new Set()
  run()

  function run () {
    for (const dep of deps) {
      dep.source[`${dep.key}$onChange`].delete(run)
    }
    deps.clear()

    onGetStack.push((source, key) => {
      deps.add({ source, key })
      source[`${key}$onChange`].add(run)
    })
    fn()
    onGetStack.pop()
  }
}









const depsTree = {}
const getterHandlers = []

dep.childNodes.clear()

parentStack

parentStack.push(node)

// child
const parent = parentStack.length ? parentStack[parentStack.length - 1]
this.parent = parent

parentStack.push(this)
// calc inner
parentStack.pop()



// dynamicSource (set/get)
// dynamicValue (by formula)

function autorun (fn) {
  // TODO: Smarter!
  onGetStack.push(id => {
    deps[id].onChange.push(fn)
  })
  fn()
  onGetStack.pop()
}

function createDynamicObject (object) {
  const dynamic = {}

  for (const key in object) {
    const value = object[key]

    if (isObject(value)) {
      dynamic[key] = createDynamicObject(value)
    } else {
      dynamic[key] = value
    }

    const dep = new Dep()

    Object.defineProperty(dynamic, `${key}$`, {
      get () {
        if (getterHandlers.length) {
          const onGet = getterHandlers[getterHandlers.length - 1]
          onGet(dep)
        }

        return dynamic[key]
      },

      set (newValue) {
        dynamic[key] = newValue
        dep.onChange.forEach(onChange => onChange())
        return true
      }
    })
  }

  return dynamic
}

function Dep () {
  if (!('id' in Dep)) {
    Dep.id = 0
  }

  this.id = Dep.id
  this.onChange = new Set()
  this.depIds = new Set()

  Dep.id += 1
  depsTree[this.id] = this
}

function render (template) {
  if (typeof template === 'string' || typeof template === 'number') {
    return document.createTextNode(template)
  }

  if (Array.isArray(template)) {
    return flatten(template).map(render)
  }

  if (isObject(template)) {
    // Create root element
    const tag = template.tag || 'div'
    const root = document.createElement(tag)

    // Set attributes
    for (const key in template) {
      if (key !== 'tag' && key !== 'inner') {
        const value = template[key]

        if (typeof value === 'function') {
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
      }
    }

    // Set children
    const children = render([template.inner])
    for (const child of children) {
      root.appendChild(child)
    }

    return root
  }

  if (typeof template === 'function') {
    let prevNodes = []

    autorun(() => {
      const newNodes = alwaysArray(render(template()))
      newNodes.forEach(newNode => {
        prevNodes[0].parentNode.insertBefore(newNode, prevNodes[0])
      })
      prevNodes.forEach(prevNode => {
        prevNode.remove()
      })
      prevNodes = newNodes
    })



    const dep = new Dep()
    const result = executeWithDepsTracking()
    let nodes = alwaysArray(result)
    return result

    function update () {
      for (const depId of dep.depIds) {
        depsTree[depId].onChange.delete(update)
      }
      dep.depIds.clear()

      const newResult = executeWithDepsTracking()
      const newNodes = alwaysArray(newResult)

      const firstNode = nodes[0]
      console.log(nodes[0]);
      const parentNode = firstNode.parentNode
      for (const newNode of newNodes) {
        parentNode.insertBefore(newNode, firstNode)
      }
      for (const node of nodes) {
        node.remove()
      }
    }

    function executeWithDepsTracking () {
      getterHandlers.push(otherDep => {
        otherDep.onChange.add(update)
        dep.depIds.add(otherDep.id)
      })
      const value = template()
      getterHandlers.pop()

      return render(value)
    }
  }

  return document.createTextNode('')
}


const Epos = {
  render,
  // registerRenderMiddleware,
  createDynamicObject
}

document.addEventListener('DOMContentLoaded', () => {
  window.store = createDynamicObject({
    title: 'hello',
    wer: 'what',
    size: 6
  })

  window.app = render({
    class: 'app',
    title () {
      return store.title + store.wer
    },
    inner () {
      return store.size$ > 5 ? store.title$ : 'small'
    }
    // inner: [
    //   function renders() {
    //     if (store.size$ > 10) {
    //       return 'SIZE IS LARGE'
    //     }

    //     return [
    //       {
    //         inner: 'first'
    //       },
    //       {
    //         inner: `second ${store.title$}`
    //       }
    //     ]
    //   },
    //   () => store.size < 10 ? 'wer' : null
    // ]
  })

  document.body.appendChild(app)
})

const onGetStack = []

let globalId = 0
function generateId () {
  return globalId++
}

/*******************************************************************************
 *
 * Dynamic
 *
 ******************************************************************************/

// function createDynamicObject (object) {
//   const dynamic = {}

//   for (const key in object) {
//     const value = object[key]

//     const id = generateId() + '_' + key
//     const onChangeStack = []
//     const infls = []
//     depsTree[id] = { onChangeStack, infls }

//     if (isObject(value)) {
//       dynamic[key] = createDynamicObject(value)
//     } else {
//       dynamic[key] = value
//     }

//     Object.defineProperty(dynamic, `${key}$`, {
//       get () {
//         if (onGetStack.length) {
//           const onGet = onGetStack[onGetStack.length - 1]
//           onGet(id)
//         }

//         return dynamic[key]
//       },

//       set (newValue) {
//         dynamic[key] = newValue
//         onChangeStack.forEach(onChange => onChange(newValue))
//         return true
//       }
//     })
//   }

//   return dynamic
// }

// /*******************************************************************************
//  *
//  * Templating
//  *
//  ******************************************************************************/

// const renderMiddlewares = []

// function registerRenderMiddleware (middleware) {
//   renderMiddlewares.push(middleware)
// }

// function render (template) {
//   if (typeof template === 'function') {
//     const formula = template

//     let elem
//     onGetStack.push(id => {
//       depsTree[id].onChangeStack.push(() => {
//         const newElem = render(formula())

//         if (elem._childNodes) {
//           console.log(elem._childNodes[0]);
//           const firstChild = elem._childNodes[0]
//           if (newElem.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
//             newElem._childNodes = Array.from(newElem.childNodes)
//           }
//           firstChild.parentNode.insertBefore(newElem, firstChild)
//           elem._childNodes.forEach(e => {
//             e.remove()
//           })
//           elem = newElem
//         } else {
//           elem.parentNode.insertBefore(newElem, elem)
//           elem.remove()
//           elem = newElem
//         }
//       })
//     })
//     const value = formula()
//     onGetStack.pop()
//     elem = render(value)
//     if (elem.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
//       elem._childNodes = Array.from(elem.childNodes)
//       return elem
//     }
//     return elem
//   }

//   if (typeof template === 'string' || typeof template === 'number') {
//     return document.createTextNode(template)
//   }

//   if (Array.isArray(template)) {
//     const elems = flatten(template).map(render)
//     const fragment = document.createDocumentFragment()
//     elems.forEach(elem => fragment.appendChild(elem))
//     return fragment
//   }

//   if (isObject(template)) {
//     // Create root element
//     const tag = template.tag || 'div'
//     const root = document.createElement(tag)

//     // for (const middleware of renderMiddlewares) {
//     //   middleware(template, root)
//     // }

//     // Set attributes
//     for (const key in template) {
//       if (key !== 'tag' && key !== 'inner') {
//         let value = template[key]

//         if (typeof value === 'function') {
//           const formula = value
//           onGetStack.push(id => {
//             depsTree[id].onChangeStack.push(() => {
//               const newValue = formula()
//               if (typeof newValue === 'string' || typeof newValue === 'number') {
//                 root.setAttribute(key, newValue)
//               } else {
//                 root.removeAttribute(key)
//               }
//             })
//           })
//           value = formula()
//           onGetStack.pop()
//         }

//         if (typeof value === 'string' || typeof value === 'number') {
//           root.setAttribute(key, value)
//         }
//       }
//     }

//     // Set children
//     // const children = alwaysArray(render(template.inner))
//     // for (const child of children) {
//     //   root.appendChild(child)
//     // }

//     // if (typeof template.inner === 'function') {
//     //   const formula = template.inner
//     //   onGetStack.push(id => {
//     //     depsTree[id].onChangeStack.push(() => {
//     //       const newValue = formula()
//     //       root.innerHTML = ''
//     //       // TODO: fragment for arrays seems better, appendChild will work as expected
//     //       root.appendChild(render(newValue))
//     //     })
//     //   })
//     //   const inner = formula()
//     //   onGetStack.pop()
//     //   root.appendChild(render(inner))
//     // }

//     const child = render(flatten(alwaysArray(template.inner)))
//     root.appendChild(child)
//     // const children = flatten(alwaysArray(template.inner))
//     // for (const child of children) {
//     //   root.appendChild(child)
//     // }

//     return root
//   }

//   return document.createTextNode('')
// }

/*******************************************************************************
 *
 * Template middlewares
 *
 ******************************************************************************/

function classArray (template) {
  if (template.class) {
    template.class = flatten(template.class)
      .filter(c => typeof c === 'string')
      .map(c => c.trim())
      .join(' ')
  }
}

function dataObject (template) {
  if (template.data) {
    for (const key in template.data) {
      // camelCase to dash-case
      const dashCaseKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      template[`data-${dashCaseKey}`] = template.data[key]
    }
    delete template.data
  }
}

function camelCaseToDashedCase (template) {
  Object.keys(template).forEach(key => {
    const dashCaseKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    if (dashCaseKey !== key) {
      template[dashCaseKey] = template[key]
      delete template[key]
    }
  })
}

/*******************************************************************************
 *
 * Helpers
 *
 ******************************************************************************/

function flatten (array) {
  let flat = []

  for (const item of array) {
    if (Array.isArray(item)) {
      flat = flat.concat(flatten(item))
    } else {
      flat.push(item)
    }
  }

  return flat
}

function alwaysArray (any) {
  return Array.isArray(any) ? any : [any]
}

function isObject (any) {
  return Object.prototype.toString.call(any) === '[object Object]'
}
