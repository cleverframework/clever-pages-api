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
            return page
              .addMedia(media)
              .then(() => media)
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
    const File = db.models.File

    const lang = req.query.lang || 'en'

    return Media
      .findOne({
        where: {
          id: req.params.mediaId
        },
        include: [
          { model: File, as: 'imageFile' },
          { model: File, as: 'imageFiles' },
          { model: File, as: 'buttonFile' }
        ],
        order: [
          [ { model: File, as: 'imageFiles' }, 'order', 'ASC' ]
        ]
      })
      .then(media => {
        if (!media) {
          const notFound = new Error('Media not found')
          notFound.code = 'NOT_FOUND'
          throw notFound
        }

        const params = Object.assign({}, req.body)

        if (params.name) {
          media.setName(params.name, lang)
          delete params.name
        }

        if (params.content) {
          media.setContent(params.content, lang)
          delete params.content
        }

        if (params.caption) {
          media.setCaption(params.caption, lang)
          delete params.caption
        }

        Object.keys(params).forEach(key => {
          if (key === 'id') return
          media[key] = params[key]
        })

        return media.save().then(() => media)
      })
      .then(media => {
        res.json(media.toJSON(lang))
      })
      .catch(next)
  })

  // Delete page by id
  router.delete('/:pageId/medias/:mediaId', (req, res, next) => {
    const Media = db.models.Media

    const lang = req.query.lang || 'en'

    Media
      .findOne({
        where: {
          id: req.params.mediaId
        }
      })
      .then(media => {
        if (!media) {
          const notFound = new Error('Media not found')
          notFound.code = 'NOT_FOUND'
          throw notFound
        }

        return Media
          .destroy({
            where: {
              id: req.params.mediaId
            }
          })
          .then(() => media)
      })
      .then(media => {
        res.json(media.toJSON(lang))
      })
      .catch(next)
  })

  return router
}
