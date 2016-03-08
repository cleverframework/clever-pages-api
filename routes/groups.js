'use strict'

// Packages dependencies
const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')

// Exports
module.exports = function (UsersApiPackage, app, config, db, auth) {

  // Sort groups
  router.put('/:pageId/groups/sort', (req, res, next) => {
    const Page = db.models.Page
    const Group = db.models.Group
    const lang = req.query.lang || 'en'
    const sortedIds = req.body.sortedIds

    Group.sortByIds(sortedIds, lang)
      .then(() => Page.findGreaterVersionById(req.params.pageId))
      .then(greaterVersion => Page.findByIdAndVersion(req.params.pageId, greaterVersion))
      .then(page => res.json(page.toJSON(lang)))
      .catch(next)
  })

  // Create new group
  router.post('/:pageId/groups', (req, res, next) => {
    const Group = db.models.Group
    const lang = req.query.lang || 'en'

    Group.createAndSetGroup(req.params.pageId, req.body, lang)
      .then(group => res.json(group.toJSON(lang)))
      .catch(next)
  })

  // Edit group by id
  router.put('/:pageId/groups/:groupId', (req, res, next) => {
    const Group = db.models.Group
    const lang = req.query.lang || 'en'
    const params = Object.assign({}, req.body)

    Group.updateById(req.params.groupId, params, lang)
      .then(group => res.json(group.toJSON(lang)))
      .catch(next)
  })

  // Delete group by id
  router.delete('/:pageId/groups/:groupId', (req, res, next) => {
    const Group = db.models.Group
    const lang = req.query.lang || 'en'

    Group.deleteById(req.params.groupId)
      .then(group => res.json(group.toJSON(lang)))
      .catch(next)
  })

  return router
}
