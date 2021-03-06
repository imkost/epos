// const { render, dynamic, autorun, compound, suspend } = window.Epos

const dynamic = Epos.dynamic
const testStore = dynamic({
  tests: []
})

document.body.appendChild(render({
  style: `
    font-family: sans-serif;
    font-size: 14px;
    width: 400px;
    padding-top: 20px;
    margin: 0 auto;
  `,
  inner: [
    {
      style: `
        margin-bottom: 20px;
        padding: 20px;
        border-bottom: 1px solid #ebebeb;
      `,
      inner: 'TESTS'
    },
    testStore.tests.map$(test => {
      const i = () => testStore.tests$.indexOf(test)
      return {
        style: `
          display: flex;
          margin: 5px;
        `,
        inner: [
          {
            style: `
              ${test.isSuccess ? `color: green` : `color: red`};
              width: 20px;
              text-align: left;
            `,
            inner: test.isSuccess ? `✓` : `✗`
          },
          {
            style: `
              width: 20px;
              text-align: right;
              margin-right: 5px;
              font-family: Georgia;
              font-style: italic;
              color: #888;
            `,
            inner () {
              return computed(i) + 1 + '.'
            }
          },
          {
            inner: test.what
          }
        ]
      }
    })
  ]
}))

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
  // assert(_boundaryId_ in ns[0])
  // assert(_boundaryId_ in ns[3])
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

test('render streams more', () => {
  const store = dynamic({
    visible: true,
    items: [
      { title: 'a' },
      { title: 'b' },
      { title: 'c' }
    ]
  })

  let itemRunCount = 0
  const app = render({
    class: 'app',
    inner () {
      if (!store.visible$) {
        return 'none'
      }

      return store.items.map$(item => {
        itemRunCount += 1
        return item.title.toUpperCase()
      })
    }
  })

  assert(itemRunCount === 3)

  store.visible$ = false
  store.items.push$({ title: 'd' })
  assert(itemRunCount === 3)
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

test('compound', () => {
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

  // Bad order inside compound => OK
  ;[store, app] = getData()
  compound(() => {
    store.selected$ = 2
    store.items.push$({ title: 'd' })
  })
  assert(app.innerText === 'd')
})

test('stop autoruns for removed elements', () => {
  const store = dynamic({
    title: 'a',
    shown: true,
    href: 'a'
  })

  let runs = 0
  let hrefRuns = 0
  let titleRuns = 0

  // const hrefComputed = () => {
  //   hrefRuns += 1
  //   return store.href$
  // }
  // window.hrefComputed = hrefComputed

  const app = render({
    inner: [
      () => {
        runs += 1
        if (store.shown$) {
          return {
            href () {
              // return computed(hrefComputed)
              hrefRuns += 1
              return store.href$
            },
            inner () {
              titleRuns += 1
              return store.title$
            }
          }
        }

        return '-'
      },
    ]
  })

  assert(runs === 1)
  assert(hrefRuns === 1)
  assert(titleRuns === 1)

  store.href$ = 'b'
  assert(runs === 1)
  assert(hrefRuns === 2)
  assert(titleRuns === 1)

  store.shown$ = false
  assert(runs === 2)
  assert(hrefRuns === 2)
  assert(titleRuns === 1)

  store.href$ = 'c'
  assert(runs === 2)
  assert(hrefRuns === 2)

  assert(titleRuns === 1)
})

test('stop computed when no more deps', () => {
  const store = dynamic({
    title: 'a',
    shown: true,
    shown2: true,
    number: 4
  })

  let isBigRuns = 0
  const isBig = () => {
    isBigRuns += 1
    return store.number$ > 5
  }
  window.isBig = isBig

  let firstRuns = 0
  let secondRuns = 0
  const app = render({
    inner: [
      () => {
        firstRuns += 1
        if (store.shown$) {
          return computed(isBig) ? 'large' : 'small'
        }
        return '--'
      },
      () => {
        secondRuns += 1
        if (store.shown2$) {
          return computed(isBig) ? 'large' : 'small'
        }
        return '--'
      }
    ]
  })

  assert(isBigRuns === 1)
  assert(firstRuns === 1)
  assert(secondRuns === 1)

  store.number$ = 3
  assert(isBigRuns === 2)
  assert(firstRuns === 1)
  assert(secondRuns === 1)

  store.number$ = 6
  assert(isBigRuns === 3)
  assert(firstRuns === 2)
  assert(secondRuns === 2)

  store.shown$ = false
  assert(isBigRuns === 3)
  assert(firstRuns === 3)
  assert(secondRuns === 2)

  store.number$ = 2
  assert(isBigRuns === 4)
  assert(firstRuns === 3)
  assert(secondRuns === 3)

  store.shown2$ = false
  assert(isBigRuns === 4)
  assert(firstRuns === 3)
  assert(secondRuns === 4)

  store.number$ = 10
  assert(isBigRuns === 4) // no runs for isBig
  assert(firstRuns === 3)
  assert(secondRuns === 4)

  store.shown$ = true
  assert(isBigRuns === 5)
  assert(firstRuns === 4)
  assert(secondRuns === 4)

  store.number$ = 6
  assert(isBigRuns === 6)
  assert(firstRuns === 4)
  assert(secondRuns === 4)

  store.number$ = 3
  assert(isBigRuns === 7)
  assert(firstRuns === 5)
  assert(secondRuns === 4)
})

test('computed several times', () => {
  const store = dynamic({
    shown: true,
    number: 5
  })

  let isLargeRuns = 0
  const isLarge = () => {
    isLargeRuns += 1
    return store.number$ > 10
  }

  let isShownRuns = 0
  const isShown = () => {
    isShownRuns += 1
    return store.shown$ === true
  }

  let runs = 0
  const app = render({
    inner () {
      runs += 1

      if (computed(isShown)) {
        const first = computed(isLarge) ? 'l' : 's'
        const second = computed(isLarge) ? 'a' : 'm'
        return first + second
      }

      return 'none'
    }
  })

  assert(runs === 1)
  assert(isLargeRuns === 1)
  assert(isShownRuns === 1)
  assert(app.innerText === 'sm')

  store.number$ = 12
  assert(runs === 2)
  assert(isLargeRuns === 2)
  assert(isShownRuns === 1)
  assert(app.innerText === 'la')

  store.shown$ = false
  assert(runs === 3)
  assert(isLargeRuns === 2)
  assert(isShownRuns === 2)
  assert(app.innerText === 'none')

  store.number$ = 2
  assert(runs === 3)
  assert(isLargeRuns === 2)
  assert(isShownRuns === 2)
})

test('suspend', () => {
  const store = dynamic({
    show: false,
    title: 'a'
  })

  let titleRuns = 0
  let tooltip
  const comp = autorun(() => {
    tooltip = render({
      class: 'tooltip',
      inner () {
        titleRuns += 1
        return store.title$
      }
    })
  })

  const app = render({
    inner: tooltip
  })

  assert(titleRuns === 1)

  app.innerHTML = ''
  store.title$ = 'b'
  assert(titleRuns === 2)

  document.body.appendChild(tooltip)
  tooltip.remove()
  store.title$ = 'c'
  assert(titleRuns === 3)

  suspend(tooltip)
  comp.stop()
  store.title$ = 'd'
  assert(titleRuns === 3)
})

test('suspend 2', () => {
  const store = dynamic({
    visible: true,
    text: 'ok',
    text2: 's'
  })

  let runs = 0
  let runs2 = 0
  const $app = render({
    inner () {
      if (store.visible$) {
        return [
          {
            inner () {
              runs += 1
              return store.text$
            }
          },
          () => {
            runs2 += 1
            return store.text2$
          }
        ]
      }
    }
  })

  assert(runs === 1)
  document.body.appendChild($app)
  store.text$ = 'oks'
  assert(runs === 2)
  document.body.removeChild($app)
  store.text$ = 'oksi'
  assert(runs === 3)
  suspend($app)
  store.text$ = 'oksis'
  assert(runs === 3)
  store.text2$ = 'iks'
  assert(runs === 3)
})

testa('complex', () => {
  const store = dynamic({
    show: true,
    items: ['a', 'b', 'c'],
    numbers: [
      { v: 1 }
    ]
  })

  // const strings = store.numbers.map$(number => {
  //   return `${number.v}:`
  // })

  // const uppered = store.items.map$(item => {
  //   return item.toUpperCase()
  // })

  let numbersRun = 0
  const app = render({
    class: 'app',
    inner: [
      // {
      //   class: 'strings',
      //   inner: strings.map$(string => {
      //     return string
      //   })
      // },

      // () => {
      //   if (store.show$) {
      //     return uppered.map$(item => {
      //       return `${item}-`
      //     })
      //   }

      //   return {
      //     tag: 'i',
      //     inner: 'nothing'
      //   }
      // },

      {
        inner: store.items.map$(char => {
          return store.numbers.map$(number => {
            numbersRun += 1
            return number.v
          })
        })
      }

      // Stream([ Stream, Stream, [startNode, [1,2,3], endNode] ])
      // при splice => оставить onSplice
      // Если делается splice, то у элемента нужно все onSplice удалять так же как удаляется autorun
      // возможно вынести эту логику прямо в autorun

      // {
      //   inner () {
      //     console.log('rerun');
      //     return store.items.map$(char => {
      //       return () => {
      //         if (!store.show$) {
      //           return 'none'
      //         }

      //         return [
      //           char,
      //           store.numbers.map$(number => {
      //             numbersRun += 1
      //             return number.v
      //           })
      //         ]
      //       }
      //     })
      //   }
      // }
    ]
  })
  window.store = store

  assert(numbersRun === 3)

  store.items.pop$()
  assert(numbersRun === 3)

  store.numbers.pop$()
  assert(numbersRun === 2)



  // assert(app.querySelector('.strings').innerHTML === '1:')

  // store.numbers.push$({ v: 7 })
  // assert(app.querySelector('.strings').innerHTML === '1:7:')
  // assert(app.querySelectorAll('.a').length === 6)

  // store.items.push$('g')
  // assert(app.querySelector('.a').innerHTML === 'A-B-C-G-')
  // assert(app.innerText.startsWith('1:7:A-B-C-G-'))

  // store.items.splice$(1, 1, 'fa')
  // store.numbers.shift$()
  // assert(app.querySelector('.strings').innerHTML === '7:')
  // assert(app.innerText.startsWith('7:A-FA-C-G-'))
  // assert(app.querySelectorAll('.a').length === 4)

  // store.items.unshift$('b')
  // assert(app.querySelectorAll('.a').length === 5)
  // assert(app.innerText.startsWith('7:B-A-FA-C-G-'))

  document.body.appendChild(app)
  // app.querySelector()
})

test('multiple reactive usages of same variable', () => {
  const store = dynamic({
    title: 'a'
  })

  let innerRuns = 0
  const app = render({
    inner () {
      innerRuns += 1
      return store.title$ + store.title$
    }
  })

  assert(innerRuns === 1)
  store.title$ = 'b'
  assert(innerRuns === 2)
})

test('change of splices array', () => {
  const store = dynamic({
    posts: [
      {title: 'a'},
      {title: 'b'}
    ]
  })

  let innerRuns = 0
  const app = render({
    inner () {
      innerRuns += 1
      if (!store.posts$) {
        return 'none'
      }

      return store.posts$.filter(p => p.title$ === 'a').map(p => {
        return p.title$
      })
    }
  })

  assert(app.innerText === 'a')
  assert(innerRuns === 1)

  store.posts.push$({title: 'a'})
  assert(app.innerText === 'aa')
  assert(innerRuns === 2)
})

test('several map$', () => {
  const store = Epos.dynamic({
    letters: ['a', 'b', 'c']
  })

  const app = Epos.render({
    inner: store.letters
      .map$(l => l.toUpperCase())
      .map$(l => l + '-')
  })

  assert(app.innerHTML = 'A-B-C-')
})

test('render svg', () => {
  const store = Epos.dynamic({
    enabled: true,
    visible: false,
    r: 50
  })

  const app = Epos.render({
    inner () {
      if (!store.enabled$) {
        return null
      }

      return [
        {
          tag: 'svg',
          inner: [
            {
              tag: 'circle',
              r () {
                return store.r$
              },
              cx: 50,
              cy: 50
            },
            () => {
              if (store.visible$) {
                return {
                  tag: 'rect',
                  x: 100,
                  y: 100,
                  width: 100,
                  height: 100
                }
              }

              return null
            }
          ]
        },
        {
          tag: 'h2',
          inner: 'ok'
        }
      ]
    }
  })

  const svg = 'http://www.w3.org/2000/svg'
  assert(app.querySelector('svg').namespaceURI === svg)
  assert(app.querySelector('circle').namespaceURI === svg)

  store.r$ = 10
  assert(app.querySelector('circle').getAttribute('r') === '10')

  store.visible$ = true
  assert(app.querySelector('rect').namespaceURI === svg)

  store.enabled$ = false
  store.enabled$ = true
  assert(app.querySelector('svg').namespaceURI === svg)
  assert(app.querySelector('circle').namespaceURI === svg)
  assert(app.querySelector('rect').namespaceURI === svg)
  assert(app.querySelector('h2').namespaceURI === 'http://www.w3.org/1999/xhtml')
})

test('throw when dynamic get not inside formula', () => {
  const store = dynamic({
    title: 'haha'
  })

  try {
    const app = render({
      inner: [
        {
          inner: store.title$
        }
      ]
    })
  } catch (err) {
    assert(err.message.startsWith('Referencing a dynamic field "title"'))
  }
})

test('don\'t throw when computed not inside formula', () => {
  const store = dynamic({
    number: 10
  })

  function isLarge () {
    return store.number$ > 5
  }

  const app = render({
    inner: computed(isLarge) ? 'visible' : 'hidden'
  })
})

test('dynamic index', () => {
  // TODO: implement
})

function testa (what, fn) {
  // fn()
}

function test (what, fn) {
  try {
    fn()
    log(what, true)
  } catch (err) {
    log(what, false)
    console.error(err)
  }
}

function assert (condition) {
  if (!condition) {
    throw new Error()
  }
}

function log (what, isSuccess) {
  testStore.tests.push$({
    what,
    isSuccess
  })
}
