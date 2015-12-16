'use strict'

module.exports = function (sequelize, DataTypes) {
  const File = sequelize.define('File', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    cloned_from: { type: DataTypes.INTEGER, allowNull: true },
    caption: { type: DataTypes.JSON, defaultValue: '{"en":""}'},
    order: { type: DataTypes.INTEGER, allowNull: true },
    mimetype: { type: DataTypes.STRING, defaultValue: 'application/octet-stream'},
    filename: { type: DataTypes.STRING }
  }, {
    paranoid: true,
    underscored: true,
    tableName: 'file',
    classMethods: {
      associate (models) {
        // File.belongsTo(models.Media, {as: 'Media'})
      },
      deleteById (id) {
        return File
          .findOne({
            where: { id }
          })
          .then(file => {
            if (!file) {
              const notFound = new Error('File not found')
              notFound.code = 'NOT_FOUND'
              throw notFound
            }

            // TODO: SET id_button_media/id_image_media to NULL
            return File
              .destroy({
                where: { id }
              })
              .then(() => file)
          })
      },
      updateById (id, params, lang) {
        lang = lang || 'en'

        return File
          .findOne({
            where: { id }
          })
          .then(file => {
            if (!file) {
              const notFound = new Error('File not found')
              notFound.code = 'NOT_FOUND'
              throw notFound
            }

            if (params.caption) {
              file.setCaption(params.caption, lang)
              delete params.caption
            }

            Object.keys(params).forEach(key => {
              if (key === 'id') return
              file[key] = params[key]
            })

            return file.save()
          })
      },
      sortByIds (sortedIds, lang) {
        lang = lang || 'en'

        return sequelize.transaction(t => {
          return Promise.all(sortedIds.map((id, i) => {
            if (!id) return Promise.resolve()
            return File
              .update({order: i++}, {where: {id}}, {transaction: t})
          }))
        })
      }
    },
    instanceMethods: {
      // TODO: Use object instead JSON string
      setCaption (text, lang) {
        const caption = typeof this.caption === 'object' ? this.caption : JSON.parse(this.caption || '{}')
        caption[lang] = text
        this.caption = JSON.stringify(caption)
      },
      getCaption (lang) {
        const caption = typeof this.caption === 'object' ? this.caption : JSON.parse(this.caption || '{}')
        return caption[lang]
      },
      toJSON (lang) {
        const obj = this.get({ plain: true })
        obj.caption = this.getCaption(lang)
        return obj
      }
    }
  })

  return File
}
