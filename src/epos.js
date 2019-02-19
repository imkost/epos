/*!
 * Эпос использует несколько своих внутренних понятий.
 * Пройдемся по каждому из них:
 *
 * 1. Мнимые поля у объекта.
 * Это non-enumarable поля создаваемые через Object.defineProperty.
 * К этим поляем можно обращаться, но их не получить через
 * `for (key in obj)` или `Object.keys(obj)`.
 *
 * 1. Источник (source).
 * Бывает двух типов: объект и массив.
 *
 * Источник-объект — это объект у которого для каждого поля существует такое
 * же мнимое поле, заканчивающееся на `$`. Например, для объекта {a, b}
 * источник будет выглядеть так: {a, b, a$, b$}, где a$ и b$ — мнимые поля.
 * У мнимых полей прописаны getter и setter, благодаря которым реализуется
 * реактивность.
 *
 * Источник-массив — это обычный массив с мнимыми методами push$/pop$/etc.
 * Эти методы превносят реактивность. В обычном javascript array.push
 * не изменяет значение массива, но в Эпосе sourceArray.push$ сработает так,
 * будто значение изменилось (на самом деле оно не изменится), то есть все
 * вычисления, зависящие от sourceArray, перевычислятся.
 *
 * 2. Динамичные поля у объекта-источника.
 * Это мнимые поля, которы заканчиваются на $ и у которых определены
 * специальные getter/setter о которых говорилось выше.
 *
 * 3. Вычисление (computation или просто comp).
 * TODO: добавить описание
 *
 * 4. Потоки (streams).
 * TODO: добавить описание
 */

// TODO:
// если вручную удалить элемент elem.remove() или elem.outerHTML = '',
// то он удалится из дома, в памяти он все еще будет жить, если до него есть
// ссылка. поэтому правильно, чтобы на нем вся динамичность продолжала
// выполняться. если мы хотим убить всю динамичность, то нужно вызвать
// какой-то метод

// TODO:
// всюду где используются `.remove()` надо кажется останавливать реактивности
// внутри или все уже останавливается?

window.Epos = {
  dynamic,
  autorun,
  transaction,
  render,
  raw,
  discontinue // dispouse?
}

render.addPlugin = addRenderPlugin

/* VARS
---------------------------------------------*/

// Функция, которая срабатывает на реактивный get переменной
let curGet = null

// Текущее реактивное вычисление (вычисления создаются функцией autorun)
let curComp = null

// Список отложенных реакций на реактивность. Используется для транзакций.
// Без транзакций реакции моментальны, не кладутся в стэк.
let curStack = null

// Счетчик с инкрементом, используется для создания баундари-нод
let boundaryId = 1

// Список всевозможных названий dom-событий ('onclick', 'onmousedown', etc)
const events = getAllEvents()

// Список плагинов для рендеринга
const plugins = []

// Набор функций, которые будут выполнены, когда root-computation
// перевычислится. Под рутовым вычислением имеется в виду тот, который
// перевычислился при реактивном измененнии одной из своих зависимостей,
// а не тот, который перевычислился из-за того, что его родитель-computation
// перевычислился. Этот набор нужен для реализации `getComputed`.
const afterRun = new Set()

// Все символы, которые используются Эпосом
const _boundaryId_ = Symbol('boundaryId')
const _children_ = Symbol('children')
const _comp_ = Symbol('comp')
const _isStream_ = Symbol('isStream')
const _source_ = Symbol('source')
const _splice_ = Symbol('splice')
const _usages_ = Symbol('usages')

/* DYNAMIC
---------------------------------------------*/

/**
 * Имеет два различных поведения:
 * 1. Если передать функцию, то сработает как `getComputed`.
 * 2. Иначе создаст источник.
 */
function dynamic (any) {
  if (isFunction(any)) {
    return getComputed(any)
  }

  return createSource(any)
}

/* CREATE SOURCE
---------------------------------------------*/

/**
 * Источник из объекта — это обычный объект, но с динамичными полями
 * (те, которые мнимые и кончаются на $).
 *
 * Источник из массива — это массив с мнимыми методами pop$/push$/etc.
 *
 * Если передать ни объект и ни массив, то вернется переданное значение.
 *
 * parentChange — это change (см. createSourceObject) source-родителя,
 * используется только для реализации источников-массивов, а в объектах
 * он не нужен.
 */
function createSource (any, parentChange) {
  if (isObject(any)) {
    return createSourceObject(any)
  }

  if (isArray(any)) {
    return createSourceArray(any, parentChange)
  }

  return any
}

/* CREATE SOURCE OBJECT
---------------------------------------------*/

function createSourceObject (object) {
  const source = {}

  for (const key in object) {
    const value = object[key]
    // Набор функций, которые будут вызваны при реактивном изменении значения
    const change = new Set()
    source[key] = createSource(value, change)

    Object.defineProperty(source, `${key}$`, {
      get () {
        // Через curGet мы получаем способ "слушать" get-события, благодаря
        // чему и реализуется реактивность. curGet проставляется authorun-ом.
        if (curGet) {
          curGet(change)
        }
        return source[key]
      },
      set (newValue) {
        if (source[key] !== newValue) {
          // Не забываем превращать новые значения в источник,
          // чтобы и у нихработала реактивность
          source[key] = createSource(newValue, change)

          // Вызываем все change-"слушатели"
          callFnsStack(change)
        }
        return true
      }
    })
  }

  return source
}

/* CREATE SOURCE ARRAY
---------------------------------------------*/

function createSourceArray (array, parentChange) {
  const source = array.map(i => createSource(i))
  // Набор функций, которые будут вызваны при splice$
  source[_splice_] = new Set()

  // Навешиваем мнимые реактивные методы: pop$/push$/etc
  Object.defineProperties(source, {
    pop$: { get: () => pop$ },
    push$: { get: () => push$ },
    shift$: { get: () => shift$ },
    unshift$: { get: () => unshift$ },
    splice$: { get: () => splice$ },
    map$: { get: () => map$ }
  })

  return source

  function map$ (fn) {
    return createStream(source, fn)
  }

  // Все функции по изменению массива реализовываем через splice и далее
  // по коду считаем, что существует только splice. Так проще: поддерживаем
  // реактивность только для splice-а, а не для каждого метода отдельно.

  function pop$ () {
    const removed = splice$(source.length - 1, 1)
    return removed[0]
  }

  function push$ (item) {
    splice$(source.length, 0, item)
    return source.length
  }

  function shift$ () {
    const removed = splice$(0, 1)
    return removed[0]
  }

  function unshift$ (item) {
    splice$(0, 0, item)
    return source.length
  }

  function splice$ (start, removeCount, ...items) {
    // Переводим start и removeCount в более удобные значения.
    //
    // start и removeCount могут быть любыми числами, например, они могут быть
    // отрицательными или выходить за размеры массива. Оригинальный js-овский
    // splice поддерживает всевозможные случаи. Для удобства, мы переводим
    // нестандартные значения в равносильные, но более удобные:
    // start не может быть меньше нуля и больше размера массива,
    // removeCount тоже неотрицательный и не может "выходить" за размеры
    // массива.
    //
    // TODO: прочекать, что будет, если передавать нецелые числа
    // TODO: прочекать, что будет, если передавать не числа
    if (start < 0) {
      start = Math.max(0, source.length + start)
    } else if (start > source.length - 1) {
      start = source.length
    }
    removeCount = Math.max(0, Math.min(source.length - start, removeCount))

    // Каждый item переводим в источник
    items = items.map(i => createSource(i))

    // Производим оригинальный сплайс
    const removed = source.splice(start, removeCount, ...items)

    // Вызываем "слушателей" сплайса
    callFnsStack(source[_splice_], start, removeCount, ...items)

    // Для реактивности считаем, что сплайс изменяет переменную
    // (на самом деле ссылка не меняется), поэтому вызываем `parentChange`
    if (parentChange) {
      callFnsStack(parentChange)
    }

    return removed
  }
}

/* CALL OR GET
---------------------------------------------*/

// TODO: добавить ее в api?
function callOrGet (value) {
  if (isFunction(value)) {
    return value()
  }

  return value
}


/* GET COMPUTED
---------------------------------------------*/

function getComputed (any) {
  if (!isFunction(any)) {
    return any
  }

  const fn = any

  // Если для переданной функции еще не вызывался `getComputed`
  if (!fn[_source_]) {
    // Создаем счетчик использований, который говорит сколько раз getComputed
    // от переданной функции вызывался внутри computation-ов
    fn[_usages_] = 0

    // Создаем источник для функции со значением undefined
    fn[_source_] = createSource({
      value: void 0
    })

    // Перевычисляем значение в standalone-computation (передаем true в авторан)
    fn[_comp_] = autorun(() => {
      fn[_source_].value$ = fn()
    }, true)
  }

  // Если мы внутри computation-а
  if (curComp) {
    // Увеличиваем счетчик использований
    fn[_usages_] += 1

    onStop(curComp, () => {
      // А когда computation останавливается, понижаем счетчик использований.
      // Если внутри computation-а getComputed от одной функции вызовется
      // дважды, то счетчик увеличится на 2, а при остановке уменьшится
      // на 2 — все ок.
      fn[_usages_] -= 1

      // Как только рутовый computation закончится, нужно проверить, что
      // getComputed от функции нигде больше не используется ....
      afterRun.add(checkUsages)

      function checkUsages () {
        // ... И если он действительно больше нигда не используется
        if (fn[_usages_] === 0) {
          // То останавливаем computation
          fn[_comp_].stop()

          // Обнуляем source
          fn[_source_] = null
        }

        // Перестаем проверять использования
        afterRun.delete(checkUsages)
      }
    })
  }

  // Возвращаем реактивный get на value, таким образом computation, который
  // внутри вызывает getComputed(fn) будет зависеть динамически только
  // от результата fn, а не от всех ее внутренностей
  return fn[_source_].value$
}

/* TRANSACTION
---------------------------------------------*/

function transaction (fn) {
  // Сохраняем родительский стэк
  const parentStack = curStack

  // Создаем новый
  curStack = []

  // Выполняем транзакцию с новым стэком
  fn()

  // Пачкой вызываем все реакции, которые накопились при вызове fn()
  for (const callback of curStack) {
    callback()
  }

  // И переходим обратно в родительский стэк
  curStack = parentStack
}

/* CREATE STREAM
---------------------------------------------*/

// TODO: подумать над реактивным индексом
// возможно что-то вроде dynamic(i) или i.value$
function createStream (sourceArray, fn) {
  const stream = createSource(sourceArray.map(fn))

  // Помечаем поток, чтобы при рендеринге отличать его от массива
  stream[_isStream_] = true

  // Слушаем splice$
  onSplice(sourceArray, (start, removeCount, ...items) => {
    // Трансформируем новые значения
    items = items.map(i => fn(i))

    // Делаем реактивный splice$, что стриггерить слушателей потока,
    // если такие имеются
    stream.splice$(start, removeCount, ...items)
  })

  return stream
}

/* AUTHORUN
---------------------------------------------*/

/**
 * Самая сложная для понимания часть библиотеки. Все реактивные вещи —
 * это autorun. Вызов autorun создает новый computation.
 *
 * isStandalone создает standalone-computation вместо обычного, это означает,
 * что такой computation не будет остановлен при остановке computation-родителя.
 * Точнее даже так: у такого computation-а не будет родителя, даже если
 * иерархически родитель есть. Такой computation можно остановить только
 * вручную вызвав метод stop.
 *
 * TODO: добавить описание
 * TODO: проверить, может реализация через класс добавит производительности
 */
function autorun (fn, isStandalone = false) {
  // Тут хранятся change-наборы зависимых переменных
  let deps = new Set()

  const comp = {
    stop,
    [_children_]: []
  }

  // Если есть родительский computation и autorun не в standalone-режиме,
  // то прописываем себя в дети родителя
  if (curComp && !isStandalone) {
    curComp[_children_].push(comp)
  }

  run()

  return comp

  function run () {
    stop()

    // Сохраняем родительские get и comp
    const parentGet = curGet
    const parentComp = curComp

    // Меняем текущие get и comp (создаем новый скоуп)
    curGet = get
    curComp = comp

    // Вызываем функцию в текущем скоупе
    fn()

    // Возвращаемся в родительский скоуп
    curGet = parentGet
    curComp = parentComp

    // Если `curComp` оказался null-ом, значит это закончил свое перевычисление
    // root-computation (см. описание `afterRun` выше).
    if (curComp === null) {
      // Вызываем все функции в `afterRun`
      callFns(afterRun)
    }
  }

  function get (change) {
    // Добавляем зависимость
    change.add(run)
    deps.add(change)
  }

  function stop () {
    // Останавливаем всех детей
    for (const child of comp[_children_]) {
      child.stop()
    }
    comp[_children_] = []

    // Удаляем все связанные зависимости
    for (const change of Array.from(deps)) {
      change.delete(run)
    }
    deps.clear()
  }
}

/* RENDER
---------------------------------------------*/

function render (template) {
  if (template instanceof window.Node) {
    return template
  }

  if (isStringOrNumber(template)) {
    return document.createTextNode(template)
  }

  if (isObject(template)) {
    return renderObject(template)
  }

  if (isArray(template)) {
    return renderArray(template)
  }

  if (isFunction(template)) {
    return renderFunction(template)
  }

  if (isStream(template)) {
    return renderStream(template)
  }

  return document.createTextNode('')
}

/* RENDER OBJECT
---------------------------------------------*/

function renderObject (template) {
  // Выполняем препроцессинг плагинами
  const stateByPlugin = new Map()
  for (const plugin of plugins) {
    if (plugin.preprocess) {
      const state = {}
      stateByPlugin.set(plugin, state)
      plugin.preprocess({ state, template })
    }
  }

  // Создаем ноду
  let node
  // TODO: валидировать tag
  const tag = template.tag || 'div'
  if (template.xmlns) {
    node = document.createElementNS(template.xmlns, tag)
  } else {
    node = document.createElement(tag)
  }

  // Проставляем атрибуты и навешиваем события
  for (const key in template) {
    if (key !== 'tag' && key !== 'inner' && key !== 'xmlns') {
      const value = template[key]
      if (events.includes(key.toLowerCase()) && isFunction(value)) {
        node.addEventListener(key.toLowerCase().slice(2), value)
      } else {
        autorun(() => {
          setAttributeSafe(node, key, callOrGet(value))
        })
      }
    }
  }

  // Рендерим и добавляем детей
  const children = toFlatArray(render(template.inner))
  for (const child of children) {
    node.appendChild(child)
  }

  // Постпроцессим плагинами
  for (const plugin of plugins) {
    if (plugin.postprocess) {
      const state = stateByPlugin.get(plugin)
      plugin.postprocess({ state, template, node })
    }
  }

  return node
}

function setAttributeSafe (elem, key, value) {
  // Если валидное значение, то проставляем его
  if (isStringOrNumber(value) || typeof value === 'boolean') {
    // Если поле есть на элементе, то меняем его, иначе — ставим атрибут.
    // Почему так? Например, для input-ов есть поле value и менять его
    // следует именно через input.value, а не через
    // input.setAttribute('value', ...)
    if (key in elem) {
      elem[key] = value
    } else {
      elem.setAttribute(key, value)
    }
  // Если невалидное, удаляем атрибут
  } else {
    elem.removeAttribute(key)
  }
}

/* RENDER ARRAY
---------------------------------------------*/

function renderArray (template) {
  const [startNode, endNode] = createBoundaryNodes()
  return [
    startNode,
    ...toFlatArray(template.map(render)),
    endNode
  ]
}

/* RENDER FUNCTION
---------------------------------------------*/

function renderFunction (template) {
  const [startNode, endNode] = createBoundaryNodes()
  let nodes

  let isFirstRun = true
  autorun(() => {
    const newNodes = toFlatArray(render(template()))

    if (isFirstRun) {
      nodes = newNodes
      isFirstRun = false
    } else {
      // Создаем фрагмент со всеми новыми нодами
      const fragment = document.createDocumentFragment()
      for (const newNode of newNodes) {
        fragment.appendChild(newNode)
      }

      // Удаляем все ноды между start и end
      while (startNode.nextSibling !== endNode) {
        startNode.nextSibling.remove()
      }

      // Вставляем фрагмент между start и end
      endNode.parentNode.insertBefore(fragment, endNode)
    }
  })

  return [
    startNode,
    ...nodes,
    endNode
  ]
}

/* RENDER STREAM
---------------------------------------------*/

function renderStream (stream) {
  const nodes = renderArray(stream)
  const startNode = nodes[0]
  const endNode = nodes[nodes.length - 1]

  // TODO: порефакторить все, что внутри
  onSplice(stream, (start, removeCount, ...items) => {
    let i = 0
    let cursor = startNode.nextSibling

    if (!cursor) {
      // probably rerun of already removed elements
      console.log('strange')
      return
    }

    const children = []

    while (cursor !== endNode) {
      if (cursor[_boundaryId_]) {
        const nodes2 = []
        const boundaryId = cursor[_boundaryId_]
        while (true) {
          nodes2.push(cursor)
          cursor = cursor.nextSibling
          if (cursor[_boundaryId_] === boundaryId) {
            nodes2.push(cursor)
            break
          }
        }
        children.push(nodes2)
      } else {
        children.push(cursor)
      }

      cursor = cursor.nextSibling
    }

    const nodesToRemove = []
    const bef = toFlatArray(children[start] || endNode)[0]

    for (i = 0; i < removeCount; i++) {
      const cc = toFlatArray(children[start + i])
      for (const c of cc) {
        nodesToRemove.push(c)
      }
    }

    for (const item of items) {
      const ii = toFlatArray(render(item))
      for (const i of ii) {
        bef.parentNode.insertBefore(i, bef)
      }
    }

    for (const n of nodesToRemove) {
      n.remove()
    }
  })

  return nodes
}

/* ADD RENDER PLUGIN
---------------------------------------------*/

function addRenderPlugin (plugin) {
  plugins.push(plugin)
}

/* RAW
---------------------------------------------*/

function raw (string) {
  const div = render({})
  div.innerHTML = string
  return Array.from(div.childNodes)
}

/* DISCONTINUE
---------------------------------------------*/

// stops all dynamic computation for the given element
function discontinue (node) {
}

/* OTHER
---------------------------------------------*/

function removeNode (node) {
  // node.remove()
  // discontinue(node)
}

/**
 * Навешивает splice-слушатель на переданный sourceArray
 */
function onSplice (sourceArray, fn) {
  if (sourceArray[_splice_]) {
    sourceArray[_splice_].add(fn)

    // Если мы внутри computation-а, ...
    if (curComp) {
      // ... то при его остановке перестаем слушать сплайс
      onStop(curComp, () => {
        sourceArray[_splice_].delete(fn)
      })
    }
  }
}

/**
 * Вызывает все переданные функции с переданными аргументами одну за другой,
 * но если мы внутри транзакции, то кладет вызовы в стэк
 */
function callFnsStack (fns, ...args) {
  if (!fns) {
    return
  }

  if (curStack) {
    curStack.push(call)
  } else {
    call()
  }

  function call () {
    callFns(fns, ...args)
  }
}

/**
 * Просто вызывает все переданные функции с переданными аргументами
 */
function callFns (fns, ...args) {
  for (const fn of Array.from(fns)) {
    fn(...args)
  }
}

/**
 * Возвращает список всевозможных dom-событий ('onclick', 'onmousedown', etc)
 * Взято отсюда:
 * https://css-tricks.com/snippets/javascript/get-possible-dom-events/
 */
function getAllEvents () {
  const events = []
  for (const key in document) {
    const value = document[key]
    if (key.startsWith('on') && (value === null || isFunction(value))) {
      events.push(key)
    }
  }

  return events
}

function createBoundaryNodes () {
  const startNode = document.createTextNode('')
  const endNode = document.createTextNode('')
  startNode[_boundaryId_] = boundaryId
  endNode[_boundaryId_] = boundaryId
  boundaryId += 1
  return [startNode, endNode]
}

function onStop (comp, fn) {
  comp[_children_].push({
    stop () {
      fn()
    }
  })
}

/* UTILS
---------------------------------------------*/

function isStringOrNumber (any) {
  return typeof any === 'string' || typeof any === 'number'
}

function isFunction (any) {
  return typeof any === 'function'
}

function isObject (any) {
  return Object.prototype.toString.call(any) === '[object Object]'
}

function isArray (any) {
  return Array.isArray(any) && !any[_isStream_]
}

function isStream (any) {
  return any && any[_isStream_]
}

function toFlatArray (any) {
  return isArray(any) ? any.flat() : [any]
}
