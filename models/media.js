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
        this.name[lang] = text
      },
      getName (lang) {
        return this.caption[lang]
      },
      setContent (text, lang) {
        this.content[lang] = text
      },
      getContent (lang) {
        return this.content[lang]
      },
      toJSON () {
        return this.get({ plain: true })
      }
    }
  })

  return Media
}
