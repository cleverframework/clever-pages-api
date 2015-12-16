'use strict'

// inerithance is not supported in Sequelize.js
// we hack it creating a generic Media class + type attribute

module.exports = function (sequelize, DataTypes) {
  const Media = sequelize.define('Media', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    reference: { type: DataTypes.STRING, defaultValue: '' },
    type: { type: DataTypes.ENUM('text', 'image', 'gallery', 'button') },

    // text
    name: { type: DataTypes.JSON, defaultValue: '{"en":""}' },
    content: { type: DataTypes.JSON, defaultValue: '{"en":""}' },

    // image
    caption: { type: DataTypes.JSON, defaultValue: '{"en":""}' },

    // button
    link: { type: DataTypes.STRING, allowNull: true }

  }, {
    paranoid: true,
    underscored: true,
    tableName: 'media',
    classMethods: {
      associate (models) {
        Media.belongsTo(models.File, {as: 'imageFile', constraints: false})
        Media.hasMany(models.File, {
          as: 'imageFiles',
          foreignKey: 'media_id'
        })
        Media.belongsTo(models.File, {as: 'buttonFile', constraints: false})
      },
      createAndAddFile (mediaId, uploadedFile) {
        const File = sequelize.models.File

        return Media
          .findOne({
            where: { id: mediaId }
          })
          .then(media => {
            if (!media) {
              const notFound = new Error('Media not found')
              notFound.code = 'NOT_FOUND'
              throw notFound
            }

            return sequelize.transaction(t => {
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
                    sequelize
                      .query(q, {transaction: t})
                      .spread((results, metadata) => {
                        // TODO: What if nope?
                        yep()
                      })
                  })
                })
            })
          })
      },
      findById (id) {
        const File = sequelize.models.File

        return Media
          .findOne({
            where: { id },
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
            return media
          })
      },
      createAndSetPage (pageId, params, lang) {
        lang = lang || 'en'

        const Page = sequelize.models.Page

        return Page
          .findGreaterVersionById(pageId)
          .then(version => {
            return Page
              .findOne({
                where: {
                  id: pageId,
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
                return Media
                  .create(params)
                  .then((media) => {
                    return page
                      .addMedia(media)
                      .then(() => media)
                  })
              })
          })
      },
      deleteById (id) {
        return Media
          .findOne({
            where: { id }
          })
          .then(media => {
            if (!media) {
              const notFound = new Error('Media not found')
              notFound.code = 'NOT_FOUND'
              throw notFound
            }

            return Media
              .destroy({
                where: { id }
              })
              .then(() => media)
          })
      },
      updateById (id, params, lang) {
        lang = lang || 'en'

        const File = sequelize.models.File

        return Media
          .findOne({
            where: { id },
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
      setContent (text, lang) {
        const content = JSON.parse(this.content || '{}')
        content[lang] = text
        this.content = JSON.stringify(content)
      },
      getContent (lang) {
        const content = JSON.parse(this.content || '{}')
        return content[lang]
      },
      setCaption (text, lang) {
        const caption = JSON.parse(this.caption || '{}')
        caption[lang] = text
        this.caption = JSON.stringify(caption)
      },
      getCaption (lang) {
        const caption = JSON.parse(this.caption || '{}')
        return caption[lang]
      },
      toJSON (lang) {
        const obj = this.get({ plain: true })

        switch (this.type) {
          case 'text':
            obj.name = this.getName(lang)
            obj.content = this.getContent(lang)
            break
          case 'image':
            obj.caption = this.getCaption(lang)
            if (this.imageFile) obj.imageFile = this.imageFile.toJSON(lang)
            break
          case 'gallery':
            obj.name = this.getName(lang)
            if (!obj.imageFiles) obj.imageFiles = []
            if (this.imageFiles) {
              obj.imageFiles = this.imageFiles.map(imageFile => {
                return imageFile.toJSON(lang)
              })
            }
            break
          case 'button':
            obj.name = this.getName(lang)
            if (this.buttonFile) obj.buttonFile = this.buttonFile.toJSON(lang)
            break
        }

        return obj
      }
    }
  })

  return Media
}
