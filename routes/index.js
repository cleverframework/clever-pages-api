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
    const File = db.models.File

    const lang = req.query.lang || 'en'

    Page
      .findOne({
        where: {
          id: req.params.pageId
        },
        include: [
          {
            model: Media,
            as: 'medias',
            include: [
              { model: File, as: 'imageFile' },
              { model: File, as: 'imageFiles' },
              { model: File, as: 'buttonFile' }
            ],
            order: [
              [ { model: File, as: 'imageFiles' }, 'order', 'ASC' ]
            ]
          }
        ],
        order: [
          [ { model: Media, as: 'medias' }, 'id', 'ASC' ],
        ]
      })
      .then(page => {
        if (!page) {
          const notFound = new Error('Page not found')
          notFound.code = 'NOT_FOUND'
          throw notFound
        }
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

    return Page
      .findOne({
        where: {
          id: req.params.pageId
        }
      })
      .then(page => {
        if (!page) {
          const notFound = new Error('Page not found')
          notFound.code = 'NOT_FOUND'
          throw notFound
        }

        const params = Object.assign({}, req.body)

        if (params.name) {
          page.setName(params.name, lang)
          delete params.name
        }

        if (params.description) {
          page.setDescription(params.description, lang)
          delete params.description
        }

        Object.keys(req.body).forEach(key => {
          if (key === 'id') return
          page[key] = params[key]
        })

        return page.save().then(() => page)
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
        if (!page) {
          const notFound = new Error('Page not found')
          notFound.code = 'NOT_FOUND'
          throw notFound
        }
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
