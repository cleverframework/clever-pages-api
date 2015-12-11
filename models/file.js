'use strict'

module.exports = function (sequelize, DataTypes) {
  const File = sequelize.define('File', {
    id: { type: DataTypes.STRING, primaryKey: true },
    caption: { type: DataTypes.JSON, defaultValue: '{"en":""}'},
    mimetype: { type: DataTypes.STRING, defaultValue: 'application/octet-stream'},
    filename: { type: DataTypes.STRING }
  }, {
    paranoid: true,
    underscored: true,
    tableName: 'file',
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
