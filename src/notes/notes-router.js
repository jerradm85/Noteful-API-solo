const express = require('express')
const xss = require('xss')
const NotesService = require('./notes-service')
const NotesRouter = express.Router()
const logger = require('../logger')
const bodyParser = express.json()

const serializeNote = note => ({
  id: note.id,
  name: xss(note.name),
  modified: note.modified,
  folder_id: note.folder_id,
  content: xss(note.content)
})

NotesRouter
  .route('/')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');
    NotesService.getAllNotes(knexInstance)
      .then((notes) => {
        res.json(notes)
      })
      .catch(next)
  })
  .post(bodyParser, (req, res, next) => {
    const { name, folder_id, content } = req.body;
    if(!name) {
      logger.error(`'name' is required`)
      return res.status(400).send({
        error: { message: `'name' is required`}
      })
    }
    if(!content) {
      logger.error(`'content' is required`)
      return res.status(400).send({
        error: { message: `'content' is required`}
      })
    }
    NotesService.insertNote(
      req.app.get('db'),
      { name, folder_id, content }
    )
      .then(note => {
        logger.info(`${note.name} note created inside folder ${note.folder_id}.`)
        res
          .status(201)
          .location(`/folders/${folder_id}`)
          .json(serializeNote(note))
      })
      .catch(next)
  })

  NotesRouter
    .route('/:id')
    .all((req, res, next) => {
      const { id, folder_id } = req.params
      NotesService.getNoteById(
        req.app.get('db'),
        id
        )
        .then(note => {
          if(!note) {
            logger.error(`Note with id ${ id } not found`)
            return res.status(404).json({
              error: { message: `Note not found`}
            })
          }
          res.note = note;
          next()
        })
        .catch(next)
    })
    .get((req, res) => {
      res.json(serializeNote(res.note))
    })
    .delete((req, res, next) => {
      const { id, folder_id } = req.params
      NotesService.deleteNote(
        req.app.get('db'),
        id
      )
      .then(rowsAffected => {
        logger.info(`Note with id:${id} deleted.`)
        res.status(204).end()
      })
      .catch(next)
    })

module.exports = NotesRouter;

