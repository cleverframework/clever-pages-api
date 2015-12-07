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
  router.get('/:pageId', (req, res, next) => {
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
      .create(req.body)
      .then(page => {
        res.json(page.toJSON())
      })
      .catch(next)
  })

  // Edit page by id
  router.put('/:pageId', (req, res, next) => {
    const Page = db.models.Page

    console.log(db)

    db.transaction(t => {
      return Page
        .update(req.body, {
          where: {
            id: req.params.pageId
          }
        }, {transaction: t})
        .then(result => {
          return Page
            .findOne({
              where: {
                id: req.params.pageId
              }
            }, {transaction: t})
        })
    })
    .then(page => {
      res.json(page.toJSON())
    })
    .catch(next)
  })

  // Delete page by id
  router.delete('/:pageId', (req, res, next) => {
    const Page = db.models.Page

    Page
      .findOne({
        where: {
          id: req.params.pageId
        }
      })
      .then(page => {
        return Page
          .destroy({
            where: {
              id: req.params.pageId
            }
          })
          .then(() => page)
      })
      .then(page => {
        res.json(page.toJSON())
      })
      .catch(next)
  })

  return router
}
