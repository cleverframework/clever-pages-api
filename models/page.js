'use strict'

const f = require('float')
const shortid = require('shortid')

module.exports = function (sequelize, DataTypes) { // TODO: inject db
  const Page = sequelize.define('Page', {
    sid: { type: DataTypes.STRING, primaryKey: true },
    id: { type: DataTypes.INTEGER, unique: 'compositeUniqueKey', autoIncrement: true },
    version: { type: DataTypes.FLOAT, unique: 'compositeUniqueKey', defaultValue: 0.1 },
    published: { type: DataTypes.BOOLEAN, defaultValue: false },
    saved: { type: DataTypes.BOOLEAN, defaultValue: false },
    name: { type: DataTypes.JSON, defaultValue: '{"en":""}'},
    description: { type: DataTypes.JSON, defaultValue: '{"en":""}' }
  }, {
    paranoid: true,
    underscored: true,
    tableName: 'page',
    classMethods: {
      associate (models) {
        // Page.models = models
        Page.hasMany(models.Media, {as: 'medias', foreignKey: 'page_sid', target: 'sid'})
      },
      deleteByIdAndVersion (id, version) {
        return Page
          .findOne({
            where: {
              id,
              version: {
                $gte: version
              }
            }
          })
          .then(page => {
            if (!page) {
              const notFound = new Error('Page not found')
              notFound.code = 'NOT_FOUND'
              throw notFound
            }
            return Page
              .destroy({
                where: { id }
              })
              .then(() => page)
          })
      },
      updateByIdAndVersion (id, version, params, lang) {
        lang = lang || 'en'

        return Page
          .findOne({
            where: {
              id,
              version: {
                $gte: version
              }
            }
          })
          .then(page => {
            if (!page) {
              const notFound = new Error('Page not found')
              notFound.code = 'NOT_FOUND'
              throw notFound
            }

            if (params.name) {
              page.setName(params.name, lang)
              delete params.name
            }

            if (params.description) {
              page.setDescription(params.description, lang)
              delete params.description
            }

            Object.keys(params).forEach(key => {
              if (key === 'id') return
              page[key] = params[key]
            })

            return page.save().then(() => page)
          })
      },
      findByIdAndVersion (id, version) {
        const Media = sequelize.models.Media
        const File = sequelize.models.File

        return Page
          .findOne({
            where: {
              id,
              version: {
                $gte: version
              }
            },
            include: [
              {
                model: Media,
                as: 'medias',
                include: [
                  { model: File, as: 'imageFile' },
                  { model: File, as: 'imageFiles' },
                  { model: File, as: 'buttonFile' }
                ],
                order: [
                  [ { model: File, as: 'imageFiles' }, 'order', 'ASC' ]
                ]
              }
            ],
            order: [
              [ { model: Media, as: 'medias' }, 'id', 'ASC' ],
            ]
          })
          .then(page => {
            if (!page) {
              const notFound = new Error('Page not found')
              notFound.code = 'NOT_FOUND'
              throw notFound
            }
            return page
          })
      },
      duplicateAndBumpVersion (page) {
        const newPageSid = shortid.generate()
        const newVersion = f.round(page.version + 0.1)
        const now = (new Date()).toISOString()

        const pq1 = `CREATE TEMPORARY TABLE tmp_page AS (SELECT page.* FROM page WHERE id = ${page.id} AND version >= ${page.version})`
        const pq2 = `UPDATE tmp_page SET sid='${newPageSid}', version=${newVersion}, created_at='${now}', updated_at='${now}' WHERE id = ${page.id}`
        const pq3 = `UPDATE page SET saved=TRUE WHERE sid = '${page.sid}'`
        const pq4 = `INSERT INTO page (SELECT tmp_page.* FROM tmp_page WHERE id = ${page.id})`
        const pq5 = `DROP TABLE tmp_page`
        const pq6 = `SELECT page.* FROM page WHERE id = ${page.id} AND version >= ${newVersion}`

        return sequelize.transaction(t => {
          const pdbTasks = [pq1, pq2, pq3, pq4, pq5, pq6].map(query => {
            return function () {
              return new Promise((yep, nope) => {
                sequelize
                  .query(query, {transaction: t})
                  .spread((results, metadata) => yep(results))
              })
            }
          })

          return pdbTasks
            .reduce((prevTaskPromise, task) => {
              return prevTaskPromise.then(task())
            }, Promise.resolve())
            .then(() => {
              return Promise.all(page.medias.map(media => {
                const mq1 = `CREATE TEMPORARY TABLE tmp_media AS (SELECT media.* FROM media WHERE id = ${media.id})`
                const mq2 = `UPDATE tmp_media SET cloned_from=${media.id},created_at='${now}', updated_at='${now}', page_sid='${newPageSid}' WHERE id = ${media.id}`
                const mq3 = `ALTER TABLE tmp_media DROP id`
                const mq4 = `INSERT INTO media (reference, cloned_from, type, name, content, caption, link, created_at, updated_at, deleted_at, image_file_id, button_file_id, page_sid) SELECT tmp_media.* FROM tmp_media`
                const mq5 = `DROP TABLE tmp_media`
                const mq6 = `SELECT * FROM media WHERE cloned_from = ${media.id}`

                const mdbTasks = [mq1, mq2, mq3, mq4, mq5].map(query => {
                  return function () {
                    return new Promise((yep, nope) => {
                      sequelize
                        .query(query, {transaction: t})
                        .spread((results, metadata) => yep(results))
                    })
                  }
                })

                return mdbTasks
                  .reduce((prevTaskPromise, task) => {
                    return prevTaskPromise.then(task())
                  }, Promise.resolve())
                  .then(() => {
                    return new Promise((yep, nope) => {
                      sequelize
                        .query(mq6, {transaction: t})
                        .spread((rows, metadata) => yep(rows[0]))
                    })
                  })
                  .then(clonedMedia => {
                    // TODO: check clonedMedia !== undefined

                    switch (media.type) {
                      case 'image':
                      case 'button':
                        let file = null
                        if (media.imageFile) file = media.imageFile
                        if (media.buttonFile) file = media.buttonFile

                        if (file) {
                          const fq1 = `CREATE TEMPORARY TABLE tmp_file AS (SELECT file.* FROM file WHERE id = ${file.id})`
                          const fq2 = `UPDATE tmp_file SET cloned_from=${file.id}, created_at='${now}', updated_at='${now}' WHERE id = ${file.id}`
                          const fq3 = `ALTER TABLE tmp_file DROP id`
                          const fq4 = `INSERT INTO file (cloned_from, caption, "order", mimetype, filename, created_at, updated_at, deleted_at, media_id) SELECT tmp_file.* FROM tmp_file`
                          const fq5 = `DROP TABLE tmp_file`
                          const fq6 = `SELECT * FROM file WHERE cloned_from = ${file.id}`

                          const fdbTasks = [fq1, fq2, fq3, fq4, fq5].map(query => {
                            return function () {
                              return new Promise((yep, nope) => {
                                sequelize
                                  .query(query, {transaction: t})
                                  .spread((results, metadata) => yep(results))
                              })
                            }
                          })

                          return fdbTasks
                            .reduce((prevTaskPromise, task) => {
                              return prevTaskPromise.then(task())
                            }, Promise.resolve())
                            .then(() => {
                              return new Promise((yep, nope) => {
                                sequelize
                                  .query(fq6, {transaction: t})
                                  .spread((rows, metadata) => yep(rows[0]))
                              })
                            })
                            .then(clonedFile => {
                              let fq7 = null
                              if (media.type === 'image') {
                                fq7 = `UPDATE media SET image_file_id=${clonedFile.id}, updated_at='${now}' WHERE id = ${clonedMedia.id}`
                              } else {
                                fq7 = `UPDATE media SET button_file_id=${clonedFile.id}, updated_at='${now}' WHERE id = ${clonedMedia.id}`
                              }

                              return new Promise((yep, nope) => {
                                sequelize
                                  .query(fq7, {transaction: t})
                                  .spread((results, metadata) => yep(results))
                              })
                            })
                        }

                        return Promise.resolve()
                      case 'gallery':
                        return Promise.all(media.imageFiles.map(file => {

                          const fgq1 = `CREATE TEMPORARY TABLE tmp_file AS (SELECT file.* FROM file WHERE id = ${file.id})`
                          const fgq2 = `UPDATE tmp_file SET cloned_from=${file.id}, created_at='${now}', updated_at='${now}', media_id=${clonedMedia.id} WHERE id = ${file.id}`
                          const fgq3 = `ALTER TABLE tmp_file DROP id`
                          const fgq4 = `INSERT INTO file (cloned_from, caption, "order", mimetype, filename, created_at, updated_at, deleted_at, media_id) SELECT tmp_file.* FROM tmp_file`
                          const fgq5 = `DROP TABLE tmp_file`

                          const fgdbTasks = [fgq1, fgq2, fgq3, fgq4, fgq5].map(query => {
                            return function () {
                              return new Promise((yep, nope) => {
                                sequelize
                                  .query(query, {transaction: t})
                                  .spread((results, metadata) => yep(results))
                              })
                            }
                          })

                          return fgdbTasks
                            .reduce((prevTaskPromise, task) => {
                              return prevTaskPromise.then(task())
                            }, Promise.resolve())
                        }))
                      default:
                        return Promise.resolve()
                    }
                  })
              }))
            })
            .then(() => newVersion)
        })
      },
      findGreaterVersionById (id) {
        return new Promise((yep, nope) => {
          sequelize
            .query(`SELECT id, MAX(version) FROM page GROUP BY id HAVING id = ${id}`)
            .spread((results, metadata) => {
              try {
                yep(results[0].max)
              } catch (e) {
                yep(0)
              }
            })
        })
      },
      findAllWithGreaterVersion (lang) {
        lang = lang || 'en'

        return new Promise((yep, nope) => {
          const q = 'SELECT p.* \
            FROM page p \
            INNER JOIN \
                (SELECT id, MAX(version) AS greater_version \
                FROM page \
                GROUP BY id) groupedp \
            ON p.id = groupedp.id AND p.version = groupedp.greater_version \
            WHERE p.deleted_at IS NULL'

          sequelize
            .query(q)
            .spread((results, metadata) => {
              yep(results.map(result => {
                if (result.description) result.description = JSON.parse(result.description)[lang]
                if (result.name) result.name = JSON.parse(result.name)[lang]
                return result
              }))
            })
        })
      }
    },
    instanceMethods: {
      setName (text, lang) {
        const name = JSON.parse(this.name || '{}')
        name[lang] = text
        this.name = JSON.stringify(name)
      },
      getName (lang) {
        const name = JSON.parse(this.name || '{}')
        return name[lang]
      },
      setDescription (text, lang) {
        const description = JSON.parse(this.description || '{}')
        description[lang] = text
        this.description = JSON.stringify(description)
      },
      getDescription (lang) {
        const description = JSON.parse(this.description || '{}')
        return description[lang]
      },
      toJSON (lang) {
        const obj = this.get({ plain: true })
        obj.name = this.getName(lang)
        obj.description = this.getDescription(lang)

        if (this.medias) {
          obj.medias = this.medias.map(media => {
            return media.toJSON(lang)
          })
        }

        return obj
      }
    }
  })

  return Page
}
