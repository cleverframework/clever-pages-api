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

        // Media.update({
        //   File: [ uploadedFile ]
        // }, {
        //   where: {
        //     id: req.params.mediaId
        //   },
        //   include: [ { model: File, as: 'imageFiles' } ]
        // })
        // .then(file => {
        //   res.json(uploadedFile)
        // })
        // .catch(next)

        db.transaction(t => {
          return Media
            .findOne({
              where: { id: req.params.mediaId }
            }, {transaction: t})
            .then(media => {
              if (!media) {
                const notFound = new Error('Page not found')
                notFound.code = 'NOT_FOUND'
                throw notFound
              }

              return File
                .create(uploadedFile, {transaction: t})
                .then(file => {
                  let promise = null

                  switch (media.type) {
                    case 'image':
                      promise = media.setImageFile(file)
                      break
                    case 'button':
                      promise = media.setButtonFile(file)
                      break
                    default:
                      promise = Promise.resolve()
                  }

                  return promise.then(() => {
                    return file.setMedia(media).then(() => file)
                  })
                })
            })
        })
        .then(file => {
          res.json(file.toJSON(lang))
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
