var store = {
  rows: Array.from(Array(50)).map(i => {
    return {
      title: generateRandomId()
    }
  })
}

var view = `
  <div class="table">
    ${store.rows.map(row => `
      <div class="row">${row.title}</div>
    `).join('')}
  </div>
`

var children
var ops = 0
var startTime

document.addEventListener('DOMContentLoaded', () => {
  document.body.innerHTML = view
  children = document.querySelector('.table').children
})

function start () {
  startTime = Date.now()
  frame()

  // let ops = 0
  // const start = Date.now()
  // while (ops < 1000000) {
  //   const i = randomInt(49)
  //   children[i].innerText = generateRandomId()
  //   ops += 1
  // }
  // console.log(Date.now() - start);
}

const empty = document.createTextNode('')

function frame () {
  Array.from(new Array(3000)).forEach(() => {
    var i = randomInt(49)
    children[i].innerText = generateRandomId()
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
