'use strict'

module.exports = function (sequelize, DataTypes) {
  const Group = sequelize.define('Group', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    cloned_from: { type: DataTypes.INTEGER, allowNull: true },
    name: { type: DataTypes.JSON, allowNull: true, defaultValue: '{"en":""}'},
    order: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    paranoid: true,
    underscored: true,
    tableName: 'group',
    classMethods: {
      associate (models) {
        Group.hasMany(models.Media, {as: 'medias'})
      },
      findById (id) {
        const Media = sequelize.models.Media
        const File = sequelize.models.File

        return Group
          .findOne({
            where: { id },
            include: [
              {
                model: Media,
                as: 'medias',
                include: [
                  { model: File, as: 'imageFile' },
                  { model: File, as: 'imageFiles' },
                  { model: File, as: 'buttonFile' }
                ],
                order: [
                  [ { model: File, as: 'imageFiles' }, 'order', 'ASC' ]
                ]
              }
            ],
            order: [
              [ { model: Media, as: 'medias' }, 'order', 'ASC' ]
            ]
          })
          .then(group => {
            if (!group) {
              const notFound = new Error('Group not found')
              notFound.code = 'NOT_FOUND'
              throw notFound
            }
            return group
          })
      },
      findByPageSid (page_sid) {
        const Media = sequelize.models.Media
        const File = sequelize.models.File

        return Media
          .findAll({
            where: { page_sid },
            include: [
              {
                model: Media,
                as: 'medias',
                include: [
                  { model: File, as: 'imageFile' },
                  { model: File, as: 'imageFiles' },
                  { model: File, as: 'buttonFile' }
                ],
                order: [
                  [ { model: File, as: 'imageFiles' }, 'order', 'ASC' ]
                ]
              },
              {
                model: Group,
                as: 'groups',
                include: [
                  {
                    model: Media,
                    as: 'medias',
                    include: [
                      { model: File, as: 'imageFile' },
                      { model: File, as: 'imageFiles' },
                      { model: File, as: 'buttonFile' }
                    ],
                    order: [
                      [ { model: File, as: 'imageFiles' }, 'order', 'ASC' ]
                    ]
                  }
                ],
                order: [
                  [ { model: Media, as: 'medias' }, 'order', 'ASC' ]
                ]
              }
            ],
            order: [
              [ { model: Group, as: 'groups' }, 'id', 'ASC' ]
            ]
          })
          .then(media => {
            if (!media) {
              const notFound = new Error('Media not found')
              notFound.code = 'NOT_FOUND'
              throw notFound
            }
            return media
          })
      },
      createAndSetGroup (pageId, params, lang) {
        lang = lang || 'en'

        const Page = sequelize.models.Page

        return Page
          .findGreaterVersionById(pageId)
          .then(version => {
            return Page
              .findOne({
                where: {
                  id: pageId,
                  version: {
                    $gte: version
                  }
                }
              })
              .then(page => {
                if (!page) {
                  const notFound = new Error('Page not found')
                  notFound.code = 'NOT_FOUND'
                  throw notFound
                }
                return Group
                  .create(params)
                  .then((group) => {
                    return page
                      .addGroup(group)
                      .then(() => group)
                  })
              })
          })
      },
      deleteById (id) {
        return Group
          .findOne({
            where: { id }
          })
          .then(group => {
            if (!group) {
              const notFound = new Error('Group not found')
              notFound.code = 'NOT_FOUND'
              throw notFound
            }

            // TODO: SET id_button_media/id_image_media to NULL
            return Group
              .destroy({
                where: { id }
              })
              .then(() => group)
          })
      },
      updateById (id, params, lang) {
        lang = lang || 'en'

        return Group
          .findOne({
            where: { id }
          })
          .then(group => {
            if (!group) {
              const notFound = new Error('Group not found')
              notFound.code = 'NOT_FOUND'
              throw notFound
            }

            if (params.name) {
              group.setName(params.name, lang)
              delete params.name
            }

            Object.keys(params).forEach(key => {
              if (key === 'id') return
              group[key] = params[key]
            })

            return group.save()
          })
      },
      sortByIds (sortedIds, lang) {
        lang = lang || 'en'

        return sequelize.transaction(t => {
          return Promise.all(sortedIds.map((id, i) => {
            if (!id) return Promise.resolve()
            return Group
              .update({order: i++}, {where: {id}}, {transaction: t})
          }))
        })
      }
    },
    instanceMethods: {
      // TODO: Use object instead JSON string
      setName (text, lang) {
        const name = typeof this.name === 'object' ? this.name : JSON.parse(this.name || '{}')
        name[lang] = text
        this.name = JSON.stringify(name)
      },
      getName (lang) {
        const name = typeof this.name === 'object' ? this.name : JSON.parse(this.name || '{}')
        return name[lang]
      },
      toJSON (lang) {
        const obj = this.get({ plain: true })
        obj.name = this.getName(lang)

        if (this.medias) {
          obj.medias = this.medias.map(media => {
            return media.toJSON(lang)
          })
        }

        return obj
      }
    }
  })

  return Group
}
