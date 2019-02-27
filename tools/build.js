const Fs = require('fs')
const Babel = require('@babel/core')
const Terser = require('terser')

;(function main () {
  let es5 = Fs.readFileSync('src/epos.js', 'utf-8')

  es5 = Babel.transformSync(es5, {
    presets: [
      [require('@babel/preset-env'), {
        targets: {
          chrome: '58'
        }
      }]
    ]
  }).code

  es5 = `
    (() => {
      const d = document;
      const f = Array.from;
      const S = Symbol;
      const O = Object.defineProperties;
      const s = () => new Set()
      ${es5
        .split('document.').join('d.')
        .split('Array.from').join('f')
        .replace(/Symbol\('\w+'\)/g, 'S()')
        .split('Object.defineProperties').join('O')
        .split('new Set()').join('s()')
      }
    })()
  `
  es5 = Terser.minify(es5, {
    compress: {
      arrows: true,
      passes: 2,
      drop_console: true,
      unsafe_methods: true,
      unsafe_arrows: true,
      unsafe_proto: true
    }
  })
  es5 = es5.code
    .split(':function(').join('(')
  Fs.writeFileSync('src/epos.min.js', es5)

  const minified = Fs.readFileSync('src/epos.min.js', 'utf-8')
  console.log(minified.length);
})()


// ;(function main () {
//   build('browser', 'dist/epos.browser.js')
//   build('node', 'dist/epos.node.js')
// })()

// function getFiles (env) {
//   return [
//     'src/core.js',
//     env === 'browser' ? 'src/index.browser.js' : null,
//     env === 'node' ? 'src/index.node.js' : null
//   ].filter(Boolean)
// }

// function build (env, output) {
//   const files = getFiles(env)
//   const js = concat(files)
//   Fs.writeFileSync(`dist/epos.${env}.js`, js)

//   if (env === 'browser') {
//     const jsMin = minify(js)
//     Fs.writeFileSync(`dist/epos.${env}.min.js`, jsMin)
//   }
// }

// function concat (paths) {
//   return paths.map(p => Fs.readFileSync(p, 'utf-8')).join('\n')
// }
