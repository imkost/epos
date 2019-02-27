function App () {
  return {
    class: 'app',
    inner: [
      {
        tag: 'button',
        onClick (){
          console.log('app button click');
        },
        inner: 'button'
      }
    ]
  }
}

const root = document.getElementById('root')
const app = Epos.render(App())
root.innerHTML = app.outerHTML

hydrate(document.querySelector('.app'), App())
