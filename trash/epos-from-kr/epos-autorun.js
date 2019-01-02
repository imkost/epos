// Middleware for styles as objects
// Hook?
// function renderApp () {
//   return {
//     class: 'app',
//     styles: {
//       background: 'red',
//     }
//   }
// }

// registerMiddleware({
//   preprocessTemplate (state, template) {
//     state.styles = template.styles
//     delete template.styles
//   },

//   onElementCreated (state, element) {
//     state.styles.
//       if (typeof value === 'function') {
//         autorun(() => {
//           element.setStyle(key, value())
//         })
//       } else {
//         element.setStyle(key, value)
//       }
//   }
// })

// registerTemplateMiddleware(
//   (template) => {
//     delete template.styles template.styles ...
//   },
//   (elem) => {

//   }
// )


// До того как заняться динамичными массивами
// Нужно разобраться с eventListeners + onMount/onUnmount
// parent <-> child i suppose for listeners destroy and mounting and unmounting

// Вместо стэка использовать вот такую запись:
// prevCur = cur
// cur = root
// [`parent` is `prevCur`] даже если какая угодно вложенность, такая схема помогает регистрировать именно нужные связи
// reactive()
// cur = prevCur

store.items$
store.items.push$(3)
store.items$.push$(3)


function sum () {
  store.items$.map()
}
d(sum)

const sum = createDynamicSource({
  value: 0
})

createAutorun(() => {
  let s = 0
  store.items$.map(item => {
    s += item
  })
  sum.value$ = s
})


store.items$push('3')


document.addEventListener('DOMContentLoaded', () => {
  const autorun = createAutorun

  window.store = createDynamicSource({
    items: [
      'a',
      'b'
    ]
  })

  const $app = render({
    inner () {
      return store.items$.map(item => {
        return item + '--'
      })
    }
  })

  document.body.appendChild($app)

  return


  function isLarge () {
    if (store.size$ > 3) {
      return true
    }

    return store.wer$ > 5
  }

  function upper () {
    if (d(isLarge)) {
      return store.title$.toUpperCase()
    }

    return store.view$.toUpperCase()
  }

  // createAutorun(() => {
  //   if (store.size$ > 5) {
  //     createAutorun(() => {
  //       console.log('retitle', store.title$);
  //     })
  //   }

  //   return 's'
  // })

  window.$app = render({
    inner () {
      console.log('redraw inner');
      return d(upper)

      return 'small'
    },
    // inner () {
    //   return d(isLarge) ? store.size$ : {inner: 'small'}
    //   if (store.size$ > 5) {
    //     return {
    //       inner () {
    //         return store.title$
    //       }
    //     }
    //   }

    //   return 'small'
    // }

    // inner () {
    //   return [
    //     () => store.title$,
    //     () => store.size$ > 5 ? 'BIG' : null,
    //     {
    //       inner () {
    //         if (store.size$ > 5) {
    //           return {
    //             inner () {
    //               return 'LARGE' + store.title$
    //             }
    //           }
    //         }

    //         return {
    //           inner: 'small'
    //         }
    //       }
    //     }
    //   ]
    // }
  })

  document.body.appendChild($app)
})

// destroy autoruns on rerun because

const onGetStack = []
const autorunStack = []
var curAutorun = null

function createAutorun (fn, trackParents = false) {
  let deps = []
  const children = []
  const autorun = {
    children,
    stop,
    run
  }

  if (trackParents) {
    const parentAutorun = getLast(autorunStack)
    if (parentAutorun) {
      parentAutorun.children.push(autorun)
    }
  }

  run()

  return autorun

  function run () {
    curAutorun = autorun
    stop()

    onGetStack.push(onGet)
    autorunStack.push(autorun)
    fn()
    autorunStack.pop()
    onGetStack.pop()
  }

  function onGet ({ source, key }) {
    deps.push({ source, key })
    source[`${key}$onChange`].add(run)
  }

  function stop () {
    // Clear deps
    for (const dep of deps) {
      dep.source[`${dep.key}$onChange`].delete(run)
    }
    deps = []

    // Stop children
    for (const child of children) {
      child.stop()
    }
  }
}

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
            onGet({ source, key })
          }

          return source[key]
        },

        set (newValue) {
          if (source[key] !== newValue) {
            source[key] = newValue
            Array.from(onChangeList).forEach(c => c())
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

    if (Array.isArray(source[key])) {
      Object.defineProperties(source[`${key}$`], {
        push$: {
          get () {
            return (item) => {
              source[key].push(item)
              Array.from(onChangeList).forEach(c => c())
            }
          }
        },
        pop$: {
          get () {
            return (item) => {
              source[key].pop(item)
              Array.from(onChangeList).forEach(c => c())
            }
          }
        },
        shift$: {
          get () {
            return (item) => {
              source[key].shift(item)
              Array.from(onChangeList).forEach(c => c())
            }
          }
        },
        unshift$: {
          get () {
            return (item) => {
              source[key].unshift(item)
              Array.from(onChangeList).forEach(c => c())
            }
          }
        }
      })
    }
  }

  return source
}

function getLast (array) {
  return array[array.length - 1] || null
}

function isObject (any) {
  return Object.prototype.toString.call(any) === '[object Object]'
}

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

function render (template) {
  if (typeof template === 'string' || typeof template === 'number') {
    return document.createTextNode(template)
  }

  if (Array.isArray(template)) {
    // TODO: no need for extra flatten, it should be performed during ===function section
    const result = flatten(flatten(template).map(render))
    if (result.length === 0) {
      return [document.createTextNode('')]
    }

    return result
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

          createAutorun(() => {
            // Куда бы здесь middleware поставить, возможно не делать setAttribute,
            // а сохранять attrs как объект, функции будут результатом?
            // но как вызывать middleware для class, например, динамически?
            // Подумать: вместо middleware -- блоки с функциональностью?
            // Не, не подойдет, мы не хотим блок каждый раз прописывать, нужны именно
            // low-level интерцепторы-миддлевары
            // Может быть для middleware сделать что-то вроде нескольких типов?
            // 1) Просто преобразует входной template (data: {} => data-)
            // 2) Преобразует результат (либо функция, либо сразу значение) (class: [] => class: '')
            // Еще middleware первого типа должны вызывать перед tag, чтобы сделать href => div/a middleware
            // registerTemplateMiddleware((template) => {})
            // registerAttributeMiddleware(({ name, value }) => { name, value })
            const newValue = value()
            if (prevValue !== newValue) {
              prevValue = newValue
              if (typeof newValue === 'string' || typeof newValue === 'number') {
                root.setAttribute(key, newValue)
              } else {
                root.removeAttribute(key)
              }
            }
          }, true)
        } else {
          if (typeof value === 'string' || typeof value === 'number') {
            root.setAttribute(key, value)
          }
        }
      }
    }

    // Set children
    const children = alwaysArray(render(template.inner))
    for (const child of children) {
      root.appendChild(child)
    }

    return root
  }

  if (typeof template === 'function') {
    let prevNodes = []

    createAutorun(() => {
      const newNodes = alwaysArray(render(template()))

      if (prevNodes.length) {
        newNodes.forEach(newNode => {
          prevNodes[0].parentNode.insertBefore(newNode, prevNodes[0])
        })
        prevNodes.forEach(prevNode => {
          prevNode.remove()
        })
      }

      prevNodes = newNodes
    }, true)

    return prevNodes
  }

  return document.createTextNode('')
}

const cache = new Map()

function d (fn) {
  if (typeof fn !== 'function') {
    return fn
  }

  if (!cache.has(fn)) {
    const state = createDynamicSource({
      value: void 0
    })

    createAutorun(() => {
      const newValue = fn()
      if (newValue !== state.value) {
        state.value$ = newValue
      }
    })
    cache.set(fn, state)
  }

  state = cache.get(fn)
  return state.value$
}





/*

const onGetStack = []
const autorunStack = []

function Autorun (fn) {
  this.fn = fn
  this.deps = []
  this.onDestroyList = new Set()

  const parentAutorun = getLast(autorunStack)
  if (parentAutorun) {
    parentAutorun.onDestroyList.add(this.destroy.bind(this))
  }

  autorunStack.push(this)
  this.run = this.run.bind(this)
  this.run()
  autorunStack.pop()
}

Autorun.prototype.run = function () {
  this.onDestroyList.forEach(fn => fn())
  this.clearDeps()
  onGetStack.push(({ source, key }) => {
    this.deps.push({ source, key })
    source[`${key}$onChangeList`].add(this.run)
  })
  this.fn()
  onGetStack.pop()
}

Autorun.prototype.destroy = function () {
  this.onDestroyList.forEach(fn => fn())
  this.clearDeps()
}

Autorun.prototype.clearDeps = function () {
  this.deps.forEach(({ source, key }) => {
    source[`${key}$onChangeList`].delete(this.run)
  })
  this.deps = []
}

function getLast (array) {
  return array.length ? array[array.length - 1] : null
}


/*



class List {

  constructor () {
    this.set = new Set()
  }

  add () {

  }

  delete () {

  }
}

class Autorun {
  constructor (fn) {
    this._fn = fn
    this._deps = new List()
    this._onDestroyList = new List()

    const parentAutorun = getLast(Autorun.stack)
    if (parentAutorun) {
      parentAutorun.onDestroyList.add(() => {
        this.destroy()
      })
    }

    Autorun.stack.add(this)
    this._run()
    Autorun.stack.pop()
  }

  clearDeps () {
    this._deps.forEach(({ source, key }) => {
      source[`${key}$onChangeList`].delete(this._run)
    })
    this._deps.clear()
  }

  _run () {
    this.clearDeps()
  }
}
Autorun.stack = new List()



function createAutorun (fn) {
  const deps = []
  const onDestroyList = []

  const autorun = {
    destroy () {
      onDestroyList
    }
  }

  function clearDeps () {

  }
}


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
            Array.from(onChangeList).forEach(c => c())
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

const autorunStack = []

function autorun (fn) {
  const deps = new Set()
  run()

  const self = {
    destroy () {
      for (const dep of deps) {
        dep.source[`${dep.key}$onChange`].delete(run)
      }
      deps.clear()
    },
    onDestory: []
  }

  autorunStack.push(self)

  const currentAutorun = getLast(autorunStack)
  currentAutorun.onDestory(() => {
    self.destroy()
  })

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

  autorunStack.pop()

  return self
}

const store = createDynamicSource({
  size: 3,
  title: 'title'
})

autorun(() => {
  console.log('run1');

  if (store.size$ > 10) {
    console.log('BIG')
  } else {
    console.log(store.title$, 'SMALL')
  }

  autorun(() => {
    console.log('run2');
    if (store.size$ )
  })
})
*/
