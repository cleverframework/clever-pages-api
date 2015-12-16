'use strict'

// Packages dependencies
const fs = require('fs')
const path = require('path')
const express = require('express')
const router = express.Router()
const Busboy = require('busboy')
const shortid = require('shortid')
const getFileExt = require('../util').getFileExt

// Exports
module.exports = function (UsersApiPackage, app, config, db, auth) {

  // Sort files
  router.put('/:pageId/medias/:mediaId/files/sort', (req, res, next) => {
    const Media = db.models.Media
    const File = db.models.File
    const lang = req.query.lang || 'en'
    const sortedIds = req.body.sortedIds

    File.sortByIds(sortedIds, lang)
      .then(() => Media.findById(req.params.mediaId))
      .then(media => res.json(media.toJSON(lang)))
      .catch(next)
  })

  // Update a file
  router.put('/:pageId/medias/:mediaId/files/:fileId', (req, res, next) => {
    const Media = db.models.Media
    const File = db.models.File

    const lang = req.query.lang || 'en'
    const params = Object.assign({}, req.body)

    File.updateById(req.params.fileId, params, lang)
      .then(() => Media.findById(req.params.mediaId))
      .then(media => res.json(media.toJSON(lang)))
      .catch(next)
  })

  // Delete a file
  router.delete('/:pageId/medias/:mediaId/files/:fileId', (req, res, next) => {
    const Media = db.models.Media
    const File = db.models.File
    const lang = req.query.lang || 'en'

    File.deleteById(req.params.fileId)
      .then(() => Media.findById(req.params.mediaId))
      .then(media => res.json(media.toJSON(lang)))
      .catch(next)
  })

  // Upload a file
  router.post('/:pageId/medias/:mediaId/files', (req, res, next) => {
    const Media = db.models.Media

    const lang = req.query.lang || 'en'

    const busboy = new Busboy({ headers: req.headers })

    let onFile = false

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      const id = shortid.generate().toLowerCase()
      const newFilename = `${id}${getFileExt(mimetype)}`
      const saveTo = path.join(__dirname, '../../../../storage/files', newFilename)

      const writableStream = fs.createWriteStream(saveTo)

      file.pipe(writableStream)

      writableStream.on('finish', () => {
        const caption = {}
        caption[lang] = filename

        const uploadedFile = {}
        // uploadedFile.id = id
        uploadedFile.caption = JSON.stringify(caption)
        uploadedFile.filename = newFilename
        // uploadedFile.originalFilename = filename
        // uploadedFile.encoding = encoding
        uploadedFile.mimetype = mimetype

        Media
          .createAndAddFile(req.params.mediaId, uploadedFile)
          .then(() => Media.findById(req.params.mediaId))
          .then(media => res.json(media.toJSON(lang)))
          .catch(next)
      })

      onFile = true
    })

    busboy.on('finish', function() {
      if (!onFile) res.status(400).send('File missing.')
    })

    req.pipe(busboy)

  })

  return router
}
