var store = {
  query: '',
  posts: window.posts.map(p => {
    return {
      title: p.title
    }
  })
}

function v_onInput (input) {
  const query = input.value.toLowerCase()

  store.posts.forEach((post, i) => {
    const words = post.title.toLowerCase().split(' ')
    const isHidden = !words.some(w => w.startsWith(query))
    postsElem.children[i].classList.toggle('hidden', isHidden)
  })
}

const root = document.createElement('div')
root.innerHTML = `
<div class="main">
  <button onclick="start()">
    start
  </button>
  <div>
    <input oninput="v_onInput(this)"/>
  </div>
  <div class="posts">
    ${store.posts.map(post => `
      <div class="post">${post.title}</div>
    `).join('')}
  </div>
</div>
`

// <div class="posts">
//   ${store.posts.map(post => `
//     <div class="post">${post.title}</div>
//   `).join('')}
// </div>

root.id = 'app';
document.querySelector('body').appendChild(root)

var postsElem = document.querySelector('.posts')

function start () {
  const input = document.querySelector('input')

  // store.query = 'a'
  // v_onInput(input)
  // store.query = 'b'
  // v_onInput(input)
  // store.query = 'ab'
  // v_onInput(input)
  console.time('a')
  input.value = 'ы'
  v_onInput(input)

  requestAnimationFrame(() => {
    console.timeEnd('a')
  })
}

