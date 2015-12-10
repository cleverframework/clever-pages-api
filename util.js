'use strict'

exports.getFileExt = function getFileExt (mimetype) {
  switch (mimetype) {
    case 'image/gif':
      return '.gif'
    case 'image/png':
      return '.png'
    case 'image/jpeg':
      return '.jpeg'
    case 'image/jpg':
      return '.jpg'
    case 'application/pdf':
      return '.pdf'
    case 'application/zip':
      return '.zip'
    case 'application/x-rar-compressed':
      return '.rar'
    default:
      return ''
  }
}
