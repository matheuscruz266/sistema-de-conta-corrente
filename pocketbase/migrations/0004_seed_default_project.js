migrate(
  (app) => {
    var userRecord
    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'tiago@julitago.com.br')
    } catch (_) {
      return
    }
    var userId = userRecord.id

    var projectRecord
    try {
      projectRecord = app.findFirstRecordByData('projects', 'name', 'Projeto Principal')
    } catch (_) {
      var projectsCol = app.findCollectionByNameOrId('projects')
      projectRecord = new Record(projectsCol)
      projectRecord.set('user', userId)
      projectRecord.set('name', 'Projeto Principal')
      projectRecord.set('description', 'Projeto padrão para os lançamentos existentes')
      projectRecord.set('color', '#6366f1')
      app.save(projectRecord)
    }
    var projectId = projectRecord.id

    try {
      app
        .db()
        .newQuery("UPDATE transactions SET project = {:pid} WHERE project = '' OR project IS NULL")
        .bind({ pid: projectId })
        .execute()
    } catch (_) {}

    try {
      app
        .db()
        .newQuery("UPDATE categories SET project = {:pid} WHERE project = '' OR project IS NULL")
        .bind({ pid: projectId })
        .execute()
    } catch (_) {}

    try {
      app
        .db()
        .newQuery("UPDATE extratos SET project = {:pid} WHERE project = '' OR project IS NULL")
        .bind({ pid: projectId })
        .execute()
    } catch (_) {}
  },
  (app) => {
    try {
      app.db().newQuery("UPDATE transactions SET project = '' WHERE project != ''").execute()
    } catch (_) {}
    try {
      app.db().newQuery("UPDATE categories SET project = '' WHERE project != ''").execute()
    } catch (_) {}
    try {
      app.db().newQuery("UPDATE extratos SET project = '' WHERE project != ''").execute()
    } catch (_) {}
    try {
      var p = app.findFirstRecordByData('projects', 'name', 'Projeto Principal')
      app.delete(p)
    } catch (_) {}
  },
)
