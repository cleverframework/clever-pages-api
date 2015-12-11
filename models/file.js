'use strict'

module.exports = function (sequelize, DataTypes) {
  const File = sequelize.define('File', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    caption: { type: DataTypes.JSON, defaultValue: '{"en":""}'},
    mimetype: { type: DataTypes.STRING, defaultValue: 'application/octet-stream'},
    filename: { type: DataTypes.STRING }
  }, {
    paranoid: true,
    underscored: true,
    tableName: 'file',
    classMethods: {
      associate (models) {
        File.belongsTo(models.Media, {as: 'Media'})
      }
    },
    instanceMethods: {

      setCaption (text, lang) {
        this.caption[lang] = text
      },
      getCaption (lang) {
        return this.caption[lang]
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
