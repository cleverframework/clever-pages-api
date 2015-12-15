'use strict'

const f = require('float')

module.exports = function (sequelize, DataTypes) { // TODO: inject db
  const Page = sequelize.define('Page', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    version: { type: DataTypes.FLOAT, primaryKey: true, defaultValue: 0.1 },
    published: { type: DataTypes.BOOLEAN, defaultValue: false },
    name: { type: DataTypes.JSON, defaultValue: '{"en":""}'},
    description: { type: DataTypes.JSON, defaultValue: '{"en":""}' }
  }, {
    paranoid: true,
    underscored: true,
    tableName: 'page',
    classMethods: {
      associate (models) {
        // Page.models = models
        Page.hasMany(models.Media, {as: 'medias'})
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
        const newVersion = f.round(page.version + 0.1)
        const now = (new Date()).toISOString()

        const q1 = `CREATE TEMPORARY TABLE tmp_page AS (SELECT page.* FROM page WHERE id = ${page.id} AND version >= ${page.version})`
        const q2 = `UPDATE tmp_page SET version=${newVersion}, created_at='${now}', updated_at='${now}' WHERE id = ${page.id}`
        const q3 = `INSERT INTO page (SELECT tmp_page.* FROM tmp_page WHERE id = ${page.id})`
        const q4 = `DROP TABLE tmp_page`
        const q5 = `SELECT page.* FROM page WHERE id = ${page.id} AND version >= ${newVersion}`

        return sequelize.transaction(t => {
          const dbTasks = [q1, q2, q3, q4].map(query => {
            return function () {
              return new Promise((yep, nope) => {
                sequelize
                  .query(query, {transaction: t})
                  .spread((results, metadata) => {
                    yep(results)
                  })
              })
            }
          })

          return dbTasks.reduce((prevTaskPromise, task) => {
            return prevTaskPromise.then(task())
          }, Promise.resolve()).then(() => newVersion)
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
