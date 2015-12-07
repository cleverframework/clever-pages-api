'use strict'

module.exports = function (sequelize, DataTypes) {
  const Language = sequelize.define('Language', {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING },
    note: { type: DataTypes.STRING, allowNull: true }
  }, {
    paranoid: true,
    underscored: true,
    tableName: 'language',
    instanceMethods: {
      toJSON () {
        return this.get({ plain: true })
      }
    }
  })

  return Language
}
