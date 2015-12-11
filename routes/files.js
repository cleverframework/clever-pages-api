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

  // Upload a file
  router.post('/:pageId/medias/:mediaId/files', (req, res, next) => {
    const Media = db.models.Media
    const File = db.models.File

    const lang = req.query.lang || 'en'

    const busboy = new Busboy({ headers: req.headers })

    let onFile = false

    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
      const id = shortid.generate().toLowerCase()
      const newFilename = `${id}${getFileExt(mimetype)}`
      const saveTo = path.join(__dirname, '../../../../storage/files', newFilename)

      const writableStream = fs.createWriteStream(saveTo)

      file.pipe(writableStream)

      writableStream.on('finish', () => {
        const uploadedFile = {}
        // uploadedFile.id = id
        uploadedFile.caption = {}
        uploadedFile.caption[lang] = filename
        uploadedFile.filename = newFilename
        // uploadedFile.originalFilename = filename
        // uploadedFile.encoding = encoding
        uploadedFile.mimetype = mimetype

        Media
          .findOne({
            where: { id: req.params.mediaId }
          })
          .then(media => {
            if (!media) {
              const notFound = new Error('Page not found')
              notFound.code = 'NOT_FOUND'
              throw notFound
            }

            return db.transaction(t => {
              return File
                .create(uploadedFile, {transaction: t})
                .then(file => {
                  let q = null
                  const now = (new Date()).toISOString()

                  switch (media.type) {
                    case 'image':
                      q = `UPDATE media SET image_file_id = ${file.id}, updated_at = '${now}' WHERE id = ${media.id}`
                      break
                    case 'button':
                      q = `UPDATE media SET button_file_id = ${file.id}, updated_at = '${now}' WHERE id = ${media.id}`
                      break
                    default:
                      q = `UPDATE file SET media_id = ${media.id}, updated_at = '${now}' WHERE id = ${file.id}`
                  }

                  return new Promise((yep, nope) => {
                    db
                      .query(q, {transaction: t})
                      .spread((results, metadata) => {
                        // TODO: What if nope?
                        yep(results)
                      })
                  })
                })
            })
          })
          .then((results) => {
            return Media
              .findOne({
                where: { id: req.params.mediaId },
                include: [
                  { model: File, as: 'imageFile' },
                  { model: File, as: 'imageFiles' },
                  { model: File, as: 'buttonFile' }
                ]
              })
          })
          .then(media => {
            res.json(media.toJSON(lang))
          })
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
