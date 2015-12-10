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

    // button
    link: { type: DataTypes.STRING, allowNull: true }

  }, {
    paranoid: true,
    underscored: true,
    tableName: 'media',
    classMethods: {
      associate (models) {
        Media.belongsTo(models.File, {as: 'imageFile', constraints: false})
        Media.hasMany(models.File, {as: 'imageFiles', foreignKey: 'media_id' })
        Media.belongsTo(models.File, {as: 'buttonFile', constraints: false})
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
      toJSON (lang) {
        const obj = this.get({ plain: true })

        switch (this.type) {
          case 'text':
            obj.name = this.getName(lang)
            obj.content = this.getContent(lang)
            break
          case 'gallery':
            if (!obj.imageFiles) obj.imageFiles = []
          case 'button':
            obj.name = this.getName(lang)
            break
        }

        return obj
      }
    }
  })

  return Media
}
