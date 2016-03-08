'use strict'

// Packages dependencies
const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')

// Exports
module.exports = function (UsersApiPackage, app, config, db, auth) {

  // Sort media
  router.put('/:pageId/groups/:groupId/medias/sort', (req, res, next) => {
    const Group = db.models.Group
    const Media = db.models.Media
    const lang = req.query.lang || 'en'
    const sortedIds = req.body.sortedIds

    Media.sortByIds(sortedIds, lang)
      .then(() => Group.findById(req.params.groupId))
      .then(group => res.json(group.toJSON(lang)))
      .catch(next)
  })

  // Create new media
  router.post('/:pageId/medias', (req, res, next) => {
    const Media = db.models.Media
    const lang = req.query.lang || 'en'

    Media.createAndSetPage(req.params.pageId, req.body, lang)
      .then(media => res.json(media.toJSON(lang)))
      .catch(next)
  })

  // Edit page by id
  router.put('/:pageId/medias/:mediaId', (req, res, next) => {
    const Media = db.models.Media
    const lang = req.query.lang || 'en'
    const params = Object.assign({}, req.body)

    Media.updateById(req.params.mediaId, params, lang)
      .then(media => res.json(media.toJSON(lang)))
      .catch(next)
  })

  // Delete page by id
  router.delete('/:pageId/medias/:mediaId', (req, res, next) => {
    const Media = db.models.Media
    const lang = req.query.lang || 'en'

    Media.deleteById(req.params.mediaId)
      .then(media => res.json(media.toJSON(lang)))
      .catch(next)
  })

  return router
}
