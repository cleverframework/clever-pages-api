'use strict'

const cleverCore = require('clever-core')
const Package = cleverCore.Package

// Defining the Package
var PagesApiPackage = new Package('pages-api')

// All CLEVER packages require registration
PagesApiPackage
  .attach({
    where: '/pages-api'
  })
  .routes(['app', 'config', 'database', 'auth'])
  .models()
  .register()
