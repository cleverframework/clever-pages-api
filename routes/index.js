'use strict'

// Packages dependencies
const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')

// Exports
module.exports = function (UsersApiPackage, app, config, db, auth) {

  // Get pages
  router.get('/', (req, res, next) => {
    const lang = req.query.lang || 'en'

    const Page = db.models.Page

    Page
      .findAll()
      .then(pages => {
        res.json(pages.map(page => {
          return page.toJSON(lang)
        }))
      })
      .catch(next)
  })

  // Get page by id
  router.get('/:pageId', (req, res, next) => {
    const Page = db.models.Page
    const Media = db.models.Media

    const lang = req.query.lang || 'en'

    Page
      .findOne({
        where: {
          id: req.params.pageId
        },
        include: [
          { model: Media, as: 'medias' }
        ]
      })
      .then(page => {
        res.json(page.toJSON(lang))
      })
      .catch(next)
  })

  // Create new page
  router.post('/', (req, res, next) => {
    const Page = db.models.Page

    const lang = req.query.lang || 'en'

    const params = Object.assign({}, req.body, {
      name: JSON.stringify({en: req.body.name})
    })

    Page
      .create(params)
      .then(page => {
        res.json(page.toJSON(lang))
      })
      .catch(next)
  })

  // Edit page by id
  router.put('/:pageId', (req, res, next) => {
    const Page = db.models.Page

    const lang = req.query.lang || 'en'
    console.log(lang)


    db.transaction(t => {
      return Page
        .findOne({
          where: {
            id: req.params.pageId
          }
        }, {transaction: t})
        .then(page => {
          const params = Object.assign({}, req.body)
          if (params.name) {
            page.setName(params.name, lang)
            params.name = page.name
          }
          if (params.description) {
            page.setDescription(params.description, lang)
            params.description = page.description
          }
          return params
        })
        .then(params => {
          return Page
            .update(params, {
              where: {
                id: req.params.pageId
              }
            }, {transaction: t})

        })
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
      res.json(page.toJSON(lang))
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
