// Packages dependencies
const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const request = require('request')
const shortid = require('shortid')
const slug = require('slug')

// Helpers
function mergeResponses (responses) {
  const merged = responses.reduce((prev, next) => {
    return prev.concat(JSON.parse(next))
  }, [])
  const mergedSingle = []
  const matches = {}

  merged.forEach((el, index) => {
    matches[el.id] = matches[el.id] ? matches[el.id] + 1 : 1
    if (matches[el.id] > 1) return
    mergedSingle.push(el)
  })

  return mergedSingle
}

function reverseResponses (responses) {
  const reversed = {}
  responses.forEach(r => {
    reversed[r.id] = r
  })
  return reversed
}

function reversePages (pagesArray) {
  const pages = {}
  pagesArray.forEach(page => {
    const medias = {}
    page.medias.forEach(media => {
      medias[media.reference] = media
    })
    page.medias = medias
    pages[page.slug] = page
  })
  return pages
}

function reversePage (page) {
  const medias = {}
  page.medias.forEach(media => {
    medias[media.reference] = media
  })
  page.medias = medias
  return page
}

// Exports
module.exports = function (UsersApiPackage, app, config, db, auth, settings) {
  // Get pages
  router.get('/', (req, res, next) => {
    const Page = db.models.Page
    const lang = req.query.lang || 'en'

    Page
    .findAllWithGreaterVersion(req.query.lang, req.query.category)
    .then(pages => res.json(pages))
    .catch(err => {
      console.error(err.stack)
      next(err)
    })
  })

  router.get('/frontend', (req, res, next) => {
    const Page = db.models.Page

    Page
    .findAllWithGreaterPublishedVersion(req.query.lang, req.query.category)
    .then(pages => res.json(reversePages(pages)))
    .catch(err => {
      console.error(err.stack)
      next(err)
    })
  })

  // Get page by slug
  router.get('/frontend/:pageSlug', (req, res, next) => {
    const Page = db.models.Page
    const Media = db.models.Media
    const File = db.models.File

    const lang = req.query.lang || 'en'

    const version = req.query.version

    Page
      .findGreaterVersionBySlug(req.params.pageSlug)
      .then(greaterVersion => Page.findBySlugAndVersion(req.params.pageSlug, version || greaterVersion))
      .then(page => res.json(reversePage(page.toJSON(lang))))
      .catch(err => {
        console.error(err.stack)
        next(err)
      })
  })

  // Get page by slug
  router.get('/:pageSlug', (req, res, next) => {
    const Page = db.models.Page
    const Media = db.models.Media
    const File = db.models.File

    const lang = req.query.lang || 'en'

    Page
      .findGreaterVersionBySlug(req.params.pageSlug)
      .then(greaterVersion => Page.findBySlugAndVersion(req.params.pageSlug, greaterVersion))
      .then(page => res.json(page.toJSON(lang)))
      .catch(err => {
        console.error(err.stack)
        next(err)
      })
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

    params.sid = shortid.generate()
    params.slug = slug(req.body.name).toLowerCase()

    Page
      .findAll({ where: { slug: params.slug } })
      .then(fPages => {
        if (fPages !== null && fPages.length > 0) params.slug = `${params.slug}-${fPages.length + 1}`
        return Page
          .createPage(params)
          .then(page => res.json(page.toJSON(lang)))
      })
      .catch(next)
  })


  // Duplicate new page and bump version
  router.post('/:pageId/bump-version', (req, res, next) => {
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
