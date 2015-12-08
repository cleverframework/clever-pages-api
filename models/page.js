'use strict'

module.exports = function (sequelize, DataTypes) {
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
         Page.hasMany(models.Media, {as: 'medias'})
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
