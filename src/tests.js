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
  assert(_boundaryId_ in ns[0])
  assert(_boundaryId_ in ns[3])
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

  store.items.splice$(4, 10, { title: 'u' })
  assert(app.innerText === 'FGU')

  store.items.splice$(1, -2, { title: 'p' })
  assert(app.innerText === 'FPGU')
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

test('stop autoruns for removed elements', () => {
  const store = dynamic({
    title: 'a',
    shown: true,
    shown2: true,
    number: 4
  })

  const isBig = () => {
    console.log('run big');
    return store.number$ > 5
  }

  window.isBig = isBig

  let hrefRuns = 0
  let titleRuns = 0
  const app = render({
    inner: [
      () => {
        console.log('rerun 1');
        if (store.shown$) {
          return dynamic(isBig) ? 'large' : 'small'
        }
        return '--'
      },
      () => {
        console.log('rerun 2');
        if (store.shown2$) {
          return dynamic(isBig) ? 'large' : 'small'
        }
        return '--'
      }
    // inner () {
    //   if (store.shown$) {
    //     return {
    //       href () {
    //         hrefRuns += 1
    //         return store.title$
    //       }
    //       // inner: store.title$
    //       // inner () {
    //       //   titleRuns += 1
    //       //   return store.title$
    //       // }
    //     }
    //   }
    //   return 'hidden'
    // }
    ]
  })

  // dynamic(() => store.title$)
  // dynamic(() => store.title$)
  window.store = store

  // // // assert(titleRuns === 1)

  // // store.title$ = 'b'
  // // // assert(titleRuns === 2)

  // store.shown$ = false
  // store.title$ = 'c'
  // store.title$ = 'd'
  // console.log(hrefRuns)
  // // console.log(hrefRuns)
  document.body.appendChild(app)

  console.log('############### ')
  store.shown$ = false
  store.shown2$ = false
  store.number$ = 1
  // store.number$ = 10
  console.log('############### ')
  // store.shown2$ = true
  // store.number$ = 2
})

// test('complex', () => {
//   const store = dynamic({
//     show: true,
//     items: ['a', 'b', 'c'],
//     numbers: [
//       { v: 1 }
//     ]
//   })

//   const strings = store.numbers.map$(number => {
//     return `_${number.v}_`
//   })

//   const uppered = store.items.map$(item => {
//     return item.toUpperCase()
//   })

//   const app = render({
//     class: 'app',
//     inner: [
//       {
//         class: 'strings',
//         inner: strings.map$(string => {
//           return string
//         })
//       },

//       () => {
//         if (store.show$) {
//           return uppered.map$(item => {
//             return item + '-'
//           })
//         }

//         return {
//           tag: 'i',
//           inner: 'nothing'
//         }
//       },

//       {
//         inner: store.items.map$(char => {
//           return [
//             {
//               tag: 'h2',
//               inner: char.toUpperCase()
//             },
//             store.numbers.map$(number => {
//               return () => {
//                 if (store.show$) {
//                   return [
//                     {
//                       class: 'a',
//                       inner: store.items.map$(char => {
//                         return char.toUpperCase() + '-'
//                       })
//                     }
//                   ]
//                 }
//                 return {
//                   inner: 'not shown'
//                 }
//               }
//             })
//           ]
//         })
//       }
//     ]
//   })

//   store.numbers.push$({ v: 7 })
//   store.items.push$('g')
//   store.items.splice$(1, 1, 'fa')
//   store.numbers.shift$()

//   window.app = app
//   document.body.appendChild(app)
//   // app.querySelector()
// })

function test (what, fn) {
  fn()
  return
  try {
    fn()
    console.log('%c+ ' + what, 'color: green')
  } catch (err) {
    console.log(`%c✕ ${what}`, 'color: red')
    console.error(err)
  }
}

function assert (condition) {
  if (!condition) {
    throw new Error()
  }
}
