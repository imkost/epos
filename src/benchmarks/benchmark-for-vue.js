var app = new Vue({
  el: '#app',
  data: {
    rows: Array.from(Array(50)).map(i => {
      return {
        title: generateRandomId()
      }
    })
  }
})

var children
var ops = 0
var startTime

document.addEventListener('DOMContentLoaded', () => {
  children = document.querySelector('.table').children
})

function start () {
  startTime = Date.now()
  frame()

  // let ops = 0
  // const start = Date.now()
  // while (ops < 500) {
  //   const i = randomInt(49)
  //   app.rows[i].title = generateRandomId()
  //   ops += 1
  // }
  // console.log(Date.now() - start);
}

const empty = document.createTextNode('')

function frame () {
  Array.from(new Array(3000)).forEach(() => {
    var i = randomInt(49)
    app.rows[i].title = generateRandomId()
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
