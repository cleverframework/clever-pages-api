'use strict'

module.exports = function (sequelize, DataTypes) {
  const Page = sequelize.define('Page', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    version: { type: DataTypes.FLOAT, primaryKey: true, defaultValue: 0.1 },
    published: { type: DataTypes.BOOLEAN, defaultValue: false },
    name: { type: DataTypes.JSON },
    description: { type: DataTypes.JSON, defaultValue: '{"en":""}' }
  }, {
    paranoid: true,
    underscored: true,
    tableName: 'page',
    classMethods: {
      associate (models) {
         Page.hasMany(models.Media, {as: 'medias'})
      }
    },
    instanceMethods: {
      setName (text, lang) {
        this.name[lang] = text
      },
      getName (lang) {
        return this.caption[lang]
      },
      setDescription (text, lang) {
        this.description[lang] = text
      },
      getDescription (lang) {
        return this.description[lang]
      },
      toJSON () {
        return this.get({ plain: true })
      }
    }
  })

  return Page
}
