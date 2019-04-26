const store = dynamic({
  ops: 0,
  items: Array.from(new Array(100)).map((_, i) => {
    return {
      value: i
    }
  })
})

const $app = render({
  class: 'app',
  inner: [
    {
      inner () {
        return store.ops$
      }
    },
    {
      tag: 'hr'
    },
    store.items.map$(item => {
      return {
        tag: 'p',
        inner () {
          return item.value$
        }
      }
    })
  ]
})

document.body.appendChild($app)

let startTime
let ops

requestIdleCallback(test)

function test () {
  ops = 0
  startTime = Date.now()
  requestAnimationFrame(frame)
}

function frame () {
  for (let i = 0; i < 3500; i++) {
    change()
  }
  ops += 1
  store.ops$ = ops

  if (Date.now() - startTime < 1000) {
    requestAnimationFrame(frame)
  } else {
    console.log(ops)
  }
}

function change () {
  const i = randInt(store.items.length - 1)
  store.items[i].value$ = randInt(1000)
}

function randInt (max) {
  return Math.round(max * Math.random())
}
