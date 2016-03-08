'use strict'

const cleverCore = require('clever-core')
const Package = cleverCore.Package
const shortid = require('shortid')

// Defining the Package
var PagesApiPackage = new Package('pages-api')

// All CLEVER packages require registration
PagesApiPackage
  .attach({
    where: '/pages-api'
  })
  .routes(['app', 'config', 'database', 'auth', 'settings'])
  .models()
  .register()

// lazy registration
cleverCore.register('settings', (config) => {
  return {
    articles: {
      dchVersion: shortid.generate()
    }
  }
})
