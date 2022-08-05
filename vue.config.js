const {defineConfig} = require('@vue/cli-service')

module.exports = defineConfig({
    pages: {
        index: {
            title: 'template.inte',
            entry: 'src/main.js',
            template: 'public/index.html',
            filename: 'index.html',
        }
    },
    publicPath: process.env.NODE_ENV === 'production' ? '/template.inte/' : '/',
    transpileDependencies: true
})
