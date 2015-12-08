'use strict'

// inerithance is not supported in Sequelize.js
// we hack it creating a generic Media class + type attribute

module.exports = function (sequelize, DataTypes) {
  const Media = sequelize.define('Media', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    reference: { type: DataTypes.FLOAT, unique: true, allowNull: false },
    type: { type: DataTypes.ENUM('text', 'image', 'gallery', 'button'), allowNull: false },

    // text
    name: { type: DataTypes.JSON, allowNull: true },
    content: { type: DataTypes.JSON, allowNull: true },

    // button
    url: { type: DataTypes.STRING }

  }, {
    paranoid: true,
    underscored: true,
    tableName: 'media',
    classMethods: {
      associate (models) {
        Media.hasMany(models.File, {foreignKey: 'media_id'})
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

        if (this.type === 'text') {
          obj.name = this.getName(lang)
          obj.content = this.getContent(lang)
        }

        return obj
      }
    }
  })

  return Media
}
