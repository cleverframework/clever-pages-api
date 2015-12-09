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
    const File = db.models.File

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
  router.put('/:pageId/medias/:mediaId', (req, res, next) => {
    const Media = db.models.Media

    const lang = req.query.lang || 'en'

    db.transaction(t => {
      return Media
        .findOne({
          where: {
            id: req.params.mediaId
          }
        }, {transaction: t})
        .then(media => {
          const params = Object.assign({}, req.body)
          if (params.name) {
            media.setName(params.name, lang)
            params.name = media.name
          }
          if (params.content) {
            media.setContent(params.content, lang)
            params.content = media.content
          }
          return params
        })
        .then(params => {
          return Media
            .update(params, {
              where: {
                id: req.params.mediaId
              }
            }, {transaction: t})

        })
        .then(result => {
          return Media
            .findOne({
              where: {
                id: req.params.mediaId
              }
            }, {transaction: t})
        })
    })
    .then(media => {
      res.json(media.toJSON(lang))
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
