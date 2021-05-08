import typescript from 'rollup-plugin-typescript2'
import license from 'rollup-plugin-license'

import pkg from './package.json'

export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.es2015,
      format: 'es'
    }
  ],
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.optionalDependencies || {})
  ],

plugins: [
    typescript({
      tsconfig: "tsconfig.2015.json",
        typescript: require('typescript')
      }),
      license({
        banner: "https://github.com/0x1000000/ngSetState License: MIT"
      })
  ]
}