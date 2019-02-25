var store = dynamic({
  rows: Array.from(Array(50)).map(i => {
    return {
      title: generateRandomId()
    }
  })
})

var view = {
  class: 'table',
  inner: store.rows.map(row => ({
    class: 'row',
    inner () {
      return row.title$
    }
  }))
}

var children
var ops = 0
var startTime

document.addEventListener('DOMContentLoaded', () => {
  var app = render(view)
  document.body.appendChild(app)
  children = document.querySelector('.table').children
})

function start () {
  startTime = Date.now()
  frame()

  // let ops = 0
  // const start = Date.now()
  // while (ops < 500) {
  //   const i = randomInt(49)
  //   store.rows[i].title$ = generateRandomId()
  //   ops += 1
  // }
  // console.log(Date.now() - start);

}

function frame () {
  Array.from(new Array(3000)).forEach(() => {
    var i = randomInt(49)
    store.rows[i].title$ = generateRandomId()
    // children[i].innerText = generateRandomId()
  })
  ops += 1

  if (Date.now() - startTime < 1000) {
    requestAnimationFrame(frame)
    // frame()
  } else {
    console.log(ops)
  }
}

function generateRandomId () {
  return String(randomInt(10000))
}

function randomInt (n) {
  return Math.round(Math.random() * n)
}
