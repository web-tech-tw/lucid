const {defineConfig} = require('@vue/cli-service')

module.exports = defineConfig({
    pages: {
        index: {
            title: 'lucid.inte',
            entry: 'src/main.js',
            template: 'public/index.html',
            filename: 'index.html',
        }
    },
    publicPath: process.env.NODE_ENV === 'production' ? '/lucid.inte/' : '/',
    transpileDependencies: true
})
