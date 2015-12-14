'use strict'

module.exports = function (sequelize, DataTypes) {
  const File = sequelize.define('File', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
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
