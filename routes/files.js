'use strict'

// Packages dependencies
const fs = require('fs')
const path = require('path')
const express = require('express')
const router = express.Router()
const Busboy = require('busboy')
const shortid = require('shortid')
const getFileExt = require('../util').getFileExt
const pkgcloud = require('pkgcloud')

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

      function onWritableStreamDone () {
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
      }

      if (config.env === 'development') {
        // Store on the local file system
        const saveTo = path.join(__dirname, '../../../../storage/files', newFilename)
        const writableStream = fs.createWriteStream(saveTo)

        writableStream.on('finish', onWritableStreamDone)

        file.pipe(writableStream)
      } else {
        // Store on AWS S3 / Rackspace Cloud Files
        // console.log(config.storage[process.env.STORAGE_PROVIDER])
        const storage = pkgcloud.storage.createClient(config.storage[process.env.STORAGE_PROVIDER])

        // console.log(`${config.app.name}-${config.env}`)

        const writableStream = storage.upload({
          container: `${config.app.name}-${config.env}`,
          remote: newFilename,
          headers: {
            'Access-Control-Allow-Origin': '*'
          }
        })

        writableStream.on('error', err => {
          console.error(err)
          next(err)
        })

        writableStream.on('success', onWritableStreamDone)

        file.pipe(writableStream)
      }


      onFile = true
    })

    busboy.on('finish', function() {
      if (!onFile) res.status(400).send('File missing.')
    })

    req.pipe(busboy)
  })

  return router
}
