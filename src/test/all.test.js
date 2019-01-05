test('render string', () => {
  const n = render('smth')
  assert(n.textContent === 'smth')
})

test('render number', () => {
  const n = render(56)
  assert(n.textContent === '56')
})

test('render object', () => {
  const n = render({
    tag: 'span',
    class: 'ok',
    id: 'someid',
    'data-id': 56,
    inner: 'smth'
  })

  assert(n)
  assert(n.tagName === 'SPAN')
  assert(n.className === 'ok')
  assert(n.dataset.id === '56')
  assert(n.getAttribute('id') === 'someid')
  assert(n.innerText === 'smth')
})

test('render array', () => {
  const ns = render([
    {
      class: 'a',
      inner: 'first'
    },
    {
      class: 'b',
      inner: 'second'
    }
  ])

  assert(ns.length === 4)
  assert(ns[0][_isStartNode_])
  assert(ns[3][_isEndNode_])
  assert(ns[1].className === 'a')
  assert(ns[1].textContent === 'first')
})

test('render nesting', () => {
  const n = render({
    class: 'app',
    inner: [
      null,
      {
        tag: 'span',
        inner: 'text'
      },
      [
        {
          tag: 'a',
          href: 'https://github.com',
          inner: 'go to github'
        }
      ]
    ]
  })

  assert(n.className === 'app')
  assert(n.children.length === 2)
  assert(n.childNodes.length === 7)
  assert(n.childNodes[2].textContent === 'text')
})

test('render stream', () => {
  const store = dynamic({
    items: [
      { title: 'a' },
      { title: 'b' },
      { title: 'c' }
    ]
  })

  const app = render({
    class: 'app',
    inner: store.items.map$(item => {
      return () => item.title$.toUpperCase()
    })
  })

  store.items.push$({ title: 'd' })
  assert(app.innerText === 'ABCD')

  store.items.unshift$({ title: 'e' })
  assert(app.innerText === 'EABCD')

  store.items.pop$()
  assert(app.innerText === 'EABC')

  store.items.shift$()
  assert(app.innerText === 'ABC')

  store.items.splice$(1, 1, { title: 'd' }, { title: 'e' })
  assert(app.innerText === 'ADEC')

  store.items.splice$(-1, 1)
  assert(app.innerText === 'ADE')

  store.items.splice$(-10, 2, { title: 'f' })
  assert(app.innerText === 'FE')

  store.items[1].title$ = 'G'
  assert(app.innerText === 'FG')
})

test('autorun base', () => {
  const store = dynamic({
    number: 5
  })

  let runs = 0
  autorun(() => {
    runs += 1
    store.number$ // dep
  })

  store.number$ = 2
  store.number$ = 3
  store.number$ = 3
  store.number$ = 3
  store.number$ = 3
  store.number$ = 1

  assert(runs === 4)
})

test('autorun nested', () => {
  const store = dynamic({
    number: 11,
    title: '0'
  })

  let runs = 0
  let secondRuns = 0
  autorun(() => {
    runs += 1
    if (store.number$ > 10) {
      autorun(() => {
        secondRuns += 1
        store.title$ // dep
      })
    }
  })

  store.title$ = '1'
  store.title$ = '2'
  store.title$ = '2'

  assert(runs === 1)
  assert(secondRuns === 3)

  store.number$ = 5
  store.title$ = '3'

  assert(runs === 2)
  assert(secondRuns === 3)

  store.number$ = 12
  store.title$ = '4'
  store.number$ = 13
  store.title$ = '5'

  assert(runs === 4)
  assert(secondRuns === 7)
})

test('autorun standalone', () => {
  const store = dynamic({
    number: 1,
    title: 'a'
  })

  let runs = 0
  let secondRuns = 0
  autorun(() => {
    runs += 1
    if (store.number$ < 5) {
      autorun(() => {
        secondRuns += 1
        store.title$
      }, true)
    }
  })

  store.number$ = 10
  store.title$ = 'b'
  store.title$ = 'c'

  assert(runs === 2)
  assert(secondRuns === 3)

  store.number$ = 4
  store.number$ = 2
  store.title$ = 'd'

  assert(runs === 4)
  assert(secondRuns === 8)
})

test('transaction', () => {
  let app
  let store
  const getData = () => {
    const store = dynamic({
      selected: 0,
      items: [
        { title: 'a' },
        { title: 'b' }
      ]
    })

    const app = render({
      class: 'app',
      inner () {
        const selectedItem = store.items$[store.selected$]
        return selectedItem.title$
      }
    })

    return [store, app]
  }

  // Bad order => throw error
  ;[store, app] = getData()
  try {
    store.items.push$({ title: 'c' })
    store.selected$ = 2
    throw 'bad'
  } catch (err) {
    if (err === 'bad') {
      assert(true)
    } else {
      assert(false)
    }
  }

  // Bad order inside transaction => OK
  ;[store, app] = getData()
  transaction(() => {
    store.selected$ = 2
    store.items.push$({ title: 'd' })
  })
  assert(app.innerText === 'd')
})

function test (what, fn) {
  try {
    fn()
    console.log(`> ${what}: OK`)
  } catch (err) {
    console.log(`> ${what}: BAD`)
    console.error(err)
  }
}

function assert (condition) {
  if (!condition) {
    throw new Error()
  }
}
