const root = document.createElement('div')
root.id = 'app';
document.querySelector('body').appendChild(root)

root.innerHTML = `
<div class="main">
  <button v-on:click="start">start</button>
  <div>
    <input v-model="query"/>
  </div>
  <div class="iks">
    {{iks()}}
  </div>
  <div class="posts">
    <div v-for="post in posts" v-if="visible(post)" class="post">{{post.title}}</div>
  </div>
</div>
`

// <div class="posts-2" style="display: flex">
//   <div v-for="post in posts">{{post.title}}{{query}}-</div>
// </div>

// <div class="posts">
//   <div v-for="post in posts" class="post" v-bind:class="{hidden: isHidden(post)}">{{post.title}}</div>
// </div>


var app = new Vue({
  el: '#app',
  methods: {
    onInput (e) {
      app.query = e.target.value
    },
    iks () {
      return [].concat(this.posts, this.posts, this.posts, this.posts, this.posts, this.posts).filter(p => {
        return p.title.includes('ik')
      }).length
    },
    isHidden (post) {
      const query = this.query.toLowerCase()
      const words = post.title.toLowerCase().split(' ')
      return !words.some(w => w.startsWith(query))
    },
    visible (post) {
      const query = this.query.toLowerCase()
      const words = post.title.toLowerCase().split(' ')
      return words.some(w => w.startsWith(query))
    },
    start () {
      start()
    }
  },
  data: {
    query: '',
    posts: window.posts.map(p => {
      return {
        title: p.title
      }
    })
  }
})

function start () {
  console.time('a')
  // app.query = 'a'
  // app.query = 'b'
  // app.query = 'ab'
  app.query = 'ы'
  requestAnimationFrame(() => {
    console.timeEnd('a')
  })
}
