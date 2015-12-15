'use strict'

// Packages dependencies
const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const request = require('request')

// Exports
module.exports = function (UsersApiPackage, app, config, db, auth) {

  // Get pages
  router.get('/', (req, res, next) => {
    const Page = db.models.Page

    Page
    .findAllWithGreaterVersion(req.query.lang)
    .then(pages => res.json(pages))
    .catch(next)
  })

  // Get page by id
  router.get('/:pageId', (req, res, next) => {
    const Page = db.models.Page
    const Media = db.models.Media
    const File = db.models.File

    const lang = req.query.lang || 'en'

    Page
      .findGreaterVersionById(req.params.pageId)
      .then(greaterVersion => Page.findByIdAndVersion(req.params.pageId, greaterVersion))
      .then(page => res.json(page.toJSON(lang)))
      .catch(next)
  })

  // Create new page
  router.post('/', (req, res, next) => {
    const Page = db.models.Page
    const lang = req.query.lang || 'en'
    const proto = {}
    proto[lang] = req.body.name

    const params = Object.assign({}, req.body, {
      name: JSON.stringify(proto)
    })

    Page
      .create(params)
      .then(page => res.json(page.toJSON(lang)))
      .catch(next)
  })

  // Duplicate new page and bump version
  router.get('/:pageId/bump-version', (req, res, next) => {
    const Page = db.models.Page
    const Media = db.models.Media
    const File = db.models.File

    const lang = req.query.lang || 'en'

    Page
      .findGreaterVersionById(req.params.pageId)
      .then(greaterVersion => Page.findByIdAndVersion(req.params.pageId, greaterVersion))
      .then(page => Page.duplicateAndBumpVersion(page))
      .then(newVersion => Page.findByIdAndVersion(req.params.pageId, newVersion))
      .then(page => res.json(page.toJSON(lang)))
      .catch(next)
  })

  // Edit page by id
  router.put('/:pageId', (req, res, next) => {
    const Page = db.models.Page
    const lang = req.query.lang || 'en'
    const params = Object.assign({}, req.body)

    Page
      .findGreaterVersionById(req.params.pageId)
      .then(greaterVersion => Page.updateByIdAndVersion(req.params.pageId, greaterVersion, params, lang))
      .then(page => res.json(page.toJSON(lang)))
      .catch(next)
  })

  // Delete page by id
  router.delete('/:pageId', (req, res, next) => {
    const Page = db.models.Page

    Page
      .findGreaterVersionById(req.params.pageId)
      .then(greaterVersion => Page.deleteByIdAndVersion(req.params.pageId, greaterVersion))
      .then(page => res.json(page.toJSON()))
      .catch(next)
  })

  return router
}
