'use strict'

// Packages dependencies
const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')

// Exports
module.exports = function (UsersApiPackage, app, config, db, auth) {

  // Get pages
  router.get('/', (req, res, next) => {
    const Page = db.models.Page

    Page
      .findAll()
      .then(pages => {
        res.json(pages.map(page => {
          return page.toJSON()
        }))
      })
      .catch(next)
  })

  // Get page by id
  router.get('/{pageId}', (req, res, next) => {
    const Page = db.models.Page

    Page
      .findOne({
        where: {
          id: req.params.pageId
        }
      })
      .then(page => {
        res.json(page.toJSON())
      })
      .catch(next)
  })

  // Create new page
  router.post('/', (req, res, next) => {
    const Page = db.models.Page

    Page
      .findAll()
      .then(pages => {
        res.json(pages.map(page => {
          return page.toJSON()
        }))
      })
      .catch(next)
  })

  // Edit page by id
  router.put('/{pageId}', (req, res, next) => {
    const Page = db.models.Page

    Page
      .findOne({
        where: {
          id: req.params.pageId
        }
      })
      .then(page => {
        Object.keys(req.params.body, key => {
          if (key === 'id') return
          page[key] = req.params.body
        })
        return page
          .save()
          .then(() => {
            return page
          })
      })
      .then(page => {
        res.json(page.toJSON())
      })
      .catch(next)
  })

  return router
}
