'use strict'

// Packages dependencies
const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')

// Exports
module.exports = function (UsersApiPackage, app, config, db, auth) {

  // Create new media
  router.post('/:pageId/medias', (req, res, next) => {
    const Page = db.models.Page
    const Media = db.models.Media

    const lang = req.query.lang || 'en'

    Page.
      findOne({
        where: { id: req.params.pageId }
      })
      .then(page => {
        if (!page) {
          const notFound = new Error('Page not found')
          notFound.code = 'NOT_FOUND'
          throw notFound
        }
        return Media
          .create(req.body)
          .then((media) => {
            page.addMedia(media)
            return page.save().then(() => media)
          })
      })
      .then(media => {
        res.json(media.toJSON(lang))
      })
      .catch(next)
  })

  // Edit page by id
  router.put('/:pageId', (req, res, next) => {
    const Page = db.models.Page

    const lang = req.query.lang || 'en'

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
