const express = require('express')
const xss = require('xss')
const FoldersService = require('./folders-service')
const FoldersRouter = express.Router()
const logger = require('../logger')
const bodyParser = express.json()

const serializeFolder = folder => ({
  id: folder.id,
  name: xss(folder.name)
})

FoldersRouter
  .route('/')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');
    FoldersService.getAllFolders(knexInstance)
      .then((folders) => {
        res.json(folders)
      })
      .catch(next)
  })
  .post(bodyParser, (req, res, next) => {
    const { name } = req.body;
    if (!name) {
      logger.error(`'name' is required`)
      return res.status(400).send({
        error: { message: `'name' is required` }
      })
    }

    FoldersService.insertFolder(
      req.app.get('db'),
      { name }
    )
      .then(folder => {
        logger.info(`${folder.name} folder created with id:${folder.id}.`)
        res
          .status(201)
          .location(`/folders/${folder.id}`)
          .json(serializeFolder(folder))
      })
      .catch(next)
  })

FoldersRouter
  .route('/:id')
  .all((req, res, next) => {
    const { id } = req.params
    FoldersService.getById(req.app.get('db'), id)
      .then(folder => {
        if (!folder) {
          logger.error(`Folder with id ${ id } not found.`)
          return res.status(404).json({
            error: { message: `Folder Not Found` }
          })
        }
        res.folder = folder;
        next()
      })
      .catch(next)
  })
  .get((req, res) => {
    res.json(serializeFolder(res.folder))
  })
  .delete((req, res, next) => {
    const { id } = req.params
    FoldersService.deleteFolder(
      req.app.get('db'),
      id
    )
      .then(rowsAffected => {
        logger.info(`Folder with id:${id} deleted.`)
        res.status(204).end()
      })
      .catch(next)
  })

module.exports = FoldersRouter;